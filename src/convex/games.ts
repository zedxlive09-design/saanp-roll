import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rollDice, applyRoll, advanceTurn } from "../lib/game-engine/engine";
import { BOARD_CONFIGS } from "../lib/game-engine/boards";
import { internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAYER_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#d97706"];

/** Validated entry-fee tiers (coins). 0 = Free tier. */
const ENTRY_FEE_TIERS = [0, 50, 200, 500] as const;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** True if a player id is a real Convex user id (not an anonymous or bot
 *  placeholder). Used to gate coin payouts — bots (`bot-...`) and anonymous
 *  players (`anon-...`) can't hold coins, so we never try to call awardCoins
 *  on them.
 */
function isRealUserId(id: string | undefined | null): id is Id<"users"> {
  return (
    !!id &&
    !id.startsWith("anon-") &&
    !id.startsWith("bot-")
  );
}

/** Validate that `fee` is one of the allowed tiers (defaulting to 0). */
function normalizeEntryFee(fee: unknown): number {
  return typeof fee === "number" && (ENTRY_FEE_TIERS as readonly number[]).includes(fee)
    ? fee
    : 0;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Get a game by its room code (reactive subscription). */
export const getGame = query({
  args: { roomCode: v.string() },
  handler: async (ctx, { roomCode }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    return game ?? null;
  },
});

/** Get a game by its ID. */
export const getGameById = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db.get(gameId);
  },
});

/** List available games that are waiting for players. */
export const getAvailableGames = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(20);
  },
});

/** Get the current user's finished games for match history. */
export const getUserGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const games = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "finished"))
      .order("desc")
      .take(50);

    return games.filter((g) => g.players.some((p) => p.userId === userId));
  },
});

/** Get aggregated leaderboard stats from all finished games. */
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "finished"))
      .order("desc")
      .take(100);

    // Aggregate stats per player userId
    const statsMap = new Map<
      string,
      { name: string; wins: number; games: number; color: string }
    >();

    for (const game of games) {
      for (const player of game.players) {
        if (!player.userId) continue;
        const existing = statsMap.get(player.userId) ?? {
          name: player.name,
          wins: 0,
          games: 0,
          color: player.color,
        };
        existing.games++;
        if (game.winnerId === player.userId) existing.wins++;
        statsMap.set(player.userId, existing);
      }
    }

    return [...statsMap.entries()]
      .map(([userId, s]) => ({
        userId,
        name: s.name,
        wins: s.wins,
        games: s.games,
        color: s.color,
        winRate:
          s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
      }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
      .slice(0, 50);
  },
});

/** Get active games for the current user (waiting or playing, not finished). */
export const getUserActiveGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const waitingGames = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(20);

    const playingGames = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "playing"))
      .order("desc")
      .take(20);

    const activeGames = [...waitingGames, ...playingGames];
    // Exclude games the user has intentionally LEFT (leftGame === true) —
    // those are counted as defeats and can't be resumed. Transient
    // disconnections (isConnected === false, leftGame undefined) are still
    // offered for reconnection.
    return activeGames.filter((g) => {
      const me = g.players.find((p) => p.userId === userId);
      return !!me && me.leftGame !== true;
    });
  },
});

