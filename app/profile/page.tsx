/* ==========================================================================
   PROFILE PAGE
   Mobile-first Cube ID dashboard. The visible layout mirrors the approved
   profile mock while keeping Supabase reads isolated at the top of the page so
   the production services can replace them after the layout is approved.
   ========================================================================== */
import type { ReactNode, SVGProps } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getProfileDashboard,
  previewAchievements,
  previewCubes,
  previewSolves,
  type ProfileAchievement as Achievement,
  type ProfileChallenge as Challenge,
  type ProfileCollectionItem as CollectionItem,
  type ProfileProfile as Profile,
  type ProfileSuggestion as Suggestion,
  type ProfileSolve as Solve,
} from "@/app/lib/profile-service";
import { declineChallenge } from "@/app/profile/challenges/actions";
import {
  BookIcon,
  ChevronRightIcon,
  CubeIcon,
  PencilIcon,
  TrophyIcon,
  UserIcon,
} from "@/components/icons";

type IconProps = SVGProps<SVGSVGElement>;

const profileNav = [
  { label: "My Cubes", href: "/profile/collection", tone: "purple", icon: CubeWireIcon },
  { label: "Solve History", href: "/profile/solves", tone: "blue", icon: ClockIcon },
  { label: "Challenges", href: "/profile/challenges", tone: "purple", icon: ShieldCheckIcon },
  { label: "Friends", href: "/profile/friends", tone: "blue", icon: UsersIcon },
  { label: "Stats", href: "/leaderboard", tone: "rainbow", icon: BarsIcon },
  { label: "Achievements", href: "/profile/achievements", tone: "purple", icon: HexIcon },
];

