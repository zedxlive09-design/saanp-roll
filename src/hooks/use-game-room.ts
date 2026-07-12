import { useQuery, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "./use-auth";

export function useGameRoom(roomCode: string | null) {
  const anonId = useAnonId();
  const game = useQuery(
    api.games.getGame,
    roomCode ? { roomCode } : "skip",
  );

  const createGameMutation = useMutation(api.games.createGame);
  const joinGameMutation = useMutation(api.games.joinGame);
  const startGameMutation = useMutation(api.games.startGame);
  const rollDiceOnlineMutation = useMutation(api.games.rollDiceOnline);
  const leaveGameMutation = useMutation(api.games.leaveGame);
  const skipTurnMutation = useMutation(api.games.skipTurn);

  // Wrappers that pass the anonId for guest users
  const createGame = (args: any) => createGameMutation({ ...args, anonId });
  const joinGame = (args: any) => joinGameMutation({ ...args, anonId });
  const startGame = (args: any) => startGameMutation({ ...args, anonId });
  const rollDiceOnline = (args: any) => rollDiceOnlineMutation({ ...args, anonId });
  const leaveGame = (args: any) => leaveGameMutation({ ...args, anonId });
  const skipTurn = (args: any) => skipTurnMutation({ ...args, anonId });

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
/**
 * Quick Match matchmaking hook with anonymous user support.
 *
 * Generates a stable anonymous ID (stored in localStorage) so guest users
 * can use Quick Match without signing in. Authenticated users use their
 * real Convex auth ID; the anon ID is ignored when authenticated.
 */
export function useMatchmaking() {
  // Stable anon ID — generated once per browser, persisted in localStorage
  const anonId = useAnonId();

  const myQueueEntry = useQuery(
    api.matchmaking.getMyQueueEntry,
    anonId ? { anonId } : "skip",
  );
  const joinQueueMutation = useMutation(api.matchmaking.joinQueue);
  const leaveQueueMutation = useMutation(api.matchmaking.leaveQueue);
  const clearMatchedEntryMutation = useMutation(api.matchmaking.clearMatchedEntry);

  // Wrappers that pass the anonId so the server can identify guest users
  const joinQueue = (args: { boardId: string; playerName?: string }) =>
    joinQueueMutation({ boardId: args.boardId, anonId: anonId ?? undefined, playerName: args.playerName });
  const leaveQueue = () => leaveQueueMutation({ anonId: anonId ?? undefined });
  const clearMatchedEntry = () => clearMatchedEntryMutation({ anonId: anonId ?? undefined });

  return {
    myQueueEntry,
    joinQueue,
    leaveQueue,
    clearMatchedEntry,
  };
}

/**
 * Returns a stable anonymous ID from localStorage. Generates one on first call.
 * Used so guest users can use Quick Match without signing in.
 */
function useAnonId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("saanp-anon-id");
      if (stored) {
        setId(stored);
      } else {
        const newId = crypto.randomUUID();
        localStorage.setItem("saanp-anon-id", newId);
        setId(newId);
      }
    } catch {
      // localStorage not available (SSR / private mode) — return null
      setId(null);
    }
  }, []);

  return id;
}

export type { Id };
