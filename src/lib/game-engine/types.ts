export type BoardMode = "classic" | "venom";

export interface BoardConfig {
  id: BoardMode;
  name: string;
  description: string;
  ladders: Record<number, number>;
  snakes: Record<number, number>;
}

export interface PlayerSetup {
  id: string;
  name: string;
  color: string;
  isBot?: boolean; // true for AI players (local mode only)
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  isBot?: boolean;
  position: number;
  consecutiveSixes: number;
}

export interface GameConfig {
  boardId: BoardMode;
  players: PlayerSetup[];
  winOnExactHundred: boolean;
  allowExtraRollOnSix: boolean;
  forfeitOnThreeSixes: boolean;
}

export type GameStatus =
  | "waiting_to_start"
  | "awaiting_roll"
  | "rolling"
  | "resolving_move"
  | "checking_snake_ladder"
  | "checking_win"
  | "game_over";

export interface GameState {
  boardId: BoardMode;
  players: PlayerState[];
  currentPlayerIndex: number;
  status: GameStatus;
  winnerId: string | null;
  lastRoll: number | null;
  turnPhase: "rolling" | "extra_roll" | "next_player";
  moveLog: string[];
}

export interface GameAction {
  type: "ROLL_DICE" | "FINISH_TURN" | "START_GAME" | "RESET_GAME";
  payload?: unknown;
}

export interface RollResult {
  value: number;
  isExtraRoll: boolean;
  forfeited: boolean;
}

export type MoveResult =
  | { type: "moved"; newPosition: number; message: string }
  | { type: "overshoot"; message: string }
  | { type: "snake_bite"; from: number; to: number; message: string }
  | { type: "ladder_climb"; from: number; to: number; message: string }
  | { type: "win"; position: number; message: string }
  | { type: "forfeit"; message: string };
