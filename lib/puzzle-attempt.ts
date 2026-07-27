export type PuzzleAttemptSnapshot = {
  started: boolean;
  solved: boolean;
  elapsedMs: number;
  moveCount: number;
  undoCount?: number;
  touchMoves?: number;
  buttonMoves?: number;
  moveHistory?: string[];
  assisted?: boolean;
};

export type PuzzleSolvePayload = {
  puzzle_type: string;
  scramble: string;
  solve_time_ms: number;
  move_count: number;
  solved: true;
  is_dnf: false;
  replay_data: {
    schema_version: 1;
    source: "play";
    client_elapsed_ms: number;
    reported_time_ms: number;
    solved_on_puzzle: true;
    solved_reported: true;
    is_test_data: false;
    manual_time_override: false;
    manual_tracking_override: false;
    actual_metrics: {
      move_count: number;
      undo_uses: number;
      touch_moves: number;
      button_moves: number;
    };
    reported_metrics: {
      move_count: number;
      undo_uses: number;
      touch_moves: number;
      button_moves: number;
    };
    assistance_flags: {
      undo_uses: number;
      auto_solve: false;
    };
    move_history: string[];
  };
};

export type FriendChallengePayload = {
  recipient: string;
  puzzle_type: string;
  scramble: string;
  message?: string;
  sender_solve_id?: string;
  sender_time_ms?: number;
  move_count?: number;
};

function wholeNumber(value: number | undefined) {
  return Number.isInteger(value) && (value ?? -1) >= 0 ? value! : 0;
}

export function canSavePuzzleAttempt(
  scramble: string,
  attempt: PuzzleAttemptSnapshot | undefined,
) {
  return Boolean(
    scramble.trim() &&
    attempt?.started &&
    attempt.solved &&
    !attempt.assisted &&
    Number.isFinite(attempt.elapsedMs) &&
    attempt.elapsedMs >= 0 &&
    Number.isInteger(attempt.moveCount) &&
    attempt.moveCount >= 0,
  );
}

/**
 * Build the same tracked-result envelope used by the 3×3 challenge flow.
 * Keeping it pure lets every puzzle renderer share and test the API contract
 * without importing a React component or duplicating request shapes.
 */
export function buildPuzzleSolvePayload({
  puzzleType,
  scramble,
  attempt,
}: {
  puzzleType: string;
  scramble: string;
  attempt: PuzzleAttemptSnapshot;
}): PuzzleSolvePayload {
  const normalizedType = puzzleType.trim();
  const normalizedScramble = scramble.trim();
  if (!normalizedType) throw new Error("Puzzle type is required.");
  if (!canSavePuzzleAttempt(normalizedScramble, attempt)) {
    throw new Error("Finish an unassisted timed solve before saving the result.");
  }

  const elapsedMs = Math.round(attempt.elapsedMs);
  const undoCount = wholeNumber(attempt.undoCount);
  const touchMoves = wholeNumber(attempt.touchMoves);
  const buttonMoves = wholeNumber(attempt.buttonMoves);
  const metrics = {
    move_count: attempt.moveCount,
    undo_uses: undoCount,
    touch_moves: touchMoves,
    button_moves: buttonMoves,
  };

  return {
    puzzle_type: normalizedType,
    scramble: normalizedScramble,
    solve_time_ms: elapsedMs,
    move_count: attempt.moveCount,
    solved: true,
    is_dnf: false,
    replay_data: {
      schema_version: 1,
      source: "play",
      client_elapsed_ms: elapsedMs,
      reported_time_ms: elapsedMs,
      solved_on_puzzle: true,
      solved_reported: true,
      is_test_data: false,
      manual_time_override: false,
      manual_tracking_override: false,
      actual_metrics: { ...metrics },
      reported_metrics: { ...metrics },
      assistance_flags: {
        undo_uses: undoCount,
        auto_solve: false,
      },
      move_history: [...(attempt.moveHistory ?? [])],
    },
  };
}

export function buildFriendChallengePayload({
  recipient,
  puzzleType,
  scramble,
  message,
  senderSolveId,
  attempt,
}: {
  recipient: string;
  puzzleType: string;
  scramble: string;
  message?: string;
  senderSolveId?: string;
  attempt?: PuzzleAttemptSnapshot;
}): FriendChallengePayload {
  const normalizedRecipient = recipient.trim();
  const normalizedType = puzzleType.trim();
  const normalizedScramble = scramble.trim();
  if (!normalizedRecipient) throw new Error("Recipient account is required.");
  if (!normalizedType) throw new Error("Puzzle type is required.");
  if (!normalizedScramble) throw new Error("Scramble is required.");

  const payload: FriendChallengePayload = {
    recipient: normalizedRecipient,
    puzzle_type: normalizedType,
    scramble: normalizedScramble,
  };
  const normalizedMessage = message?.trim();
  if (normalizedMessage) payload.message = normalizedMessage;

  if (senderSolveId && attempt && canSavePuzzleAttempt(normalizedScramble, attempt)) {
    payload.sender_solve_id = senderSolveId;
    payload.sender_time_ms = Math.round(attempt.elapsedMs);
    payload.move_count = attempt.moveCount;
  }

  return payload;
}
