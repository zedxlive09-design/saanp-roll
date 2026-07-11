import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rollDice, applyRoll, advanceTurn } from "../lib/game-engine/engine";
import { BOARD_CONFIGS } from "../lib/game-engine/boards";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAYER_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#d97706"];

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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
  },
  handler: async (ctx, { boardId, playerCount }) => {
    const userId = await getAuthUserId(ctx);
    const playerId = userId ?? `anon-${crypto.randomUUID()}`;

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

    const updatedPlayers = game.players.map((p, i) =>
      i === emptySlotIdx
        ? { ...p, userId: playerId, name, isConnected: true }
        : p,
    );

    await ctx.db.patch(game._id, { players: updatedPlayers });
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

/** Server-authoritative dice roll. Generates the roll, applies game logic, returns result. */
export const rollDiceOnline = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game is not in progress");

    const userId = await getAuthUserId(ctx);
    const playerId = userId ?? `anon-${crypto.randomUUID()}`;

    // Validate it's this player's turn
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.userId !== playerId) {
      throw new Error("It's not your turn");
    }

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

    // Serialize back to DB format
    const dbPlayers = finalState.players.map((p) => {
      const dbPlayer = game.players.find((gp) => gp.userId === p.id);
      return {
        userId: p.id,
        name: p.name,
        color: p.color,
        isConnected: dbPlayer?.isConnected ?? true,
        position: p.position,
        consecutiveSixes: p.consecutiveSixes,
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
    }

    await ctx.db.patch(gameId, update);

    return {
      roll,
      status: finalState.status,
      winnerId: finalState.winnerId,
      turnPhase: finalState.turnPhase,
      currentPlayerIndex: finalState.currentPlayerIndex,
      moveLog: finalState.moveLog,
    };
  },
});

/** Player leaves the game (marks as disconnected). */
export const leaveGame = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    const playerId = userId ?? `anon-${crypto.randomUUID()}`;

    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    const updatedPlayers = game.players.map((p) =>
      p.userId === playerId ? { ...p, isConnected: false } : p,
    );

    await ctx.db.patch(gameId, { players: updatedPlayers });
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
