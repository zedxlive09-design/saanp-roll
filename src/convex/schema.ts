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
        }),
      ),
      currentPlayerIndex: v.number(),
      turnPhase: v.string(), // "rolling" | "extra_roll" | "next_player"
      winnerId: v.optional(v.string()),
      lastRoll: v.optional(v.number()),
      moveLog: v.array(v.string()),
      turnStartedAt: v.number(), // timestamp when current turn began
      createdAt: v.number(),
    })
      .index("by_roomCode", ["roomCode"])
      .index("by_status", ["status"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
