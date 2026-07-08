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

  return {
    game,
    createGame,
    joinGame,
    startGame,
    rollDiceOnline,
    leaveGame,
  };
}