/** Get stats (total games, wins, losses) for the current user. */
export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { totalGames: 0, wins: 0, losses: 0 };
    }

    const games = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "finished"))
      .order("desc")
      .take(100);

    const userGames = games.filter((g) =>
      g.players.some((p) => p.userId === userId),
    );
    const wins = userGames.filter((g) => g.winnerId === userId).length;

    return {
      totalGames: userGames.length,
      wins,
      losses: userGames.length - wins,
    };
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new game room. Returns the room code. */
export const createGame = mutation({
  args: {
    boardId: v.string(),
    playerCount: v.number(),
    entryFee: v.optional(v.number()),
  },
  handler: async (ctx, { boardId, playerCount, entryFee }) => {
    const userId = await getAuthUserId(ctx);
    const playerId = userId ?? `anon-${crypto.randomUUID()}`;
    const fee = normalizeEntryFee(entryFee);

    // Paid games require authentication (anonymous users can't hold coins).
    if (fee > 0 && !userId) {
      throw new Error("Sign in to create a paid room");
    }

    // Generate a unique room code
    let roomCode = generateRoomCode();
    let existing = await ctx.db
      .query("games")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    while (existing) {
      roomCode = generateRoomCode();
      existing = await ctx.db
        .query("games")
        .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
        .first();
    }

    // Get user name
    let hostName = "Player 1";
    if (userId) {
      const user = await ctx.db.get(userId);
      const userDoc = user as { name?: string } | null;
      if (userDoc?.name) hostName = userDoc.name;
    }

    const players = Array.from({ length: playerCount }, (_, i) => ({
      userId: i === 0 ? playerId : "",
      name: `Player ${i + 1}`,
      color: PLAYER_COLORS[i],
      isConnected: i === 0,
      position: 0,
      consecutiveSixes: 0,
    }));
    if (userId && players.length > 0) {
      players[0].name = hostName;
    }

    // Deduct entry fee from the host upfront (added to the pot).
    let pot = 0;
    if (fee > 0 && userId) {
      await ctx.runMutation(internal.coins.spendCoins, {
        userId,
        amount: fee,
      });
      pot = fee;
    }

    const gameId = await ctx.db.insert("games", {
      roomCode,
      hostUserId: playerId,
      boardId,
      status: "waiting",
      players,
      currentPlayerIndex: 0,
      turnPhase: "rolling",
      winnerId: undefined,
      lastRoll: undefined,
      moveLog: [],
      turnStartedAt: Date.now(),
      createdAt: Date.now(),
      entryFee: fee,
      pot,
    });

    return { gameId, roomCode };
  },
});

/** Join an existing game room by code. */
export const joinGame = mutation({
  args: {
    roomCode: v.string(),
    playerName: v.optional(v.string()),
  },
  handler: async (ctx, { roomCode, playerName }) => {
    const userId = await getAuthUserId(ctx);
    const playerId = userId ?? `anon-${crypto.randomUUID()}`;

    const game = await ctx.db
      .query("games")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();

    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting") throw new Error("Game has already started");
    if (game.players.length >= 4) throw new Error("Room is full");

    // Get user name if signed in
    let name = playerName || `Player ${game.players.length + 1}`;
    if (userId) {
      const user = await ctx.db.get(userId);
      const userDoc = user as { name?: string } | null;
      if (userDoc?.name) name = userDoc.name;
    }

    // Check if player is already in the game (reconnecting)
    const existingIdx = game.players.findIndex(
      (p) => p.userId === playerId,
    );
    if (existingIdx >= 0) {
      const updatedPlayers = game.players.map((p, i) =>
        i === existingIdx ? { ...p, isConnected: true } : p,
      );
      await ctx.db.patch(game._id, { players: updatedPlayers });
      return { gameId: game._id, roomCode };
    }

    // Find the first empty slot
    const emptySlotIdx = game.players.findIndex((p) => !p.userId);
    if (emptySlotIdx < 0) throw new Error("Room is full");

    // Paid games require authentication (anonymous users can't hold coins).
    const fee = typeof game.entryFee === "number" ? game.entryFee : 0;
    if (fee > 0 && !userId) {
      throw new Error("Sign in to join a paid room");
    }

    const updatedPlayers = game.players.map((p, i) =>
      i === emptySlotIdx
        ? { ...p, userId: playerId, name, isConnected: true }
        : p,
    );

    // Deduct entry fee from the joiner and add it to the pot.
    let nextPot = typeof game.pot === "number" ? game.pot : 0;
    if (fee > 0 && userId) {
      await ctx.runMutation(internal.coins.spendCoins, {
        userId,
        amount: fee,
      });
      nextPot = nextPot + fee;
      await ctx.db.patch(game._id, {
        players: updatedPlayers,
        pot: nextPot,
      });
    } else {
      await ctx.db.patch(game._id, { players: updatedPlayers });
    }

    return { gameId: game._id, roomCode };
  },
});

