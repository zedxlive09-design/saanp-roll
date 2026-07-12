import { internalMutation } from "./_generated/server";
import { performGameRoll } from "./games";

// ---------------------------------------------------------------------------
// Realistic bot name pool
// ---------------------------------------------------------------------------

/**
 * ~60 diverse, realistic, world-sounding first names. Curated so bots don't
 * look obviously "bot-like" (no "Bot1", "AI_Player", etc.) while still being
 * natural for a global multiplayer game. Deduped at module load.
 *
 * Bots draw a random name from this pool each time they fill a slot.
 */
const BOT_NAMES: string[] = Array.from(
  new Set([
    "Aarav",
    "Yuki",
    "Sofia",
    "Kwame",
    "Mei",
    "Diego",
    "Anya",
    "Ravi",
    "Zara",
    "Liam",
    "Aisha",
    "Hiro",
    "Elena",
    "Omar",
    "Priya",
    "Lucas",
    "Nadia",
    "Tariq",
    "Min-jun",
    "Isabella",
    "Kofi",
    "Saanvi",
    "Mateo",
    "Fatima",
    "Chen",
    "Olga",
    "Rashid",
    "Yara",
    "Nikolai",
    "Amara",
    "Joaquin",
    "Lin",
    "Dmitri",
    "Eshe",
    "Rohan",
    "Camille",
    "Ibrahim",
    "Xiomara",
    "Sven",
    "Leila",
    "Arjun",
    "Mila",
    "Khalid",
    "Nina",
    "Takeshi",
    "Adaeze",
    "Vikram",
    "Beatriz",
    "Sami",
    "Cho",
    "Anastasia",
    "Jabari",
    "Ingrid",
    "Naledi",
    "Emilio",
    "Sakura",
    "Olu",
    "Greta",
    "Pavel",
    "Aiko",
    "Noor",
    "Bilal",
    "Soraya",
    "Tomas",
  ]),
);

/**
 * Return a shuffled copy of the bot-name pool and pick `count` unique names.
 * Falls back to allowing repeats if `count` exceeds the pool size (unlikely:
 * 4-player cap, ~60-name pool).
 */
