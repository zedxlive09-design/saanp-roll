import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Starting balance for brand-new users and the implicit default for any user
 *  whose `coins` field is missing (legacy rows created before this feature). */
export const DEFAULT_COINS = 500;

/** Daily-bonus award amount (coins). */
export const DAILY_BONUS_AMOUNT = 100;

/** 24-hour cooldown between daily-bonus claims. */
const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a user's current coin balance, defaulting to DEFAULT_COINS if the
 *  field is missing (legacy users) or the user is anonymous. */
function balanceOf(user: { coins?: number } | null): number {
  return typeof user?.coins === "number" ? user.coins : DEFAULT_COINS;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get the current authenticated user's coin balance. Returns DEFAULT_COINS
 * (500) for unauthenticated users or users with no `coins` field yet.
 *
 * The balance is read-only here — coins are only mutated via claimDailyBonus
 * (public) or awardCoins/spendCoins (internal, called from games.ts).
 */
export const getMyCoins = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return DEFAULT_COINS;
    const user = await ctx.db.get(userId);
    return balanceOf(user as { coins?: number } | null);
  },
});

/**
 * Daily-bonus status for the current user. Returns:
 *   - lastClaim: ms timestamp of last claim (null if never)
 *   - available: true if the user can claim right now
 *   - msUntilNext: ms until next claim becomes available (0 if available)
 *
 * Unauthenticated users get `available: false` with no lastClaim.
 */
export const getDailyBonusStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        lastClaim: null,
        available: false,
        msUntilNext: 0,
      };
    }
    const user = await ctx.db.get(userId);
    const lastClaim = (user as { lastBonusClaim?: number } | null)
      ?.lastBonusClaim;
    if (typeof lastClaim !== "number") {
      return { lastClaim: null, available: true, msUntilNext: 0 };
    }
    const elapsed = Date.now() - lastClaim;
    const available = elapsed >= DAILY_BONUS_COOLDOWN_MS;
    const msUntilNext = available
      ? 0
      : DAILY_BONUS_COOLDOWN_MS - elapsed;
    return { lastClaim, available, msUntilNext };
  },
});

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

/**
 * Claim the daily bonus. Awards DAILY_BONUS_AMOUNT coins if at least 24h has
 * elapsed since the last claim (or never claimed). Records the timestamp.
 * Returns the new balance, or throws if not authenticated or on cooldown.
 */
export const claimDailyBonus = mutation({
  args: {},
  handler: async (ctx): Promise<{ balance: number; awarded: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Sign in to claim your daily bonus");
    }

    const user = (await ctx.db.get(userId)) as {
      coins?: number;
      lastBonusClaim?: number;
    } | null;
    if (!user) throw new Error("User not found");

    const now = Date.now();
    const lastClaim = user.lastBonusClaim;
    if (typeof lastClaim === "number" && now - lastClaim < DAILY_BONUS_COOLDOWN_MS) {
      const mins = Math.ceil(
        (DAILY_BONUS_COOLDOWN_MS - (now - lastClaim)) / 60000,
      );
      throw new Error(`Already claimed — try again in ${mins} min`);
    }

    const current = balanceOf(user);
    const next = current + DAILY_BONUS_AMOUNT;
    await ctx.db.patch(userId, {
      coins: next,
      lastBonusClaim: now,
    });

    return { balance: next, awarded: DAILY_BONUS_AMOUNT };
  },
});

// ---------------------------------------------------------------------------
// Internal mutations (only callable from other Convex functions)
// ---------------------------------------------------------------------------

/**
 * Award coins to a user (server-side helper). Initializes the balance to
 * DEFAULT_COINS first if the user has no `coins` field. Returns the new
 * balance. No-op (returns DEFAULT_COINS) if the user doesn't exist.
 *
 * Called from games.ts when a game ends and the pot needs to be paid out to
 * the winner.
 */
export const awardCoins = internalMutation({
  args: { userId: v.id("users"), amount: v.number() },
  handler: async (ctx, { userId, amount }): Promise<number> => {
    if (amount === 0) return DEFAULT_COINS;
    const user = (await ctx.db.get(userId)) as {
      coins?: number;
    } | null;
    if (!user) return DEFAULT_COINS;
    const current = balanceOf(user);
    const next = current + amount;
    await ctx.db.patch(userId, { coins: next });
    return next;
  },
});

/**
 * Deduct coins from a user (server-side helper). Initializes the balance to
 * DEFAULT_COINS first if the user has no `coins` field. Throws if the user
 * doesn't have enough coins (after defaulting missing balances to 500).
 *
 * Called from games.ts when a player joins a paid game (entry fee).
 */
export const spendCoins = internalMutation({
  args: { userId: v.id("users"), amount: v.number() },
  handler: async (ctx, { userId, amount }): Promise<number> => {
    if (amount <= 0) return DEFAULT_COINS;
    const user = (await ctx.db.get(userId)) as {
      coins?: number;
    } | null;
    if (!user) throw new Error("User not found");
    const current = balanceOf(user);
    if (current < amount) {
      throw new Error(
        `Not enough coins — need ${amount}, have ${current}`,
      );
    }
    const next = current - amount;
    await ctx.db.patch(userId, { coins: next });
    return next;
  },
});

// ---------------------------------------------------------------------------
// Convenience helper for other server modules (read-only)
// ---------------------------------------------------------------------------

/** Read a user's coin balance from within another mutation/query. */
export async function getUserBalance(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<number> {
  const user = (await ctx.db.get(userId)) as { coins?: number } | null;
  return balanceOf(user);
}
