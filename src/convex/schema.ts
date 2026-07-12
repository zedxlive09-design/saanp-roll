import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // Coins/economy (Ludo/8 Ball Pool style). Default 500 on first sign-in.
      coins: v.optional(v.number()),
      // Timestamp (ms) of the last daily-bonus claim; null/undefined = never.
      lastBonusClaim: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Online game rooms
    games: defineTable({
      roomCode: v.string(), // 6-char shareable code
      hostUserId: v.string(), // creator's userId
      boardId: v.string(), // "classic" | "venom"
      status: v.string(), // "waiting" | "playing" | "finished"
      players: v.array(
        v.object({
          userId: v.string(),
          name: v.string(),
          color: v.string(),
          isConnected: v.boolean(),
          position: v.number(),
          consecutiveSixes: v.number(),
          // True once a player intentionally left an in-progress match
          // (counts as a defeat). Distinct from transient isConnected flips.
          leftGame: v.optional(v.boolean()),
          // True for AI-controlled bot players (auto-filled after 30s when no
          // real players join a "waiting" room). Bots roll server-side via
          // the same engine path as human players.
          isBot: v.optional(v.boolean()),
        }),
      ),
      currentPlayerIndex: v.number(),
      turnPhase: v.string(), // "rolling" | "extra_roll" | "next_player"
      winnerId: v.optional(v.string()),
      lastRoll: v.optional(v.number()),
      moveLog: v.array(v.string()),
      turnStartedAt: v.number(), // timestamp when current turn began
      createdAt: v.number(),
      // Per-player entry fee (coins). 0 = Free tier. Default 0 for back-compat.
      entryFee: v.optional(v.number()),
      // Accumulated pot (sum of paid entry fees). Awarded to the winner on
      // game end (including leave-as-defeat wins).
      pot: v.optional(v.number()),
    })
      .index("by_roomCode", ["roomCode"])
      .index("by_status", ["status"]),

    // Quick Match matchmaking queue
    matchmaking: defineTable({
      userId: v.string(),
      name: v.string(),
      boardId: v.string(), // "classic" | "venom"
      status: v.string(), // "searching" | "matched" | "expired"
      gameId: v.optional(v.id("games")), // set when matched
      roomCode: v.optional(v.string()), // set when matched (for client nav)
      opponentName: v.optional(v.string()), // set when matched
      createdAt: v.number(),
    })
      .index("by_status", ["status"])
      .index("by_userId", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
