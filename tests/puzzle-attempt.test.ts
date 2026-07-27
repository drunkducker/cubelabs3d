import { describe, expect, it } from "vitest";
import {
  buildFriendChallengePayload,
  buildPuzzleSolvePayload,
  canSavePuzzleAttempt,
  type PuzzleAttemptSnapshot,
} from "@/lib/puzzle-attempt";

const completedSkewb: PuzzleAttemptSnapshot = {
  started: true,
  solved: true,
  elapsedMs: 25_341.6,
  moveCount: 14,
  undoCount: 1,
  touchMoves: 12,
  buttonMoves: 2,
  moveHistory: ["R", "U'", "R'", "U"],
};

describe("shared puzzle attempt contract", () => {
  it("accepts only completed, unassisted attempts with a start state", () => {
    expect(canSavePuzzleAttempt("R U' R'", completedSkewb)).toBe(true);
    expect(canSavePuzzleAttempt("", completedSkewb)).toBe(false);
    expect(canSavePuzzleAttempt("R U' R'", { ...completedSkewb, solved: false })).toBe(false);
    expect(canSavePuzzleAttempt("R U' R'", { ...completedSkewb, assisted: true })).toBe(false);
  });

  it("builds the tracked solve envelope used by CubeLabs result saving", () => {
    const payload = buildPuzzleSolvePayload({
      puzzleType: " skewb ",
      scramble: " R U' R' ",
      attempt: completedSkewb,
    });

    expect(payload).toMatchObject({
      puzzle_type: "skewb",
      scramble: "R U' R'",
      solve_time_ms: 25_342,
      move_count: 14,
      solved: true,
      is_dnf: false,
      replay_data: {
        source: "play",
        client_elapsed_ms: 25_342,
        reported_time_ms: 25_342,
        actual_metrics: {
          move_count: 14,
          undo_uses: 1,
          touch_moves: 12,
          button_moves: 2,
        },
        reported_metrics: {
          move_count: 14,
          undo_uses: 1,
          touch_moves: 12,
          button_moves: 2,
        },
        assistance_flags: {
          undo_uses: 1,
          auto_solve: false,
        },
        move_history: ["R", "U'", "R'", "U"],
      },
    });
  });

  it("refuses to build a result for an auto-solved puzzle", () => {
    expect(() => buildPuzzleSolvePayload({
      puzzleType: "skewb",
      scramble: "R U",
      attempt: { ...completedSkewb, assisted: true },
    })).toThrow("Finish an unassisted timed solve");
  });

  it("attaches a saved result to the friend challenge", () => {
    expect(buildFriendChallengePayload({
      recipient: " CubeTag#1234 ",
      puzzleType: "skewb",
      scramble: " R U ",
      message: " Beat this! ",
      senderSolveId: "solve-123",
      attempt: completedSkewb,
    })).toEqual({
      recipient: "CubeTag#1234",
      puzzle_type: "skewb",
      scramble: "R U",
      message: "Beat this!",
      sender_solve_id: "solve-123",
      sender_time_ms: 25_342,
      move_count: 14,
    });
  });

  it("still supports sending an exact unsolved start state", () => {
    expect(buildFriendChallengePayload({
      recipient: "friend",
      puzzleType: "skewb",
      scramble: "R U",
    })).toEqual({
      recipient: "friend",
      puzzle_type: "skewb",
      scramble: "R U",
    });
  });
});
