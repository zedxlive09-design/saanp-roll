import { cronJobs } from "convex/server";

/**
 * NO POLLING CRONS — all bot actions are scheduled via scheduler.runAfter().
 *
 * Previously, autoAdvanceBotGames ran every 1 second (86,400 calls/day =
 * 2.6M calls/month), which burned the entire Convex free quota.
 *
 * Now:
 * - Bot rolls: scheduled via ctx.scheduler.runAfter(1500, ...) in
 *   performGameRoll, only when the turn actually advances to a bot.
 * - Quick Match bot fill: scheduled via scheduler.runAfter(30000, ...) in
 *   joinQueue, only when a player joins the queue and no opponent is found.
 * - Friends mode bot fill: disabled (no bots in Friends rooms).
 *
 * This reduces function calls from ~2.6M/month to ~0 (only actual game
 * actions trigger function calls).
 */

const crons = cronJobs();

// No interval-based crons. All scheduling is event-driven.

export default crons;
