import { describe, it, expect } from "vitest";
import {
  createInitialGameState,
  applyRoll,
  advanceTurn,
  rollDice,
} from "../index";
import type { GameState, PlayerState } from "../types";

const testPlayers = [
  { id: "p1", name: "Alice", color: "#dc2626" },
  { id: "p2", name: "Bob", color: "#2563eb" },
  { id: "p3", name: "Charlie", color: "#16a34a" },
];

function makePlayerState(
  position: number,
  consecutiveSixes = 0,
): PlayerState {
  return {
    id: "p1",
    name: "Alice",
    color: "#dc2626",
    position,
    consecutiveSixes,
  };
}

function makePlayerState2(
  position: number,
  consecutiveSixes = 0,
): PlayerState {
  return {
    id: "p2",
    name: "Bob",
    color: "#2563eb",
    position,
    consecutiveSixes,
  };
}

function createTestState(overrides: {
  positions?: [number, number];
  consecutiveSixes?: [number, number];
  boardId?: "classic" | "venom";
} = {}): GameState {
  const state = createInitialGameState(overrides.boardId ?? "classic", testPlayers.slice(0, 2));
  const pos = overrides.positions ?? [0, 0];
  const sixes = overrides.consecutiveSixes ?? [0, 0];
  return {
    ...state,
    players: [
      { ...state.players[0], position: pos[0], consecutiveSixes: sixes[0] },
      { ...state.players[1], position: pos[1], consecutiveSixes: sixes[1] },
    ],
  };
}

describe("Game Engine", () => {
  describe("rollDice", () => {
    it("generates numbers between 1 and 6", () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDice();
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
      }
    });

    it("can generate all six values", () => {
      const results = new Set<number>();
      for (let i = 0; i < 1000; i++) {
        results.add(rollDice());
      }
      expect(results.size).toBe(6);
    });
  });

  describe("applyRoll", () => {
    it("moves player forward by the roll amount", () => {
      const state = createTestState({ positions: [15, 0] });
      const result = applyRoll(state, 3);
      expect(result.players[0].position).toBe(18);
      expect(result.players[1].position).toBe(0); // unchanged
    });

    it("handles overshoot - player stays in place when roll goes past 100", () => {
      const state = createTestState({ positions: [97, 0] });
      const result = applyRoll(state, 5);
      expect(result.players[0].position).toBe(97); // no move
      expect(result.turnPhase).toBe("next_player"); // turn passes
    });

    it("wins when landing exactly on 100", () => {
      const state = createTestState({ positions: [94, 0] });
      const result = applyRoll(state, 6);
      expect(result.players[0].position).toBe(100);
      expect(result.status).toBe("game_over");
      expect(result.winnerId).toBe("p1");
    });

    it("wins from other exact landing positions", () => {
      const state = createTestState({ positions: [95, 0], boardId: "venom" });
      const result = applyRoll(state, 5);
      expect(result.players[0].position).toBe(100);
      expect(result.status).toBe("game_over");
    });

    it("moves player down on snake head", () => {
      // Classic: tile 16 is a snake head → tail at 6
      const state = createTestState({ positions: [10, 0] });
      const result = applyRoll(state, 6);
      expect(result.players[0].position).toBe(6); // snake tail
    });

    it("moves player up on ladder bottom", () => {
      // Classic: tile 1 is a ladder bottom → top at 38
      const state = createTestState({ positions: [0, 0] });
      const result = applyRoll(state, 1);
      expect(result.players[0].position).toBe(38); // ladder top
    });

    it("forfeits turn after three consecutive sixes", () => {
      const state = createTestState({
        positions: [10, 0],
        consecutiveSixes: [2, 0],
      });
      const result = applyRoll(state, 6);
      expect(result.turnPhase).toBe("next_player");
      expect(result.players[0].consecutiveSixes).toBe(0);
      expect(result.moveLog.some((m) => m.includes("three 6s"))).toBe(true);
    });

    it("grants extra roll on rolling a 6", () => {
      const state = createTestState({ positions: [10, 0] });
      const result = applyRoll(state, 6);
      expect(result.turnPhase).toBe("extra_roll");
      expect(result.currentPlayerIndex).toBe(0); // same player
    });

    it("does not grant extra roll on non-six roll", () => {
      const state = createTestState({ positions: [10, 0] });
      const result = applyRoll(state, 3);
      expect(result.turnPhase).toBe("next_player");
    });

    it("tracks consecutive sixes correctly", () => {
      const state = createTestState({
        positions: [10, 0],
        consecutiveSixes: [1, 0],
      });
      const result = applyRoll(state, 6);
      expect(result.players[0].consecutiveSixes).toBe(2);
    });

    it("resets consecutive sixes on non-six roll", () => {
      const state = createTestState({
        positions: [10, 0],
        consecutiveSixes: [2, 0],
      });
      const result = applyRoll(state, 3);
      expect(result.players[0].consecutiveSixes).toBe(0);
    });
  });

  describe("advanceTurn", () => {
    it("advances to the next player", () => {
      const state = createTestState({ positions: [10, 5] });
      const result = advanceTurn(state);
      expect(result.currentPlayerIndex).toBe(1);
    });

    it("wraps around to player 0 after the last player", () => {
      const state = createInitialGameState("classic", testPlayers);
      const r1 = advanceTurn(state);
      expect(r1.currentPlayerIndex).toBe(1);
      const r2 = advanceTurn(r1);
      expect(r2.currentPlayerIndex).toBe(2);
      const r3 = advanceTurn(r2);
      expect(r3.currentPlayerIndex).toBe(0);
    });

    it("resets consecutive sixes for the next player", () => {
      const state = createInitialGameState("classic", [
        { id: "p1", name: "A", color: "#f00" },
        { id: "p2", name: "B", color: "#0f0" },
      ]);
      // Simulate Bob having pending sixes
      state.players[1] = { ...state.players[1], consecutiveSixes: 3 };
      const result = advanceTurn(state);
      expect(result.players[1].consecutiveSixes).toBe(0);
    });
  });

  describe("Board modes", () => {
    it("venom board has no ladders", () => {
      const state = createTestState({
        positions: [0, 0],
        boardId: "venom",
      });
      // Roll 1 → tile 1 in venom has no ladder, so stays at 1
      const result = applyRoll(state, 1);
      expect(result.players[0].position).toBe(1);
    });

    it("venom board has snakes at expected positions", () => {
      // Venom: tile 8 is a snake head → tail at 3
      const state = createTestState({
        positions: [4, 0],
        boardId: "venom",
      });
      const result = applyRoll(state, 4);
      expect(result.players[0].position).toBe(3); // snake tail
    });
  });

  describe("createInitialGameState", () => {
    it("creates a state with all players at position 0", () => {
      const state = createInitialGameState("classic", testPlayers);
      state.players.forEach((p) => {
        expect(p.position).toBe(0);
        expect(p.consecutiveSixes).toBe(0);
      });
    });

    it("sets the first player as current", () => {
      const state = createInitialGameState("classic", testPlayers);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.status).toBe("awaiting_roll");
    });

    it("starts with empty move log and no winner", () => {
      const state = createInitialGameState("classic", testPlayers);
      expect(state.moveLog).toEqual([]);
      expect(state.winnerId).toBeNull();
      expect(state.lastRoll).toBeNull();
    });
  });
});
