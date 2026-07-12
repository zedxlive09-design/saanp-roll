import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "./use-auth";

export function useGameRoom(roomCode: string | null) {
  const game = useQuery(
    api.games.getGame,
    roomCode ? { roomCode } : "skip",
  );

  const createGame = useMutation(api.games.createGame);
  const joinGame = useMutation(api.games.joinGame);
  const startGame = useMutation(api.games.startGame);
  const rollDiceOnline = useMutation(api.games.rollDiceOnline);
  const leaveGame = useMutation(api.games.leaveGame);
  const skipTurn = useMutation(api.games.skipTurn);

  return {
    game,
    createGame,
    joinGame,
    startGame,
    rollDiceOnline,
    leaveGame,
    skipTurn,
  };
}

/**
 * Quick Match matchmaking hook. Independent of useGameRoom (which is keyed on
 * a roomCode) so it can be used on the lobby screen before any game exists.
 *
 * - `myQueueEntry`: reactive subscription to the caller's active queue entry
 *   (status "searching" or "matched"), or null.
 * - `joinQueue(boardId)`: enter the queue for the given board. If another
 *   user is already searching the same board, matches them immediately,
 *   creates + auto-starts a 2-player game, and returns a "matched" entry.
 * - `leaveQueue()`: cancel an active search.
 * - `clearMatchedEntry()`: tidy up a "matched" entry after navigating to the
 *   game (optional; stale entries are filtered out by getMyQueueEntry).
 */
export function useMatchmaking() {
  const myQueueEntry = useQuery(api.matchmaking.getMyQueueEntry);
  const joinQueue = useMutation(api.matchmaking.joinQueue);
  const leaveQueue = useMutation(api.matchmaking.leaveQueue);
  const clearMatchedEntry = useMutation(api.matchmaking.clearMatchedEntry);

  return {
    myQueueEntry,
    joinQueue,
    leaveQueue,
    clearMatchedEntry,
  };
}

export type { Id };
