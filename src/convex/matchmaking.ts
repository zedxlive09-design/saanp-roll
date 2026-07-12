import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

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

/** Fetch the current user's display name (defaults to "Player"). */
async function getUserName(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<string> {
  const user = await ctx.db.get(userId);
  const userDoc = user as { name?: string } | null;
  return userDoc?.name || "Player";
}

/** Public shape returned to clients — strips internal fields. */
type QueueEntryPublic = {
  _id: string;
  userId: string;
  name: string;
  boardId: string;
  status: string;
  gameId: string | null;
  roomCode: string | null;
  opponentName: string | null;
  createdAt: number;
};

function toPublic(entry: {
  _id: string;
  userId: string;
  name: string;
  boardId: string;
  status: string;
  gameId?: string | null;
  roomCode?: string | null;
  opponentName?: string | null;
  createdAt: number;
}): QueueEntryPublic {
  return {
    _id: entry._id,
    userId: entry.userId,
    name: entry.name,
    boardId: entry.boardId,
    status: entry.status,
    gameId: entry.gameId ?? null,
    roomCode: entry.roomCode ?? null,
    opponentName: entry.opponentName ?? null,
    createdAt: entry.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get the current user's active matchmaking queue entry (status "searching"
 * or "matched"). Returns null if not authenticated or no active entry.
 * Stale "matched" entries (game finished / missing) are filtered out so the
 * UI can offer a fresh search instead of navigating to a dead game.
 */
export const getMyQueueEntry = query({
  args: { anonId: v.optional(v.string()) },
  handler: async (ctx, { anonId }): Promise<QueueEntryPublic | null> => {
    const authId = await getAuthUserId(ctx);
    const userId = authId ?? (anonId ? `anon-${anonId}` : null);
    if (!userId) return null;

    // Active search entry — always relevant.
    const searching = await ctx.db
      .query("matchmaking")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "searching"))
      .first();
    if (searching) return toPublic(searching);

    // Matched entry — only relevant if the game is still in progress.
    const matched = await ctx.db
      .query("matchmaking")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "matched"))
      .first();
    if (matched) {
      if (matched.gameId) {
        const game = await ctx.db.get(matched.gameId);
        if (game && game.status === "playing") {
          return toPublic(matched);
        }
      }
      // Stale — let the client see null so it can re-queue.
      return null;
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Join the Quick Match queue for the given board. If another user is already
 * searching with the same boardId, match them immediately: create a game,
 * mark both queue entries as "matched", and auto-start the game (status
 * "playing"). Returns the caller's queue entry (searching OR matched).
 *
 * Requires authentication — anonymous users cannot use Quick Match.
 */
export const joinQueue = mutation({
  args: {
    boardId: v.string(),
    anonId: v.optional(v.string()),
    playerName: v.optional(v.string()),
  },
  handler: async (ctx, { boardId, anonId, playerName }): Promise<QueueEntryPublic> => {
    // Allow both authenticated AND anonymous users.
    // Authenticated users use their real userId; anon users pass a stable
    // client-generated ID (stored in localStorage) so they can reconnect.
    const authId = await getAuthUserId(ctx);
    const userId = authId ?? (anonId ? `anon-${anonId}` : null);
    if (!userId) {
      throw new Error("Unable to identify user. Please refresh the page.");
    }

    // Get name: authenticated user's stored name, or the passed playerName, or "Guest"
    let name = "Guest";
    if (authId) {
      const storedName = await getUserName(ctx, authId);
      if (storedName) name = storedName;
    } else if (playerName) {
      name = playerName;
    }

    // Already actively searching? Return the existing entry.
    const existingSearch = await ctx.db
      .query("matchmaking")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "searching"))
      .first();
    if (existingSearch) return toPublic(existingSearch);

    // Already matched? Re-validate the game is still live. If yes, return it
    // (lets the user rejoin); if no, clean up and proceed to re-queue.
    const existingMatched = await ctx.db
      .query("matchmaking")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "matched"))
      .first();
    if (existingMatched) {
      if (existingMatched.gameId) {
        const game = await ctx.db.get(existingMatched.gameId);
        if (game && game.status === "playing") {
          return toPublic(existingMatched);
        }
      }
      await ctx.db.delete(existingMatched._id);
    }

    // Look for an opponent searching with the same boardId (not ourselves).
    // Take the oldest waiting entry for fairness.
    const opponent = await ctx.db
      .query("matchmaking")
      .withIndex("by_status", (q) => q.eq("status", "searching"))
      .filter((q) => q.eq(q.field("boardId"), boardId))
      .filter((q) => q.neq(q.field("userId"), userId))
      .first();

    if (opponent) {
      // Match found — create a 2-player game and start it immediately.
      let roomCode = generateRoomCode();
      let collision = await ctx.db
        .query("games")
        .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
        .first();
      while (collision) {
        roomCode = generateRoomCode();
        collision = await ctx.db
          .query("games")
          .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
          .first();
      }

      const players = [
        {
          userId: opponent.userId,
          name: opponent.name,
          color: PLAYER_COLORS[0],
          isConnected: true,
          position: 0,
          consecutiveSixes: 0,
        },
        {
          userId,
          name,
          color: PLAYER_COLORS[1],
          isConnected: true,
          position: 0,
          consecutiveSixes: 0,
        },
      ];

      const gameId = await ctx.db.insert("games", {
        roomCode,
        // The opponent was waiting first — make them host (player index 0).
        hostUserId: opponent.userId,
        boardId,
        status: "playing",
        players,
        currentPlayerIndex: 0,
        turnPhase: "rolling",
        winnerId: undefined,
        lastRoll: undefined,
        moveLog: [`Quick Match started: ${opponent.name} vs ${name}!`],
        turnStartedAt: Date.now(),
        createdAt: Date.now(),
      });

      // Mark the opponent's queue entry as matched.
      await ctx.db.patch(opponent._id, {
        status: "matched",
        gameId,
        roomCode,
        opponentName: name,
      });

      // Create the caller's queue entry already in the matched state.
      const myEntryId = await ctx.db.insert("matchmaking", {
        userId,
        name,
        boardId,
        status: "matched",
        gameId,
        roomCode,
        opponentName: opponent.name,
        createdAt: Date.now(),
      });

      return toPublic({
        _id: myEntryId,
        userId,
        name,
        boardId,
        status: "matched",
        gameId,
        roomCode,
        opponentName: opponent.name,
        createdAt: Date.now(),
      });
    }

    // No opponent available — add the caller to the queue and wait.
    const entryId = await ctx.db.insert("matchmaking", {
      userId,
      name,
      boardId,
      status: "searching",
      createdAt: Date.now(),
    });

    return toPublic({
      _id: entryId,
      userId,
      name,
      boardId,
      status: "searching",
      gameId: null,
      roomCode: null,
      opponentName: null,
      createdAt: Date.now(),
    });
  },
});

/**
 * Leave the matchmaking queue. Removes the caller's "searching" entry.
 * "matched" entries are left alone — the game itself has started and is
 * managed via the games table (leaveGame / disconnect logic).
 */
export const leaveQueue = mutation({
  args: { anonId: v.optional(v.string()) },
  handler: async (ctx, { anonId }) => {
    const authId = await getAuthUserId(ctx);
    const userId = authId ?? (anonId ? `anon-${anonId}` : null);
    if (!userId) return;

    const entry = await ctx.db
      .query("matchmaking")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "searching"))
      .first();

    if (entry) {
      await ctx.db.delete(entry._id);
    }
  },
});

/**
 * Clear a "matched" queue entry after the client has navigated to the game.
 * Keeps the matchmaking table tidy once the entry has served its purpose.
 */
export const clearMatchedEntry = mutation({
  args: { anonId: v.optional(v.string()) },
  handler: async (ctx, { anonId }) => {
    const authId = await getAuthUserId(ctx);
    const userId = authId ?? (anonId ? `anon-${anonId}` : null);
    if (!userId) return;

    const entry = await ctx.db
      .query("matchmaking")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "matched"))
      .first();

    if (entry) {
      await ctx.db.delete(entry._id);
    }
  },
});
