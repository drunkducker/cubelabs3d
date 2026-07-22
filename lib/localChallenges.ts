export type LocalChallengeMode = "beat-time" | "solve-this";

export type LocalChallenge = {
  id: string;
  version: 1;
  cubeSize: 3;
  mode: LocalChallengeMode;
  title: string;
  senderName: string;
  message: string;
  scramble: string;
  senderSolved: boolean;
  senderTimeMs: number | null;
  senderMoves: number | null;
  createdAt: string;
};

const STORAGE_KEY = "cube-labs-local-challenges-v1";

function readAll(): LocalChallenge[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalChallenge(challenge: LocalChallenge): void {
  const next = [challenge, ...readAll().filter((item) => item.id !== challenge.id)].slice(0, 50);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getLocalChallenge(id: string): LocalChallenge | null {
  return readAll().find((challenge) => challenge.id === id) ?? null;
}

export function createChallengeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function formatChallengeTime(milliseconds: number | null): string {
  if (!milliseconds || milliseconds <= 0) return "—";
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const hundredths = Math.floor((milliseconds % 1_000) / 10);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}
