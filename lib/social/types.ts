/**
 * Social challenge domain types for Cube Labs 3D.
 *
 * These types intentionally do not import the renderer. The cube engine can
 * serialize its current state into `cubeState`, while the social layer stores,
 * shares, ranks, and replays that state without knowing how it is drawn.
 */

export type CubeSize = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ChallengeMode = "beat-my-time" | "solve-this" | "same-scramble";

export type ChallengeVisibility = "public" | "friends" | "link-only" | "private";

export type AttemptStatus = "not-started" | "in-progress" | "solved" | "gave-up";

export type ControlType = "touch" | "mouse" | "keyboard" | "mixed";

export interface AssistanceFlags {
  undoCount: number;
  hintCount: number;
  usedSolver: boolean;
  usedPracticeMode: boolean;
}

export interface CubeChallenge {
  id: string;
  creatorUserId: string;
  title: string;
  message: string;
  cubeSize: CubeSize;
  mode: ChallengeMode;
  visibility: ChallengeVisibility;
  /** Versioned serialized cube state produced by the cube engine. */
  cubeState: string;
  /** Human-readable scramble when one exists. */
  scramble?: string;
  creatorSolved: boolean;
  creatorAttemptId?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface ChallengeAttempt {
  id: string;
  challengeId: string;
  userId?: string;
  guestId?: string;
  status: AttemptStatus;
  elapsedMilliseconds?: number;
  moveCount: number;
  controlType: ControlType;
  assistance: AssistanceFlags;
  /** Versioned move log used for replay and server-side validation. */
  moveLog: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface PublicProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarKey: string;
  favoriteCubeSize: CubeSize;
  visibility: "public" | "friends" | "private";
  totalSolves: number;
  challengeWins: number;
  challengeLosses: number;
  currentStreak: number;
  joinedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  attemptId: string;
  username: string;
  avatarKey: string;
  elapsedMilliseconds: number;
  moveCount: number;
  assistance: AssistanceFlags;
}

/**
 * Returns true when an attempt belongs on an unassisted leaderboard.
 */
export function isUnassistedAttempt(attempt: ChallengeAttempt): boolean {
  return (
    attempt.status === "solved" &&
    attempt.assistance.undoCount === 0 &&
    attempt.assistance.hintCount === 0 &&
    !attempt.assistance.usedSolver &&
    !attempt.assistance.usedPracticeMode
  );
}