export default async function ProfilePage() {
  let dashboard;
  try {
    dashboard = await getProfileDashboard();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Sign in required.") redirect("/auth");
    redirect("/auth/email?error=Your%20session%20expired.%20Please%20log%20in%20again.");
  }

  const { profile, solves, stats, collection, achievements, challenges, suggestions, rank } = dashboard;
  const displayName = profile?.display_name || profile?.username || "Cube Master";
  const username = profile?.username || profile?.public_slug || "cube_master_3d";
  const bio = profile?.bio || "Speed solver. Puzzle lover. Always improving.";
  const displaySolves = solves.length ? solves.slice(0, 4) : previewSolves;
  const favoriteCubes = collection.length ? collection.slice(0, 3) : previewCubes;
  const totalSolves = stats?.total_solves ?? displaySolves.length;
  const best3x3 = readMetric(stats?.best_times, "3x3") ?? bestTime(displaySolves, "3x3") ?? 12340;
  const average3x3 = readMetric(stats?.averages, "3x3") ?? averageTime(displaySolves, "3x3") ?? 28470;
  const currentStreak = stats?.current_streak ?? 14;
  const publicRank = rank.rank ? `#${formatNumber(rank.rank)}` : "--";
  const publicRankHelper = rank.rank && rank.percentile ? `Top ${rank.percentile}%` : rank.total ? `${formatNumber(rank.total)} ranked` : "Play ranked 3x3";
  const memberSince = formatMemberSince(profile?.created_at);
  const location = profile?.region || profile?.country_code ? formatLocation(profile) : "Georgia, USA";
  const profileUrl = `cubelabs3d.vercel.app${profile?.public_slug ? `/u/${profile.public_slug}` : ""}`;
  const activeChallenge = challenges.find((challenge) => ["open", "pending", "accepted"].includes(challenge.status)) ?? challenges[0];

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-[18px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <ProfileHeader />

        <section className="relative overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-4 shadow-[0_18px_46px_rgba(0,0,0,.55)]">
          <HeroBlocks />
          <Link
            href="/profile/settings"
            aria-label="Edit profile"
            className="absolute bottom-4 left-[116px] z-[2] grid h-10 w-10 place-items-center rounded-full border border-[var(--border-2)] bg-[#121722] text-white shadow-[0_0_18px_rgba(139,92,246,.35)]"
          >
            <PencilIcon className="h-5 w-5" />
          </Link>
          <Link
            href="/profile/settings"
            aria-label="Open profile settings"
            className="absolute right-4 top-1/2 z-[2] grid h-10 w-10 -translate-y-1/2 place-items-center text-white"
          >
            <ChevronRightIcon className="h-7 w-7" />
          </Link>

          <div className="relative z-[1] grid grid-cols-[150px_1fr] gap-4">
            <div className="grid place-items-center pt-3">
              <div className="relative grid h-[118px] w-[118px] place-items-center rounded-full bg-[conic-gradient(from_220deg,var(--blue),var(--purple),#d946ef,var(--blue))] p-[3px] shadow-[0_0_30px_rgba(139,92,246,.32)]">
                <div className="grid h-full w-full place-items-center rounded-full bg-[#050813]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <MiniCube grid={3} size={74} palette={cubePalette} />
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-0 py-5 pr-8">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-[25px] font-black leading-tight text-white">{displayName}</h1>
                <ProBadge>PRO</ProBadge>
              </div>
              <p className="mt-1 truncate text-[15px] font-semibold text-slate-400">@{username}</p>
              <p className="mt-3 text-[14px] font-semibold leading-5 text-white">{bio}</p>
            </div>
          </div>

          <div className="relative z-[1] mt-4 grid grid-cols-3 gap-3 text-[11px] font-semibold text-slate-300">
            <InfoChip icon={CalendarIcon} label="Member Since" value={memberSince} />
            <InfoChip icon={PinIcon} label="Location" value={location} />
            <InfoChip icon={GlobeIcon} label="Profile" value={profileUrl} />
          </div>
        </section>

        <section aria-label="Profile stats" className="mt-4 overflow-x-auto pb-1">
          <div className="grid min-w-[670px] grid-cols-5 gap-1">
            <StatCard icon={LightningIcon} value={formatNumber(totalSolves || 1247)} label="Total Solves" helper={totalSolves ? "+ tracked account" : "+18 this week"} tone="blue" />
            <StatCard icon={ClockIcon} value={formatClock(average3x3)} label="Avg Solve Time" helper="3x3" tone="blue" />
            <StatCard icon={TrophyIcon} value={formatClock(best3x3)} label="Best Time" helper="3x3" tone="gold" />
            <StatCard icon={FireIcon} value={String(currentStreak)} label="Current Streak" helper="days" tone="red" />
            <StatCard icon={TrendIcon} value={publicRank} label="Global Rank" helper={publicRankHelper} tone="green" />
          </div>
        </section>

        <section aria-label="Profile sections" className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] px-2 py-3">
          <div className="grid grid-cols-6 gap-1">
            {profileNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} className="grid min-w-0 justify-items-center gap-2 rounded-[8px] px-1 py-2 text-center">
                  <Icon className={`h-7 w-7 ${toneClass(item.tone)}`} />
                  <span className="max-w-full truncate text-[10px] font-semibold text-white">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <DashboardSection title="Recent Solves" href="/profile/solves" action="View All">
          <div className="divide-y divide-white/[.06]">
            {displaySolves.map((solve) => (
              <RecentSolveRow key={solve.id} solve={solve} />
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="Favorite Cubes" href="/profile/collection" action="Manage">
          <div className="grid grid-cols-3 gap-3">
            {favoriteCubes.map((cube) => (
              <CubeShelfCard key={cube.id} cube={cube} />
            ))}
          </div>
          <Link
            href="/profile/collection"
            className="mt-3 flex items-center justify-between rounded-[8px] border border-[var(--border)] bg-white/[.035] px-4 py-3 text-[15px] font-semibold text-white"
          >
            <span className="flex items-center gap-3">
              <CubeIcon className="h-5 w-5 text-slate-300" />
              View All Cubes
            </span>
            <ChevronRightIcon className="h-5 w-5 text-slate-400" />
          </Link>
        </DashboardSection>

        <DashboardSection title="Achievements" href="/profile/achievements" action="View All">
          <div className="grid grid-cols-5 gap-2">
            {(achievements.length ? achievements.slice(0, 5).map(toAchievementCard) : previewAchievements).map((achievement) => (
              <AchievementBadge key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="Challenges & Invites" href="/profile/challenges" action="View All">
          <ChallengeInvite challenge={activeChallenge} />
        </DashboardSection>

        <DashboardSection title="People To Challenge" href="/profile/friends" action="Find More">
          {suggestions.length ? (
            <div className="grid gap-3">
              {suggestions.slice(0, 3).map((suggestion) => (
                <SuggestionRow key={suggestion.user_id} suggestion={suggestion} />
              ))}
            </div>
          ) : (
            <div className="rounded-[8px] border border-dashed border-[var(--border-2)] bg-black/20 p-4 text-sm leading-6 text-[var(--muted)]">
              Play a ranked solve to unlock smarter friend suggestions based on times, scrambles, and puzzle type.
            </div>
          )}
        </DashboardSection>

        <ProfileBottomNav />
      </div>
    </main>
  );
}

function ProfileHeader() {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <Link href="/" className="flex min-w-0 flex-1 items-center gap-2" aria-label="Cube Lab 3D home">
        <LogoCube />
        <span className="truncate text-[20px] font-black italic leading-none tracking-wide">
          CUBE LAB <span className="accent-text">3D</span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/profile/mail"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full text-[var(--text)]"
        >
          <BellIcon className="h-6 w-6" />
          <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--purple)] px-1 text-[10px] font-black text-white">
            3
          </span>
        </Link>
        <Link
          href="/profile/settings"
          aria-label="Profile menu"
          className="grid h-10 w-10 place-items-center rounded-full text-[var(--text)]"
        >
          <span className="space-y-[6px]">
            <span className="block h-[2px] w-7 rounded-full bg-current" />
            <span className="block h-[2px] w-7 rounded-full bg-current" />
            <span className="block h-[2px] w-7 rounded-full bg-current" />
          </span>
        </Link>
      </div>
    </header>
  );
}

function HeroBlocks() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(139,92,246,.34),transparent_30%),radial-gradient(circle_at_82%_70%,rgba(46,166,255,.28),transparent_36%),linear-gradient(110deg,rgba(5,8,19,.98),rgba(5,8,19,.74)_52%,rgba(5,8,19,.18))]" />
      <div className="absolute right-[-10px] top-2 h-28 w-28 rotate-45 rounded-[8px] border border-[rgba(139,92,246,.34)] bg-[rgba(139,92,246,.12)] shadow-[0_0_32px_rgba(139,92,246,.28)]" />
      <div className="absolute right-20 top-16 h-20 w-20 rotate-45 rounded-[8px] border border-[rgba(139,92,246,.32)] bg-[rgba(139,92,246,.1)] shadow-[0_0_28px_rgba(139,92,246,.24)]" />
      <div className="absolute bottom-5 right-10 h-24 w-24 rotate-45 rounded-[8px] border border-[rgba(46,166,255,.34)] bg-[rgba(46,166,255,.12)] shadow-[0_0_34px_rgba(46,166,255,.3)]" />
      <div className="absolute right-4 top-28 h-[2px] w-24 rotate-[-26deg] bg-[linear-gradient(90deg,transparent,rgba(46,166,255,.85),transparent)]" />
    </div>
  );
}

