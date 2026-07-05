import type {
  BoardMode,
  GameState,
  MoveResult,
  PlayerState,
  RollResult,
} from "./types";
import { getLadderTop, getSnakeTail } from "./boards";

const BOARD_SIZE = 100;

/**
 * Generate a random dice roll (1–6).
 * In Phase 1 (offline), this runs client-side.
 * In Phase 2 (online), the SERVER calls this and sends the result.
 */
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Process a dice roll for the current player in the given game state.
 * Returns the full updated game state — pure function, no side effects.
 */
export function applyRoll(state: GameState, roll: number): GameState {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return state;

  // Check for three consecutive sixes
  const isSix = roll === 6;
  const newConsecutiveSixes = isSix ? player.consecutiveSixes + 1 : 0;

  // Forfeit on three consecutive sixes
  if (newConsecutiveSixes >= 3) {
    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex
        ? { ...p, consecutiveSixes: 0 }
        : p,
    );

    return {
      ...state,
      players: updatedPlayers,
      lastRoll: roll,
      turnPhase: "next_player",
      moveLog: [
        ...state.moveLog,
        `${player.name} rolled three 6s in a row! Turn forfeited.`,
      ],
    };
  }

  // Calculate new position
  const newPos = player.position + roll;

  // Check overshoot (must land exactly on 100)
  if (newPos > BOARD_SIZE) {
    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex
        ? { ...p, consecutiveSixes: newConsecutiveSixes }
        : p,
    );

    return {
      ...state,
      players: updatedPlayers,
      lastRoll: roll,
      turnPhase: isSix ? "extra_roll" : "next_player",
      moveLog: [
        ...state.moveLog,
        `${player.name} rolled ${roll} (${player.position} → overshoot). No move.`,
      ],
    };
  }

  // Check for snake or ladder
  const snakeTail = getSnakeTail(state.boardId, newPos);
  const ladderTop = getLadderTop(state.boardId, newPos);
  const finalPos = snakeTail ?? ladderTop ?? newPos;

  const updatedPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? {
          ...p,
          position: finalPos,
          consecutiveSixes: newConsecutiveSixes,
        }
      : p,
  );

  // Build move log message
  let logMsg = `${player.name} rolled ${roll} (${player.position} → ${newPos}`;
  if (snakeTail) {
    logMsg += ` → 🐍 ${snakeTail}`;
  } else if (ladderTop) {
    logMsg += ` → 🪜 ${ladderTop}`;
  }
  logMsg += ")";

  // Check for win
  if (finalPos === BOARD_SIZE) {
    return {
      ...state,
      players: updatedPlayers,
      lastRoll: roll,
      status: "game_over",
      winnerId: player.id,
      turnPhase: "next_player",
      moveLog: [...state.moveLog, `${player.name} reached 100 and WINS! 🎉`],
    };
  }

  // If rolled 6, grant extra roll (same player)
  const nextPhase = isSix ? "extra_roll" : "next_player";

  return {
    ...state,
    players: updatedPlayers,
    lastRoll: roll,
    turnPhase: nextPhase,
    moveLog: [...state.moveLog, logMsg],
  };
}

/**
 * Advance to the next player's turn.
 */
export function advanceTurn(state: GameState): GameState {
  const nextIndex =
    (state.currentPlayerIndex + 1) % state.players.length;

  // Reset the consecutive sixes counter for the NEXT player about to roll
  const updatedPlayers = state.players.map((p, i) =>
    i === nextIndex ? { ...p, consecutiveSixes: 0 } : p,
  );

  return {
    ...state,
    players: updatedPlayers,
    currentPlayerIndex: nextIndex,
    turnPhase: "rolling",
    lastRoll: null,
  };
}

/**
 * Get the tile color for a given position (alternating light/dark pattern).
 */
export function getTileColor(
  position: number,
  boardId: BoardMode,
): { bg: string; text: string } {
  const row = Math.floor((position - 1) / 10);
  const isEvenRow = row % 2 === 0;
  const col = (position - 1) % 10;
  // Zigzag: even rows go left→right, odd rows go right→left
  const visualCol = isEvenRow ? col : 9 - col;
  const isLight = (row + visualCol) % 2 === 0;

  if (boardId === "venom") {
    return isLight
      ? { bg: "rgba(15,23,42,0.95)", text: "text-slate-300" }
      : { bg: "rgba(30,41,59,0.95)", text: "text-slate-400" };
  }

  return isLight
    ? { bg: "rgba(255,255,240,0.95)", text: "text-stone-700" }
    : { bg: "rgba(214,194,166,0.9)", text: "text-stone-800" };
}

/**
 * Create an initial game state from player setups and board mode.
 */
export function createInitialGameState(
  boardId: BoardMode,
  players: Array<{ id: string; name: string; color: string }>,
): GameState {
  return {
    boardId,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      position: 0,
      consecutiveSixes: 0,
    })),
    currentPlayerIndex: 0,
    status: "awaiting_roll",
    winnerId: null,
    lastRoll: null,
    turnPhase: "rolling",
    moveLog: [],
  };
}

/**
 * Resolve a full turn action: roll → apply → check win → advance.
 * Returns the new state and the move results for animation.
 */
export function resolveTurn(
  state: GameState,
  roll: number,
): { newState: GameState; results: MoveResult[] } {
  const results: MoveResult[] = [];

  // Step 1: Apply the roll
  const afterRoll = applyRoll(state, roll);

  if (afterRoll.turnPhase === "next_player") {
    // Check if snake or ladder was landed on
    const player = state.players[state.currentPlayerIndex];
    const newPlayer = afterRoll.players[state.currentPlayerIndex];
    const finalPos = newPlayer.position;
    const rawPos = player.position + roll;

    if (rawPos > BOARD_SIZE) {
      results.push({
        type: "overshoot",
        message: `${player.name} overshoots 100! No move.`,
      });
    } else if (finalPos !== rawPos) {
      const snakeTail = getSnakeTail(state.boardId, rawPos);
      if (snakeTail) {
        results.push({
          type: "snake_bite",
          from: rawPos,
          to: snakeTail,
          message: `${player.name} lands on a snake! Slithering down to ${snakeTail}.`,
        });
      } else {
        const ladderTop = getLadderTop(state.boardId, rawPos)!;
        results.push({
          type: "ladder_climb",
          from: rawPos,
          to: ladderTop,
          message: `${player.name} finds a ladder! Climbing up to ${ladderTop}.`,
        });
      }
    }

    if (afterRoll.status === "game_over") {
      results.push({
        type: "win",
        position: BOARD_SIZE,
        message: `${newPlayer.name} reached 100 and WINS! 🎉`,
      });
    } else {
      const finalState = advanceTurn(afterRoll);
      return { newState: finalState, results };
    }
  }

  if (afterRoll.turnPhase === "extra_roll") {
    results.push({
      type: "moved",
      newPosition: afterRoll.players[state.currentPlayerIndex].position,
      message: `Rolled a 6! Extra roll!`,
    });
  }

  return { newState: afterRoll, results };
}
