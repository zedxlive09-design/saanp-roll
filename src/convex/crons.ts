import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled cron jobs for online multiplayer:
 *
 * 1. `fill-bots` (every 10s): scans "waiting" games older than 30s and fills
 *    empty slots with AI bot players. Auto-starts the game once 2+ players
 *    are present. See `src/convex/bots.ts:checkAndFillBots`.
 *
 * 2. `advance-bots` (every 1s): for each "playing" game where the current
 *    player is a bot and at least 1.5s has elapsed since the turn started,
 *    performs the bot's roll server-side via the SAME engine path
 *    (`performGameRoll`) used by human `rollDiceOnline` calls. See
 *    `src/convex/bots.ts:autoAdvanceBotGames`.
 *
 * Both are `internalMutation`s — not callable from the client.
 */
const crons = cronJobs();

// DISABLED: No auto-bot-fill in Friends mode (waiting games are all Friends rooms).
// crons.interval("fill-bots", { seconds: 10 }, internal.bots.checkAndFillBots);
crons.interval(
  "advance-bots",
  { seconds: 1 },
  internal.bots.autoAdvanceBotGames,
);

export default crons;