/** Host starts the game. */
export const startGame = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting") throw new Error("Game already started");

    // Count joined players (must have at least 2)
    const joinedPlayers = game.players.filter((p) => p.userId);
    if (joinedPlayers.length < 2) {
      throw new Error("Need at least 2 players to start");
    }

    await ctx.db.patch(gameId, {
      status: "playing",
      turnStartedAt: Date.now(),
      moveLog: [`Game started with ${joinedPlayers.length} players!`],
    });
  },
});

/**
 * Internal helper: perform a server-authoritative dice roll for the current
 * player of the given game. Used by BOTH `rollDiceOnline` (human roll, after
 * the auth check) and `autoAdvanceBotGames` (bot roll, no auth) — bots use the
 * exact same engine path as humans. Patches the game document in-place and
 * returns the roll result.
 *
 * Caller is responsible for ensuring it's actually the current player's turn
 * (auth check for humans; isBot check for bots).
 */
export async function performGameRoll(
  ctx: MutationCtx,
  game: Doc<"games">,
): Promise<{
  roll: number;
  status: string;
  winnerId: string | null;
  turnPhase: string;
  currentPlayerIndex: number;
  moveLog: string[];
}> {
  // Generate roll
  const roll = rollDice();

  // Build a GameState-like object for the engine
  const engineState = {
    boardId: game.boardId as "classic" | "venom",
    players: game.players.map((p) => ({
      id: p.userId,
      name: p.name,
      color: p.color,
      position: p.position,
      consecutiveSixes: p.consecutiveSixes,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    status: "awaiting_roll" as const,
    winnerId: null,
    lastRoll: null,
    turnPhase: game.turnPhase as "rolling" | "extra_roll" | "next_player",
    moveLog: game.moveLog,
  };

  // Apply roll
  const afterRoll = applyRoll(engineState, roll);

  // Determine next state
  let finalState;
  if (afterRoll.status === "game_over") {
    finalState = afterRoll;
  } else if (afterRoll.turnPhase === "extra_roll") {
    finalState = afterRoll;
  } else {
    finalState = advanceTurn(afterRoll);
  }

  // Serialize back to DB format. Preserve per-player flags (isBot, leftGame)
  // that the engine doesn't track but the DB needs — otherwise a bot would
  // lose its `isBot: true` marker after a roll (breaking the auto-roll cron).
  const dbPlayers = finalState.players.map((p) => {
    const dbPlayer = game.players.find((gp) => gp.userId === p.id);
    return {
      userId: p.id,
      name: p.name,
      color: p.color,
      isConnected: dbPlayer?.isConnected ?? true,
      position: p.position,
      consecutiveSixes: p.consecutiveSixes,
      leftGame: dbPlayer?.leftGame,
      isBot: dbPlayer?.isBot,
    };
  });

  const isNewPhase =
    finalState.turnPhase === "next_player" ||
    finalState.status === "game_over" ||
    finalState.turnPhase === "extra_roll";

  const update: Record<string, unknown> = {
    players: dbPlayers,
    currentPlayerIndex: finalState.currentPlayerIndex,
    turnPhase: finalState.turnPhase,
    lastRoll: roll,
    moveLog: finalState.moveLog,
    turnStartedAt: isNewPhase ? Date.now() : game.turnStartedAt,
  };

  if (finalState.status === "game_over") {
    update.status = "finished";
    update.winnerId = finalState.winnerId;

    // Pay out the pot to the winner (if there is one and they're a real
    // authenticated user). Anonymous winners can't hold coins, but they
    // also can't be in paid rooms, so pot is 0 in that case anyway.
    const pot = typeof game.pot === "number" ? game.pot : 0;
    const winnerId = finalState.winnerId;
    if (pot > 0 && isRealUserId(winnerId)) {
      try {
        await ctx.runMutation(internal.coins.awardCoins, {
          userId: winnerId as Id<"users">,
          amount: pot,
        });
      } catch {
        // Best-effort payout — never block the game-over transition.
      }
    }
  }

  await ctx.db.patch(game._id, update);

  // If the turn advanced to a bot, schedule a ONE-TIME bot roll after 1.5s.
  // This replaces the 1-second polling cron that burned the free quota.
  if (finalState.status !== "game_over") {
    const nextPlayer = finalState.players[finalState.currentPlayerIndex];
    if (nextPlayer?.isBot) {
      ctx.scheduler.runAfter(1500, internal.bots.rollForBot, {
        gameId: game._id,
      });
    }
  }

  return {
    roll,
    status: finalState.status,
    winnerId: finalState.winnerId,
    turnPhase: finalState.turnPhase,
    currentPlayerIndex: finalState.currentPlayerIndex,
    moveLog: finalState.moveLog,
  };
}

/** Server-authoritative dice roll. Generates the roll, applies game logic, returns result. */
export const rollDiceOnline = mutation({
  args: {
    gameId: v.id("games"),
    anonId: v.optional(v.string()),
  },
  handler: async (ctx, { gameId, anonId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game is not in progress");

    const userId = await getAuthUserId(ctx);
    const playerId = userId ?? (anonId ? `anon-${anonId}` : null);
    if (!playerId) throw new Error("Not authenticated");

    // Validate it's this player's turn
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.userId !== playerId) {
      throw new Error("It's not your turn");
    }

    return await performGameRoll(ctx, game);
  },
});

/**
 * Player leaves the game.
 *
 * - WAITING game (pre-start): the player is removed from their slot (no
 *   penalty). If they paid an entry fee, it's refunded. No defeat counted.
 * - PLAYING game (in-progress): counts as a DEFEAT for the leaving player.
 *   The leaving player is marked `leftGame: true` + `isConnected: false`.
 *   If only one player remains, they win by default and the pot is paid out.
 *   If the current player left, the turn advances to the next remaining
 *   player.
 * - FINISHED game: no-op (the game already ended).
 *
 * Returns a small summary so the client can toast the right message.
 */
export const leaveGame = mutation({
  args: {
    gameId: v.id("games"),
    anonId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { gameId, anonId },
  ): Promise<{
    status: string;
    outcome: "removed" | "defeat" | "won_by_default" | "no_op";
    potAwarded?: number;
  }> => {
    const userId = await getAuthUserId(ctx);
    const playerId = userId ?? (anonId ? `anon-${anonId}` : null);
    if (!playerId) {
      return { status: "finished", outcome: "no_op" };
    }

    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    // Already finished — nothing to do.
    if (game.status === "finished") {
      return { status: game.status, outcome: "no_op" };
    }

    const leavingIdx = game.players.findIndex((p) => p.userId === playerId);
    if (leavingIdx < 0) {
      // Not in the game — nothing to do.
      return { status: game.status, outcome: "no_op" };
    }
    const leavingPlayer = game.players[leavingIdx];
    const fee = typeof game.entryFee === "number" ? game.entryFee : 0;
    const currentPot = typeof game.pot === "number" ? game.pot : 0;

    // -------------------------------------------------------------------
    // WAITING game — remove the player from their slot, refund entry fee.
    // -------------------------------------------------------------------
    if (game.status === "waiting") {
      // Clear the slot back to its "empty" template.
      const clearedPlayers = game.players.map((p, i) =>
        i === leavingIdx
          ? {
              ...p,
              userId: "",
              name: `Player ${i + 1}`,
              isConnected: false,
              position: 0,
              consecutiveSixes: 0,
              leftGame: undefined,
              isBot: undefined,
            }
          : p,
      );

      // Refund entry fee to the leaving player (if they paid).
      let nextPot = currentPot;
      if (fee > 0 && isRealUserId(playerId)) {
        try {
          await ctx.runMutation(internal.coins.awardCoins, {
            userId: playerId as Id<"users">,
            amount: fee,
          });
          nextPot = Math.max(0, currentPot - fee);
        } catch {
          // Best-effort refund — don't block leaving.
        }
      }

      // Reassign host if the host left and other players are still present.
      let nextHost = game.hostUserId;
      if (game.hostUserId === playerId) {
        const otherJoined = clearedPlayers.find(
          (p) => p.userId && p.userId !== playerId,
        );
        if (otherJoined) {
          nextHost = otherJoined.userId;
        }
      }

      await ctx.db.patch(game._id, {
        players: clearedPlayers,
        hostUserId: nextHost,
        pot: nextPot,
      });

      return { status: game.status, outcome: "removed" };
    }

    // -------------------------------------------------------------------
    // PLAYING game — count as defeat; possibly award win by default.
    // -------------------------------------------------------------------
    const updatedPlayers = game.players.map((p, i) =>
      i === leavingIdx
        ? { ...p, isConnected: false, leftGame: true }
        : p,
    );

    // Remaining players still in the match (haven't left).
    const remainingIndices = updatedPlayers
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !p.leftGame);

    const moveLogAddition: string[] = [
      `${leavingPlayer.name} left the match — counted as defeat`,
    ];

    const update: Record<string, unknown> = {
      players: updatedPlayers,
    };

    // Only one player left — they win by default.
    if (remainingIndices.length === 1) {
      const winner = remainingIndices[0].p;
      update.status = "finished";
      update.winnerId = winner.userId;
      update.turnPhase = "rolling";
      moveLogAddition.push(`${winner.name} wins by default!`);

      // Pay the pot to the remaining player.
      let potAwarded = 0;
      if (currentPot > 0 && isRealUserId(winner.userId)) {
        try {
          await ctx.runMutation(internal.coins.awardCoins, {
            userId: winner.userId as Id<"users">,
            amount: currentPot,
          });
          potAwarded = currentPot;
        } catch {
          // Best-effort payout — don't block the finish.
        }
      }

      update.moveLog = [...game.moveLog, ...moveLogAddition];
      await ctx.db.patch(game._id, update);

      return {
        status: "finished",
        outcome: "won_by_default",
        potAwarded,
      };
    }

    // More than one player remains — game continues. If the current player
    // left, advance the turn to the next remaining player.
    if (game.currentPlayerIndex === leavingIdx) {
      // Find next remaining index after leavingIdx (wrap around).
      const total = updatedPlayers.length;
      let nextIdx = -1;
      for (let off = 1; off <= total; off++) {
        const cand = (leavingIdx + off) % total;
        if (!updatedPlayers[cand].leftGame) {
          nextIdx = cand;
          break;
        }
      }
      if (nextIdx >= 0) {
        update.currentPlayerIndex = nextIdx;
        update.turnPhase = "rolling";
        update.turnStartedAt = Date.now();
        // Reset consecutive sixes for the next player.
        update.players = (update.players as typeof updatedPlayers).map(
          (p, i) =>
            i === nextIdx ? { ...p, consecutiveSixes: 0 } : p,
        );
      }
    }

    update.moveLog = [...game.moveLog, ...moveLogAddition];
    await ctx.db.patch(game._id, update);

    return { status: game.status, outcome: "defeat" };
  },
});

/**
 * Skip the current player's turn (auto-advance).
 * Used when the turn timer expires (30s timeout).
 * Only skips if it's still the same player's turn.
 */
export const skipTurn = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game is not in progress");

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer) throw new Error("No current player");

    const nextIndex =
      (game.currentPlayerIndex + 1) % game.players.length;

    // Reset consecutive sixes for the next player
    const updatedPlayers = game.players.map((p, i) =>
      i === nextIndex ? { ...p, consecutiveSixes: 0 } : p,
    );

    const reason = currentPlayer.isConnected
      ? "turn timed out"
      : "player disconnected";

    await ctx.db.patch(gameId, {
      players: updatedPlayers,
      currentPlayerIndex: nextIndex,
      turnPhase: "rolling",
      turnStartedAt: Date.now(),
      moveLog: [
        ...game.moveLog,
        `⏱️ ${currentPlayer.name}'s ${reason} — skipping to ${game.players[nextIndex].name}`,
      ],
    });
  },
});
