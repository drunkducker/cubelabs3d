import type { Metadata } from "next";
import Link from "next/link";
import NxNCubeGame from "@/app/NxNCubeGame";
import { getChallengeForCurrentUser } from "@/app/lib/challenge-service";

export const metadata: Metadata = {
  title: "Puzzle Challenge | Cube Lab 3D",
  description: "Accept a Cube Labs puzzle challenge and play the exact same scramble.",
};

function formatElapsed(ms: number | null) {
  if (ms === null) return "no time set";
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function puzzleRoute(puzzleType: string) {
  const normalized = puzzleType.toLowerCase();
  if (normalized === "kilominx") return "/solver/kilominx";
  if (normalized === "pyraminx") return "/solver/pyraminx";
  if (/^\d+x\d+$/.test(normalized)) return `/solver/${normalized}`;
  return "/solve";
}

function parseCubeSize(puzzleType: string) {
  const match = puzzleType.toLowerCase().match(/^(\d+)x\1$/);
  if (!match) return null;
  const size = Number(match[1]);
  return Number.isInteger(size) && size >= 2 && size <= 20 ? size : null;
}

export default async function ChallengeAttemptPage({ params }: { params: { id: string } }) {
  let challenge;

  try {
    challenge = await getChallengeForCurrentUser(params.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Challenge unavailable.";
    return (
      <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 py-6">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <section className="glass relative z-[1] mt-24 rounded-[18px] p-5">
          <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--muted)]">Challenge</p>
          <h1 className="mt-2 text-2xl font-black text-white">{message}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Sign in as the sending or receiving account to open private Cube Labs challenges.
          </p>
          <div className="mt-5 grid gap-2">
            <Link href="/auth" className="cta-blue grid min-h-12 place-items-center rounded-xl text-center font-black">Sign In</Link>
            <Link href="/leaderboard" className="glass grid min-h-12 place-items-center rounded-xl text-center font-black">Back to Leaderboard</Link>
          </div>
        </section>
      </main>
    );
  }

  const cubeSize = parseCubeSize(challenge.puzzle_type);
  if (cubeSize === 3) {
    return (
      <NxNCubeGame
        size={3}
        variant="focus"
        challengeMode={{
          kind: "direct-challenge",
          title: `${challenge.sender_name} challenged you`,
          subtitle: `Beat ${formatElapsed(challenge.sender_time_ms)} on the exact same 3x3 scramble. ${challenge.message ?? ""}`.trim(),
          officialScramble: challenge.scramble,
          challengeId: challenge.id,
          opponentName: challenge.sender_name,
          opponentTimeMs: challenge.sender_time_ms,
        }}
      />
    );
  }

  const destination = puzzleRoute(challenge.puzzle_type);
  const query = new URLSearchParams({
    challengeId: challenge.id,
    scramble: challenge.scramble,
  });

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 py-6">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <section className="glass relative z-[1] mt-16 rounded-[18px] p-5">
        <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--green)]">{challenge.puzzle_type} friend challenge</p>
        <h1 className="mt-2 text-2xl font-black text-white">{challenge.sender_name} challenged you</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Play the exact same start state and beat {formatElapsed(challenge.sender_time_ms)}. {challenge.message ?? ""}
        </p>
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/25 p-3">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--muted)]">Official scramble</p>
          <p className="mt-2 break-words font-mono text-xs leading-5 text-white">{challenge.scramble}</p>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          The Save &amp; Friend Play panel opens on the puzzle page with this challenge ID and scramble. Use it to load/copy the start state and submit the finished attempt.
        </p>
        <div className="mt-5 grid gap-2">
          <Link href={`${destination}?${query.toString()}`} className="cta-green grid min-h-12 place-items-center rounded-xl text-center font-black">Open {challenge.puzzle_type}</Link>
          <Link href="/profile/challenges" className="glass grid min-h-12 place-items-center rounded-xl text-center font-black">My Challenges</Link>
        </div>
      </section>
    </main>
  );
}
