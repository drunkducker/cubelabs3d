import type { Metadata } from "next";
import Link from "next/link";
import NxNCubeGame from "@/app/NxNCubeGame";
import { getChallengeForCurrentUser } from "@/app/lib/challenge-service";

export const metadata: Metadata = {
  title: "Cube Challenge | Cube Lab 3D",
  description: "Accept a Cube Labs 3x3 challenge and submit your tracked attempt.",
};

function formatElapsed(ms: number | null) {
  if (ms === null) return "no time set";
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
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