function InfoChip({ icon: Icon, label, value }: { icon: (props: IconProps) => JSX.Element; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[20px_1fr] items-center gap-2">
      <Icon className="h-5 w-5 text-slate-300" />
      <span className="min-w-0">
        <span className="block text-[10px] leading-none text-slate-400">{label}</span>
        <span className="mt-1 block truncate text-[12px] leading-tight text-white">{value}</span>
      </span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  helper,
  tone,
}: {
  icon: (props: IconProps) => JSX.Element;
  value: string;
  label: string;
  helper: string;
  tone: string;
}) {
  return (
    <article className="min-h-[94px] rounded-[8px] border border-[var(--border)] bg-white/[.04] px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
      <Icon className={`mx-auto h-7 w-7 ${toneClass(tone)}`} />
      <p className="mt-2 text-[24px] font-black leading-none text-white">{value}</p>
      <p className="mt-2 text-[12px] font-semibold leading-tight text-slate-300">{label}</p>
      <p className={`mt-1 text-[11px] font-black ${toneClass(tone)}`}>{helper}</p>
    </article>
  );
}

function DashboardSection({ title, href, action, children }: { title: string; href: string; action: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4 shadow-[0_18px_46px_rgba(0,0,0,.38)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-black text-white">{title}</h2>
        <Link href={href} className="text-[13px] font-black text-[var(--purple)]">
          {action}
        </Link>
      </div>
      {children}
    </section>
  );
}

function RecentSolveRow({ solve }: { solve: Solve }) {
  const tone = puzzleTone(solve.puzzle_type);
  return (
    <Link href="/profile/solves" className="grid grid-cols-[56px_1fr_auto_18px] items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`grid h-11 place-items-center rounded-[8px] text-[16px] font-black ${tone.badge}`}>
        {solve.puzzle_type}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-mono text-[16px] font-semibold tracking-wide text-white">
          {solve.scramble || "Saved solve"}
        </span>
        <span className="mt-1 block truncate text-[12px] font-semibold text-slate-500">
          {formatSolveDate(solve.created_at)}
        </span>
      </span>
      <span className={`font-mono text-[17px] font-black ${tone.text}`}>
        {solve.is_dnf ? "DNF" : formatClock(solve.solve_time_ms)}
      </span>
      <ChevronRightIcon className="h-5 w-5 text-slate-500" />
    </Link>
  );
}

function CubeShelfCard({ cube }: { cube: CollectionItem }) {
  const grid = Number.parseInt(cube.puzzle_type, 10) || 3;
  return (
    <Link href="/profile/collection" className="min-w-0 rounded-[8px] border border-[var(--border)] bg-white/[.04] p-3">
      {cube.image_url ? (
        <img src={cube.image_url} alt="" className="mx-auto h-[54px] w-[54px] rounded-[8px] object-cover" />
      ) : (
        <MiniCube grid={Math.min(Math.max(grid, 2), 4)} size={54} palette={cube.puzzle_type === "2x2" ? pocketPalette : cubePalette} />
      )}
      <p className={`mt-2 text-[16px] font-black ${puzzleTone(cube.puzzle_type).text}`}>{cube.puzzle_type}</p>
      <p className="truncate text-[11px] font-semibold text-white">{cube.model}</p>
      <p className="truncate text-[11px] font-semibold text-slate-400">{cube.nickname || cube.brand || "Main"}</p>
    </Link>
  );
}

function AchievementBadge({ achievement }: { achievement: { id: string; name: string; icon: string | null; date: string; tone: string } }) {
  return (
    <Link href="/profile/achievements" className="min-w-0 text-center">
      <span className={`mx-auto grid h-[58px] w-[58px] place-items-center rounded-[18px] border bg-black/20 ${badgeTone(achievement.tone)}`}>
        <AchievementIcon name={achievement.icon} className="h-8 w-8" />
      </span>
      <span className="mt-2 block truncate text-[11px] font-semibold text-white">{achievement.name}</span>
      <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{achievement.date}</span>
    </Link>
  );
}

function ChallengeInvite({ challenge }: { challenge?: Challenge }) {
  const time = challenge ? formatClock(challenge.creator_time_ms ?? challenge.sender_time_ms) : "Beat my time!";
  const scramble = challenge?.scramble || "R U R' U' F R F'";

  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-white/[.04] p-4">
      <div className="grid grid-cols-[52px_1fr] gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[conic-gradient(from_220deg,var(--blue),var(--purple),var(--blue))] p-[2px]">
          <span className="grid h-full w-full place-items-center rounded-full bg-[#111827] text-[18px] font-black">SN</span>
        </span>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-400">{challenge ? "Active challenge" : "Challenge from"}</p>
              <p className="truncate text-[14px] font-black text-white">{challenge ? `${challenge.puzzle_type} challenge` : "SpeedCubeNinja"}</p>
            </div>
            <span className="shrink-0 text-[12px] font-black text-[var(--gold)]">Prize: 50 XP</span>
          </div>
          <p className="mt-1 text-[14px] font-semibold text-white">
            {challenge?.message || `${challenge?.puzzle_type || "3x3"} - ${time}`}
          </p>
          <p className="mt-1 truncate font-mono text-[12px] text-slate-500">{scramble}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 pl-[64px]">
        {challenge ? (
          <form action={declineChallenge}>
            <input type="hidden" name="challenge_id" value={challenge.id} />
            <button className="min-h-10 w-full rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[14px] font-semibold text-slate-300">
              Decline
            </button>
          </form>
        ) : (
          <button type="button" disabled className="min-h-10 rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[14px] font-semibold text-slate-500">
            Decline
          </button>
        )}
        <Link href={challenge ? `/challenge/${challenge.id}` : "/leaderboard/3x3/play"} className="cta-purple grid min-h-10 place-items-center rounded-[8px] text-[14px] font-black text-white">
          Accept
        </Link>
      </div>
    </article>
  );
}

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const profile = suggestion.profile;
  const name = profile.display_name || profile.username || profile.cube_tag || "Cube Player";
  const handle = profile.cube_tag || profile.username || profile.public_slug || suggestion.user_id.slice(0, 8);
  const challengeTarget = profile.cube_tag || profile.username || profile.public_slug || suggestion.user_id;

  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-white/[.04] p-3">
      <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[conic-gradient(from_220deg,var(--purple),var(--blue),var(--green),var(--purple))] p-[2px]">
          <span className="grid h-full w-full place-items-center rounded-full bg-[#111827] text-[13px] font-black text-white">
            {initials(name)}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-black text-white">{name}</span>
          <span className="mt-1 block truncate text-[12px] font-semibold text-slate-400">@{handle}</span>
        </span>
        <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-black text-[var(--blue)]">
          {suggestion.puzzle_type}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-5 text-white">{suggestion.reason}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href={`/leaderboard/3x3/play?recipient=${encodeURIComponent(challengeTarget)}`} className="cta-purple grid min-h-10 place-items-center rounded-[8px] text-[13px] font-black text-white">
          Challenge
        </Link>
        <Link href={profile.public_slug ? `/u/${encodeURIComponent(profile.public_slug)}` : "/profile/friends"} className="grid min-h-10 place-items-center rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[13px] font-black text-white">
          View
        </Link>
      </div>
    </article>
  );
}

