import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfileSolvesPageData, type ProfileSolve } from "@/app/lib/profile-service";
import { ChevronRightIcon, CubeIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Solve History | Cube Lab 3D",
  description: "Review your Cube Labs solve history, ranked eligibility, moves, and challenge records.",
};

export default async function ProfileSolvesPage() {
  let data;
  try {
    data = await getProfileSolvesPageData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Sign in required.") redirect("/auth");
    redirect("/auth/email?error=Your%20session%20expired.%20Please%20log%20in%20again.");
  }

  const solves = data.solves;
  const solvedCount = solves.filter((solve) => solve.solved && !solve.is_dnf).length;
  const rankedCount = solves.filter((solve) => solve.leaderboard_eligible).length;
  const best3x3 = bestTime(solves, "3x3");
  const displayName = data.profile?.display_name || data.profile?.username || "Cube Solver";

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <ProfileBackLink />

        <section className="relative mt-5 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.45)]">
          <div className="absolute right-[-20px] top-[-20px] h-32 w-32 rotate-45 rounded-[8px] border border-[rgba(46,166,255,.28)] bg-[rgba(46,166,255,.12)]" />
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--blue)]">Solve History</p>
            <h1 className="mt-2 text-[38px] font-black leading-none text-white">All Solves</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Live account rows for {displayName}, including ranked eligibility and admin/test flags.
            </p>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <MetricCard label="Total" value={String(solves.length)} helper="saved rows" />
          <MetricCard label="Solved" value={String(solvedCount)} helper="clean finishes" />
          <MetricCard label="Best 3x3" value={formatClock(best3x3)} helper={data.rank.rank ? `rank #${data.rank.rank}` : "not ranked"} />
        </section>

        <section className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-black text-white">Recent Activity</h2>
            <span className="text-[12px] font-black text-[var(--green)]">{rankedCount} ranked</span>
          </div>

          {solves.length ? (
            <div className="divide-y divide-white/[.06]">
              {solves.map((solve) => (
                <SolveRow key={solve.id} solve={solve} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No solves saved yet"
              body="Play a tracked 3x3 challenge or save a solver result and it will land here."
              href="/leaderboard/3x3/play"
              action="Start 3x3 Challenge"
            />
          )}
        </section>
      </div>
    </main>
  );
}

function ProfileBackLink() {
  return (
    <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
      <ChevronRightIcon className="h-4 w-4 rotate-180" />
      Back to profile
    </Link>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-white/[.04] p-3 text-center">
      <p className="text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-[20px] font-black text-white">{value}</p>
      <p className="mt-1 truncate text-[11px] font-semibold text-[var(--blue)]">{helper}</p>
    </article>
  );
}

function SolveRow({ solve }: { solve: ProfileSolve }) {
  const tone = puzzleTone(solve.puzzle_type);
  const flags = solveFlags(solve);

  return (
    <article className="grid grid-cols-[52px_1fr_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`grid h-11 place-items-center rounded-[8px] text-[15px] font-black ${tone.badge}`}>
        {solve.puzzle_type}
      </span>
      <div className="min-w-0">
        <p className="truncate font-mono text-[14px] font-semibold text-white">{solve.scramble || "Saved solve"}</p>
        <p className="mt-1 text-[11px] font-semibold text-[var(--muted)]">
          {formatSolveDate(solve.created_at)} · {solve.move_count ?? "--"} moves
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <span key={flag} className="rounded-full border border-[var(--border)] bg-black/20 px-2 py-0.5 text-[10px] font-black text-slate-300">
              {flag}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right">
        <p className={`font-mono text-[16px] font-black ${tone.text}`}>
          {solve.is_dnf ? "DNF" : formatClock(solve.solve_time_ms)}
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{solve.source || "play"}</p>
      </div>
    </article>
  );
}

function EmptyState({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-[var(--border-2)] bg-black/20 p-5 text-center">
      <CubeIcon className="mx-auto h-8 w-8 text-[var(--blue)]" />
      <h2 className="mt-3 text-xl font-black text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
      <Link href={href} className="cta-purple mt-4 grid min-h-11 place-items-center rounded-[8px] text-sm font-black text-white">
        {action}
      </Link>
    </div>
  );
}

function solveFlags(solve: ProfileSolve) {
  const flags = [];
  if (solve.leaderboard_eligible) flags.push("ranked");
  if (solve.is_test_data || solve.manual_time_override || solve.manual_tracking_override) flags.push("test/admin");
  if (solve.actual_undo_count) flags.push(`${solve.actual_undo_count} undo`);
  if (solve.solved && !solve.is_dnf) flags.push("solved");
  if (!flags.length) flags.push("saved");
  return flags;
}

function bestTime(solves: ProfileSolve[], puzzle: string) {
  const times = solves
    .filter((solve) => solve.puzzle_type === puzzle && !solve.is_dnf && solve.solve_time_ms != null)
    .map((solve) => solve.solve_time_ms as number);
  return times.length ? Math.min(...times) : null;
}

function formatClock(milliseconds?: number | null) {
  if (milliseconds == null) return "--";
  const totalHundredths = Math.max(0, Math.round(milliseconds / 10));
  const minutes = Math.floor(totalHundredths / 6000);
  const seconds = Math.floor((totalHundredths % 6000) / 100);
  const hundredths = totalHundredths % 100;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

function formatSolveDate(createdAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function puzzleTone(puzzle: string) {
  if (puzzle === "2x2") return { text: "text-[var(--green)]", badge: "bg-green-500/15 text-[var(--green)]" };
  if (puzzle === "4x4") return { text: "text-[var(--purple)]", badge: "bg-purple-500/15 text-[var(--purple)]" };
  if (puzzle === "5x5") return { text: "text-[var(--gold)]", badge: "bg-yellow-500/15 text-[var(--gold)]" };
  return { text: "text-[var(--blue)]", badge: "bg-blue-500/15 text-[var(--blue)]" };
}
