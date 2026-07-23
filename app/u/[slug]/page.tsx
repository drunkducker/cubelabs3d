import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProfilePageData, type ProfileCollectionItem, type ProfileSolve } from "@/app/lib/profile-service";
import { sendFriendRequest } from "@/app/profile/friends/actions";
import { ChevronRightIcon, CubeIcon, TrophyIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Cube Labs Player | Cube Lab 3D",
  description: "View a public Cube Labs player profile, stats, achievements, and challenge shortcuts.",
};

export default async function PublicProfilePage({ params }: { params: { slug: string } }) {
  const data = await getPublicProfilePageData(decodeURIComponent(params.slug));
  if (!data) notFound();

  const { currentUser, profile, stats, solves, achievements, collection, relationship } = data;
  const name = profile.display_name || profile.username || profile.cube_tag || "Cube Player";
  const handle = profile.cube_tag || profile.username || profile.public_slug || profile.id.slice(0, 8);
  const challengeTarget = profile.cube_tag || profile.username || profile.public_slug || profile.id;
  const isSelf = currentUser?.id === profile.id;
  const best3x3 = readMetric(stats?.best_times, "3x3") ?? bestTime(solves, "3x3");

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <Link href="/profile/friends" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
          Back to friends
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.45)]">
          <div className="absolute right-[-18px] top-[-18px] h-32 w-32 rotate-45 rounded-[8px] border border-[rgba(46,166,255,.28)] bg-[rgba(46,166,255,.12)]" />
          <div className="relative z-[1] grid gap-4">
            <div className="grid grid-cols-[76px_1fr] items-center gap-4">
              <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[conic-gradient(from_220deg,var(--blue),var(--purple),var(--green),var(--blue))] p-[2px]">
                <span className="grid h-full w-full place-items-center rounded-full bg-[#111827] text-xl font-black text-white">
                  {initials(name)}
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--blue)]">Public Profile</p>
                <h1 className="mt-2 truncate text-[30px] font-black leading-none text-white">{name}</h1>
                <p className="mt-2 truncate text-sm font-bold text-[var(--muted)]">@{handle}</p>
              </div>
            </div>
            {profile.bio ? <p className="text-sm font-semibold leading-6 text-white">{profile.bio}</p> : null}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Solves" value={String(stats?.total_solves ?? solves.length)} />
          <Metric label="Best 3x3" value={best3x3 ? formatClock(best3x3) : "--"} />
          <Metric label="Streak" value={String(stats?.current_streak ?? 0)} />
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          {isSelf ? (
            <Link href="/profile/settings" className="cta-purple grid min-h-12 place-items-center rounded-[8px] text-sm font-black text-white">
              Edit Profile
            </Link>
          ) : currentUser ? (
            relationship ? (
              <span className="grid min-h-12 place-items-center rounded-[8px] border border-[var(--border)] bg-white/[.04] text-sm font-black capitalize text-[var(--muted)]">
                {relationship.status}
              </span>
            ) : (
              <form action={sendFriendRequest}>
                <input type="hidden" name="target_id" value={profile.id} />
                <button className="cta-purple min-h-12 w-full rounded-[8px] text-sm font-black text-white">Add Friend</button>
              </form>
            )
          ) : (
            <Link href="/auth" className="cta-purple grid min-h-12 place-items-center rounded-[8px] text-sm font-black text-white">
              Sign In To Add
            </Link>
          )}
          <Link href={`/leaderboard/3x3/play?recipient=${encodeURIComponent(challengeTarget)}`} className="grid min-h-12 place-items-center rounded-[8px] border border-[var(--border-2)] bg-black/20 text-sm font-black text-white">
            Challenge
          </Link>
        </section>

        <ProfilePanel title="Recent Ranked Solves" empty="This player keeps solve activity private or has no public ranked solves yet.">
          {solves.slice(0, 5).map((solve) => (
            <SolveRow key={solve.id} solve={solve} />
          ))}
        </ProfilePanel>

        <ProfilePanel title="Achievements" empty="No public achievements yet.">
          {achievements.slice(0, 6).map((achievement) => (
            <div key={achievement.achievement_id} className="flex items-center gap-3 rounded-[8px] border border-[var(--border)] bg-black/20 p-3">
              <TrophyIcon className="h-5 w-5 text-[var(--gold)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{achievement.achievements?.name || achievement.achievement_id}</p>
                <p className="mt-1 truncate text-xs font-semibold text-[var(--muted)]">{achievement.achievements?.description || "Unlocked achievement"}</p>
              </div>
            </div>
          ))}
        </ProfilePanel>

        <ProfilePanel title="Cube Shelf" empty="This player keeps their collection private or has not added cubes yet.">
          {collection.length ? (
            <div className="grid grid-cols-2 gap-3">
              {collection.slice(0, 4).map((cube) => (
                <CubeCard key={cube.id} cube={cube} />
              ))}
            </div>
          ) : null}
        </ProfilePanel>
      </div>
    </main>
  );
}

function ProfilePanel({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
      <h2 className="mb-3 text-[18px] font-black text-white">{title}</h2>
      {hasContent ? <div className="grid gap-3">{children}</div> : <p className="text-sm leading-6 text-[var(--muted)]">{empty}</p>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-white/[.04] p-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </article>
  );
}

function SolveRow({ solve }: { solve: ProfileSolve }) {
  return (
    <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-[8px] border border-[var(--border)] bg-black/20 p-3">
      <span className="grid h-10 place-items-center rounded-[8px] bg-blue-500/15 text-sm font-black text-[var(--blue)]">{solve.puzzle_type}</span>
      <p className="truncate font-mono text-xs font-semibold text-white">{solve.scramble || "Saved solve"}</p>
      <span className="font-mono text-sm font-black text-[var(--green)]">{solve.is_dnf ? "DNF" : formatClock(solve.solve_time_ms)}</span>
    </div>
  );
}

function CubeCard({ cube }: { cube: ProfileCollectionItem }) {
  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-black/20 p-3">
      <CubeIcon className="h-7 w-7 text-[var(--purple)]" />
      <p className="mt-2 truncate text-sm font-black text-white">{cube.model}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{cube.puzzle_type} {cube.brand ? `- ${cube.brand}` : ""}</p>
    </article>
  );
}

function readMetric(metrics: Record<string, number | string | null> | undefined, key: string) {
  const value = metrics?.[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function bestTime(solves: ProfileSolve[], puzzle: string) {
  const times = solves
    .filter((solve) => solve.puzzle_type === puzzle && !solve.is_dnf && solve.solve_time_ms != null)
    .map((solve) => solve.solve_time_ms as number);
  return times.length ? Math.min(...times) : null;
}

function formatClock(milliseconds?: number | null) {
  if (milliseconds == null) return "--";
  const totalTenths = Math.floor(milliseconds / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CP";
}