function ProfileBottomNav() {
  const nav = [
    { label: "Home", href: "/", icon: CubeIcon },
    { label: "Solvers", href: "/solve", icon: GridIcon },
    { label: "Play", href: "/play/3x3", icon: CubeWireIcon },
    { label: "Learn", href: "/learn", icon: BookIcon },
    { label: "Profile", href: "/profile", icon: UserIcon },
  ];

  return (
    <nav className="sticky bottom-0 -mx-4 mt-3 rounded-t-[12px] border border-[var(--border)] bg-[rgba(5,7,13,.88)] px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_40px_rgba(0,0,0,.5)] backdrop-blur-xl">
      <div className="grid grid-cols-5 items-end gap-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.label === "Profile";
          const play = item.label === "Play";
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "relative flex min-w-0 flex-col items-center gap-1 rounded-[8px] px-1 py-1.5 text-[11px] font-semibold",
                active ? "text-[var(--purple)]" : "text-slate-400",
              ].join(" ")}
            >
              {play ? (
                <span className="absolute -top-7 grid h-16 w-16 place-items-center rounded-full bg-[radial-gradient(circle,rgba(46,166,255,.62),rgba(139,92,246,.42)_48%,transparent_72%)] text-white shadow-[0_0_28px_rgba(139,92,246,.45)]">
                  <Icon className="h-9 w-9" />
                </span>
              ) : (
                <Icon className="relative h-6 w-6" />
              )}
              <span className={play ? "relative pt-8" : "relative"}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ProBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-[8px] bg-[linear-gradient(95deg,#7c3aed,var(--purple),#c026d3)] px-2 py-1 text-[11px] font-black text-white">{children}</span>;
}

function LogoCube() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-[40px] w-[40px] flex-none">
      <polygon points="24,3 43,13 24,23 5,13" fill="#f4f6f8" />
      <polygon points="5,13 24,23 24,45 5,35" fill="#1667e0" />
      <polygon points="24,23 43,13 43,35 24,45" fill="#e6352b" />
      <polygon points="24,3 33,8 14,18 5,13" fill="#ffd21f" />
      <path d="M5 13 24 23 43 13M24 23v22" stroke="rgba(0,0,0,.45)" strokeWidth="2" />
    </svg>
  );
}

