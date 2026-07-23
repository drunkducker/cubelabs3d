import type { Metadata } from "next";
import Link from "next/link";
import { listChallengesForCurrentUser, type ChallengeView } from "@/app/lib/challenge-service";
import { declineChallenge } from "@/app/profile/challenges/actions";

export const metadata: Metadata = {
  title: "My Challenges | Cube Lab 3D",
  description: "View sent and received Cube Labs challenges.",
};

function formatElapsed(ms: number | null) {
  if (ms === null) return "No time";
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export default async function ProfileChallengesPage() {
  let challenges: ChallengeView[] = [];
  let error = "";

  try {
    challenges = await listChallengesForCurrentUser();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unable to load challenges.";
  }

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1]">
        <Link href="/profile" className="inline-flex text-sm font-bold text-[var(--muted)]">Back to profile</Link>
        <section className="mt-5">
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--green)]">Cube ID</p>
          <h1 className="mt-2 text-[38px] font-black leading-none">My Challenges</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Sent and received 3x3 challenge attempts show here after both accounts are signed in.
          </p>
        </section>

        {error ? (
          <section className="glass mt-5 rounded-[18px] p-5">
            <h2 className="text-xl font-black text-white">{error}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Sign in to view private challenge rows.</p>
            <Link href="/auth" className="cta-blue mt-4 grid min-h-12 place-items-center rounded-xl text-center font-black">Sign In</Link>
          </section>
        ) : challenges.length ? (
          <section className="mt-5 grid gap-3">
            {challenges.map((challenge) => (
              <article
                key={challenge.id}
                className="glass rounded-[18px] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-white">{challenge.sender_name} vs {challenge.recipient_name}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{challenge.puzzle_type} · {challenge.status}</p>
                  </div>
                  <span className="rounded-xl border border-[rgba(245,185,66,.35)] bg-[rgba(245,185,66,.08)] px-3 py-2 font-mono text-sm font-black text-[var(--gold)]">
                    {formatElapsed(challenge.sender_time_ms)}
                  </span>
                </div>
                <p className="mt-3 break-words font-mono text-xs leading-5 text-[var(--muted)]">{challenge.scramble}</p>
                {challenge.message ? <p className="mt-3 text-sm font-semibold text-white">{challenge.message}</p> : null}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <form action={declineChallenge}>
                    <input type="hidden" name="challenge_id" value={challenge.id} />
                    <button
                      className="min-h-11 w-full rounded-xl border border-[var(--border-2)] bg-black/20 text-sm font-black text-slate-300 disabled:opacity-50"
                      disabled={challenge.status === "declined" || challenge.status === "completed"}
                    >
                      Decline
                    </button>
                  </form>
                  <Link href={`/challenge/${challenge.id}`} className="cta-purple grid min-h-11 place-items-center rounded-xl text-center text-sm font-black">
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="glass mt-5 rounded-[18px] p-5">
            <h2 className="text-xl font-black text-white">No challenges yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Start from the leaderboard 3x3 challenge, save a result, and send it to another account.</p>
            <Link href="/leaderboard/3x3/play" className="cta-purple mt-4 grid min-h-12 place-items-center rounded-xl text-center font-black">Start 3x3 Challenge</Link>
          </section>
        )}
      </div>
    </main>
  );
}
