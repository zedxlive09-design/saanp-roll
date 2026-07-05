import type { BoardConfig, BoardMode } from "./types";

export const BOARD_CONFIGS: Record<BoardMode, BoardConfig> = {
  classic: {
    id: "classic",
    name: "Classic",
    description: "Snakes & Ladders — the original. Climb ladders, avoid snakes.",
    ladders: {
      1: 38,
      4: 14,
      9: 31,
      21: 42,
      28: 84,
      36: 44,
      51: 67,
      71: 91,
      80: 100,
    },
    snakes: {
      16: 6,
      47: 26,
      49: 11,
      56: 53,
      62: 19,
      64: 60,
      87: 24,
      93: 73,
      95: 75,
      98: 78,
    },
  },
  venom: {
    id: "venom",
    name: "Venom (Snakes Only)",
    description:
      "No ladders — only snakes. ~50% more snakes than Classic. High variance, high danger.",
    ladders: {},
    snakes: {
      8: 3,
      16: 6,
      24: 5,
      37: 12,
      47: 26,
      49: 11,
      56: 53,
      62: 19,
      64: 60,
      73: 33,
      87: 24,
      92: 51,
      93: 73,
      95: 75,
      98: 78,
    },
  },
};

/** Returns the head positions (keys) of snakes for a given board. */
export function getSnakeHeads(boardId: BoardMode): number[] {
  return Object.keys(BOARD_CONFIGS[boardId].snakes).map(Number);
}

/** Returns the bottom positions (keys) of ladders for a given board. */
export function getLadderBottoms(boardId: BoardMode): number[] {
  return Object.keys(BOARD_CONFIGS[boardId].ladders).map(Number);
}

/** Check if a tile has a snake head, returning the tail position. */
export function getSnakeTail(
  boardId: BoardMode,
  tile: number,
): number | null {
  return BOARD_CONFIGS[boardId].snakes[tile] ?? null;
}

/** Check if a tile has a ladder bottom, returning the top position. */
export function getLadderTop(
  boardId: BoardMode,
  tile: number,
): number | null {
  return BOARD_CONFIGS[boardId].ladders[tile] ?? null;
}