function pickBotNames(count: number): string[] {
  const shuffled = [...BOT_NAMES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, count);
  // Pad with extra random picks if we somehow need more than the pool size.
  while (picked.length < count) {
    picked.push(shuffled[Math.floor(Math.random() * shuffled.length)]);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Constants — must mirror src/convex/games.ts
// ---------------------------------------------------------------------------

const PLAYER_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#d97706"];

/** How long a "waiting" game must wait before bots auto-fill empty slots. */
const BOT_FILL_DELAY_MS = 30_000;

/**
 * How long a bot's turn must last before the auto-advance cron rolls for it.
 * Keeps bots from feeling instant / robotic — gives the human time to see
 * whose turn it is and watch the dice.
 */
const BOT_TURN_MIN_DELAY_MS = 1500;

// ---------------------------------------------------------------------------
// Internal mutations (called by crons — not exposed to the client)
// ---------------------------------------------------------------------------

/**
 * Cron job (every 10s): for every game still in "waiting" status whose
 * createdAt is older than BOT_FILL_DELAY_MS (30s), fill any empty player
 * slots with bot players. If 2+ players are now present (humans + bots),
 * auto-start the game (status → "playing", reset turnStartedAt, add a move
 * log entry).
 *
 * - Skips games with no joined human players (avoids spawning all-bot games
 *   when a host left their own waiting room).
 * - Bots get `userId: "bot-${uuid}"`, a random realistic name, a color from
 *   PLAYER_COLORS, `isConnected: true`, `isBot: true`, position 0.
 * - The host stays the original human host (we don't reassign hostUserId).
 */
export const checkAndFillBots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const waitingGames = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      // Cap the scan so a flood of stale rooms can't OOM the cron. 50 is
      // far more than concurrent waiting rooms we'd realistically have.
      .take(50);

    for (const game of waitingGames) {
      // Not old enough yet — skip.
      if (now - game.createdAt < BOT_FILL_DELAY_MS) continue;

      // Skip paid rooms — the host paid an entry fee to play with real
      // humans, not bots. Paid rooms just keep waiting (the host can leave
      // for a full refund via `leaveGame`). Bot-fill is intended for free
      // rooms where the host wants a game to start quickly.
      const fee = typeof game.entryFee === "number" ? game.entryFee : 0;
      if (fee > 0) continue;

      // Only fill if at least one real human is joined. (If everyone left
      // their own waiting room, spawning an all-bot game would be silly.)
      const hasJoinedHuman = game.players.some(
        (p) => p.userId && !p.userId.startsWith("bot-"),
      );
      if (!hasJoinedHuman) continue;

      // Already has bots filling? (Avoid double-filling if a previous cron
      // tick raced — though Convex serializes mutations per-doc, this is a
      // cheap defensive check.)
      const emptySlots = game.players
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => !p.userId);

      if (emptySlots.length === 0) continue;

      const botNames = pickBotNames(emptySlots.length);

      const filledPlayers = game.players.map((p, i) => {
        const emptyIdx = emptySlots.findIndex((s) => s.i === i);
        if (emptyIdx < 0) return p;
        return {
          userId: `bot-${crypto.randomUUID()}`,
          name: botNames[emptyIdx],
          color: PLAYER_COLORS[i] ?? PLAYER_COLORS[0],
          isConnected: true,
          position: 0,
          consecutiveSixes: 0,
          isBot: true,
        };
      });

      const joinedCount = filledPlayers.filter((p) => p.userId).length;

      const update: Record<string, unknown> = {
        players: filledPlayers,
      };

      // Auto-start if 2+ players are now present (humans + bots). Mirrors
      // the existing `startGame` mutation's behavior.
      if (joinedCount >= 2) {
        update.status = "playing";
        update.turnStartedAt = Date.now();
        update.moveLog = [
          ...game.moveLog,
          `Game started — bots filled empty slots`,
        ];
      }

      await ctx.db.patch(game._id, update);
    }
  },
});

/**
 * Cron job (every 1s): for every game in "playing" status where the current
 * player is a bot AND enough time has elapsed since the turn started
 * (BOT_TURN_MIN_DELAY_MS = 1.5s), roll the dice server-side using the exact
 * same engine path (`performGameRoll`) as a human's `rollDiceOnline` call.
 *
 * - Bots never call `rollDiceOnline` directly because that mutation requires
 *   `currentPlayer.userId === playerId` for the auth'd caller — bots have no
 *   auth session. Instead we invoke the shared roll helper with no auth check.
 * - Skips games whose current player is human (lets them roll themselves).
 * - Skips finished games.
 * - One roll per cron tick per game — if the roll yields an extra_roll (rolled
 *   a 6), the next cron tick (1s later) will roll again. The 1.5s minimum
 *   delay resets via `turnStartedAt` on every phase change inside
 *   `performGameRoll`.
 */
export const autoAdvanceBotGames = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const playingGames = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "playing"))
      .take(50);

    for (const game of playingGames) {
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (!currentPlayer) continue;
      if (!currentPlayer.isBot) continue;
      // Don't roll for a bot that has left the game (leftGame === true).
      if (currentPlayer.leftGame) continue;

      // Enforce a minimum turn duration so bots feel human-paced.
      if (now - game.turnStartedAt < BOT_TURN_MIN_DELAY_MS) continue;

      try {
        await performGameRoll(ctx, game);
      } catch (err) {
        // Don't let one bad game break the whole cron tick.
        console.error(
          `[autoAdvanceBotGames] roll failed for game ${game._id}:`,
          err,
        );
      }
    }
  },
});

// Exported for tests / debugging.
export const __botNamePoolSize = BOT_NAMES.length;
