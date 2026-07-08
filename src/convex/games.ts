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

    const update: Record<string, unknown> = {
      players: dbPlayers,
      currentPlayerIndex: finalState.currentPlayerIndex,
      turnPhase: finalState.turnPhase,
      lastRoll: roll,
      moveLog: finalState.moveLog,
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