function MiniCube({ grid, size, palette }: { grid: number; size: number; palette: string[] }) {
  const tileCount = grid * grid;
  const cells = Array.from({ length: tileCount });
  const dimension = `${size}px`;
  return (
    <span
      aria-hidden="true"
      className="relative mx-auto block"
      style={{ width: dimension, height: dimension, perspective: `${size * 4}px` }}
    >
      <span
        className="absolute left-1/2 top-1/2 block"
        style={{
          width: dimension,
          height: dimension,
          transformStyle: "preserve-3d",
          transform: "translate(-50%, -50%) rotateX(-24deg) rotateY(-34deg)",
        }}
      >
        <CubeFace grid={grid} cells={cells} colors={palette} transform={`translateZ(${size / 2}px)`} />
        <CubeFace grid={grid} cells={cells} colors={palette.slice(1)} transform={`rotateY(90deg) translateZ(${size / 2}px)`} />
        <CubeFace grid={grid} cells={cells} colors={[palette[0], palette[4] || palette[0], palette[0]]} transform={`rotateX(90deg) translateZ(${size / 2}px)`} />
      </span>
    </span>
  );
}

function CubeFace({ grid, cells, colors, transform }: { grid: number; cells: unknown[]; colors: string[]; transform: string }) {
  return (
    <span
      className="absolute left-0 top-0 grid rounded-[8px] bg-[#070a12] p-[3px]"
      style={{
        inset: 0,
        gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${grid}, minmax(0, 1fr))`,
        gap: grid > 3 ? "2px" : "3px",
        transform,
      }}
    >
      {cells.map((_, index) => (
        <span
          key={index}
          className="rounded-[3px] shadow-[inset_0_1px_2px_rgba(255,255,255,.24),inset_0_-2px_4px_rgba(0,0,0,.35)]"
          style={{ background: colors[index % colors.length] }}
        />
      ))}
    </span>
  );
}

function AchievementIcon({ name, className }: { name: string | null; className?: string }) {
  switch (name) {
    case "timer":
    case "sub-60":
      return <ClockIcon className={className} />;
    case "zap":
      return <LightningIcon className={className} />;
    case "trophy":
      return <TrophyIcon className={className} />;
    case "cube":
    case "layers":
      return <CubeWireIcon className={className} />;
    case "fire":
      return <FireIcon className={className} />;
    case "rocket":
    default:
      return <RocketIcon className={className} />;
  }
}

function toAchievementCard(item: Achievement) {
  return {
    id: item.achievement_id,
    name: item.achievements?.name || item.achievement_id,
    icon: item.achievements?.icon || "trophy",
    date: formatShortMonth(item.unlocked_at),
    tone: achievementTone(item.achievements?.icon),
  };
}

function readMetric(metrics: Record<string, number | string | null> | undefined, key: string) {
  if (!metrics) return null;
  const value = metrics[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function bestTime(solves: Solve[], puzzle: string) {
  const times = solves
    .filter((solve) => solve.puzzle_type === puzzle && !solve.is_dnf && solve.solve_time_ms != null)
    .map((solve) => solve.solve_time_ms as number);
  return times.length ? Math.min(...times) : null;
}

function averageTime(solves: Solve[], puzzle: string) {
  const times = solves
    .filter((solve) => solve.puzzle_type === puzzle && !solve.is_dnf && solve.solve_time_ms != null)
    .map((solve) => solve.solve_time_ms as number);
  if (!times.length) return null;
  return Math.round(times.reduce((total, value) => total + value, 0) / times.length);
}

function formatClock(milliseconds?: number | null) {
  if (milliseconds == null) return "--";
  const totalHundredths = Math.max(0, Math.round(milliseconds / 10));
  const minutes = Math.floor(totalHundredths / 6000);
  const seconds = Math.floor((totalHundredths % 6000) / 100);
  const hundredths = totalHundredths % 100;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CP";
}

function formatMemberSince(createdAt?: string) {
  if (!createdAt) return "Jul 2026";
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(createdAt));
}

function formatShortMonth(createdAt: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(createdAt));
}

function formatSolveDate(createdAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function formatLocation(profile: Profile | undefined) {
  if (!profile) return "Georgia, USA";
  const parts = [profile.region, profile.country_code].filter(Boolean);
  return parts.length ? parts.join(", ") : "Georgia, USA";
}

function puzzleTone(puzzle: string) {
  if (puzzle === "2x2") return { text: "text-[var(--green)]", badge: "bg-green-500/15 text-[var(--green)]" };
  if (puzzle === "4x4") return { text: "text-[var(--purple)]", badge: "bg-purple-500/15 text-[var(--purple)]" };
  if (puzzle === "5x5") return { text: "text-[var(--gold)]", badge: "bg-yellow-500/15 text-[var(--gold)]" };
  return { text: "text-[var(--blue)]", badge: "bg-blue-500/15 text-[var(--blue)]" };
}

function toneClass(tone: string) {
  if (tone === "green") return "text-[var(--green)]";
  if (tone === "gold") return "text-[var(--gold)]";
  if (tone === "red") return "text-[#ff4d4d]";
  if (tone === "purple") return "text-[var(--purple)]";
  if (tone === "rainbow") return "text-transparent bg-[linear-gradient(90deg,var(--blue),var(--purple),var(--green))] bg-clip-text";
  return "text-[var(--blue)]";
}

function badgeTone(tone: string) {
  if (tone === "green") return "border-green-400/50 text-[var(--green)] shadow-[0_0_22px_rgba(52,208,88,.25)]";
  if (tone === "gold") return "border-yellow-400/60 text-[var(--gold)] shadow-[0_0_22px_rgba(245,185,66,.25)]";
  if (tone === "red") return "border-red-400/50 text-[#ff6b6b] shadow-[0_0_22px_rgba(239,68,68,.25)]";
  if (tone === "blue") return "border-blue-400/50 text-[var(--blue)] shadow-[0_0_22px_rgba(46,166,255,.25)]";
  return "border-purple-400/50 text-[var(--purple)] shadow-[0_0_22px_rgba(139,92,246,.25)]";
}

function achievementTone(icon?: string | null) {
  if (icon === "trophy") return "gold";
  if (icon === "timer" || icon === "zap") return "blue";
  if (icon === "cube" || icon === "layers") return "green";
  return "purple";
}

const cubePalette = ["#f8fafc", "#2563eb", "#dc2626", "#16a34a", "#facc15", "#f97316"];
const pocketPalette = ["#f8fafc", "#22c55e", "#dc2626", "#2563eb"];

const iconBase = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

function BellIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function LightningIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

function ClockIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function FireIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-7 .2 2-1 3-2.2 3C14 7 12 4 9 2c.3 4-4 6-4 11 0 5 3 9 7 9z" />
    </svg>
  );
}

function TrendIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M3 17 9 11l4 4 7-8" />
      <path d="M14 7h6v6" />
      <path d="M4 21h16" />
    </svg>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </svg>
  );
}

function PinIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M12 21s7-4.6 7-11a7 7 0 0 0-14 0c0 6.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function GlobeIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
    </svg>
  );
}

function ShieldCheckIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6z" />
      <path d="m9.5 12 1.7 1.7 3.5-4" />
    </svg>
  );
}

function UsersIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </svg>
  );
}

function BarsIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M5 20V10M12 20V4M19 20v-7M3 20h18" />
    </svg>
  );
}

function HexIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M12 2 20 6.5v11L12 22 4 17.5v-11z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CubeWireIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M12 2 4 6.5v11L12 22l8-4.5v-11z" />
      <path d="M4 6.5 12 11l8-4.5M12 11v11" />
      <path d="m8 8.8 8 4.4M16 8.8 8 13.2" />
    </svg>
  );
}

function GridIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function RocketIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z" />
      <path d="M12 15 9 12a22 22 0 0 1 8-10c1.5 1.5 3 4.5 3 9a22 22 0 0 1-8 4z" />
      <path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5" />
    </svg>
  );
}
