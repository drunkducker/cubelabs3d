import type { SVGProps } from "react";
import Link from "next/link";
import AppBottomNav from "@/components/AppBottomNav";
import { ChevronRightIcon, CubeIcon, TrophyIcon, UserIcon } from "@/components/icons";
import {
  cubePalette,
  cubeTabs,
  getLeaderboardPreview,
  type CubeLeaderboardTab,
  type LeaderboardRow,
  type LeaderboardStat,
  type PodiumPlayer,
} from "@/lib/leaderboard-preview";

type IconProps = SVGProps<SVGSVGElement>;

export default function LeaderboardPage() {
  const leaderboard = getLeaderboardPreview();

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-[18px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <LeaderboardHeader />
        <HeroPanel />
        <CubeSelector tabs={cubeTabs} />
        <FilterTabs filters={leaderboard.filters} />
        <Podium players={leaderboard.podium} />
        <LeaderTable rows={leaderboard.rows} />
        <StatsPanel stats={leaderboard.stats} />
        <ClimbCard />
        <AppBottomNav active="Leaderboard" />
      </div>
    </main>
  );
}

function LeaderboardHeader() {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <button
        type="button"
        aria-label="Open menu"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-transparent text-[var(--text)]"
      >
        <span className="space-y-[5px]">
          <span className="block h-[2px] w-6 rounded-full bg-current" />
          <span className="block h-[2px] w-6 rounded-full bg-current" />
          <span className="block h-[2px] w-6 rounded-full bg-current" />
        </span>
      </button>

      <Link href="/" className="flex min-w-0 flex-1 items-center gap-2" aria-label="Cube Lab 3D home">
        <LogoCube />
        <span className="truncate text-[17px] font-black italic leading-none tracking-wide">
          CUBE LAB <span className="accent-text">3D</span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Search"
          className="grid h-10 w-10 place-items-center rounded-full text-[var(--text)]"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full text-[var(--text)]"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-1.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--purple)] px-1 text-[10px] font-black text-white">
            3
          </span>
        </button>
        <Link
          href="/profile"
          aria-label="Profile"
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-2)] bg-black/30 shadow-[0_0_18px_rgba(46,166,255,.18)]"
        >
          <MiniCube grid={3} palette={cubePalette} compact />
        </Link>
      </div>
    </header>
  );
}

function HeroPanel() {
  return (
    <section className="relative mb-4 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] px-4 py-5 shadow-[0_18px_46px_rgba(0,0,0,.55)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(139,92,246,.3),transparent_34%),radial-gradient(circle_at_78%_72%,rgba(46,166,255,.22),transparent_38%)]" />
      <div className="absolute right-0 top-0 h-full w-[54%] opacity-90">
        <HeroShowcase />
      </div>

      <div className="relative z-[1] max-w-[58%]">
        <p className="mb-1 inline-flex rounded-full border border-[var(--purple)]/40 bg-[var(--purple)]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[1.5px] text-[var(--purple)]">
          Preview data
        </p>
        <h1 className="mt-2 bg-gradient-to-r from-fuchsia-500 via-[var(--purple)] to-[var(--blue)] bg-clip-text text-[34px] font-black italic leading-[.95] text-transparent">
          Leaderboards
        </h1>
        <p className="mt-3 text-[17px] font-semibold leading-snug text-white">
          Compete. Improve. Be the best.
        </p>
        <p className="mt-5 text-[12px] leading-relaxed text-slate-300">
          You are in the <span className="font-black text-[var(--purple)]">top 3%</span> of all cubers worldwide.
        </p>
        <Link
          href="/profile"
          className="mt-4 inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-2)] bg-white/[.04] px-4 py-3 text-[13px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
        >
          <UserIcon className="h-4 w-4" />
          View My Profile
        </Link>
      </div>
    </section>
  );
}

function HeroShowcase() {
  return (
    <div className="relative h-full">
      <div className="absolute right-[28%] top-[12%] grid h-[84px] w-[84px] place-items-center rounded-full bg-[radial-gradient(circle,rgba(245,185,66,.45),rgba(245,185,66,.05)_58%,transparent_70%)]">
        <div className="grid h-[60px] w-[60px] place-items-center rounded-full border border-[rgba(245,185,66,.45)] bg-[rgba(245,185,66,.12)] text-[var(--gold)] shadow-[0_0_32px_rgba(245,185,66,.4)]">
          <TrophyIcon className="h-9 w-9" />
        </div>
      </div>
      <div className="absolute bottom-[18%] left-[4%]">
        <div className="rounded-[10px] bg-black/25 p-2 shadow-[0_0_28px_rgba(46,166,255,.35)]">
          <MiniCube grid={3} palette={cubePalette} large />
        </div>
      </div>
      <div className="absolute bottom-[20%] right-[7%]">
        <div className="rounded-[10px] bg-black/25 p-2 shadow-[0_0_28px_rgba(139,92,246,.32)]">
          <MiniCube grid={5} palette={["#a78bfa", "#7c3aed", "#c4b5fd", "#4c1d95"]} large />
        </div>
      </div>
      <div className="absolute bottom-[7%] left-[12%] h-[2px] w-[45%] bg-[linear-gradient(90deg,transparent,rgba(46,166,255,.9),transparent)]" />
      <div className="absolute bottom-[7%] right-[5%] h-[2px] w-[45%] bg-[linear-gradient(90deg,transparent,rgba(139,92,246,.9),transparent)]" />
    </div>
  );
}

function CubeSelector({ tabs }: { tabs: CubeLeaderboardTab[] }) {
  return (
    <section aria-label="Puzzle leaderboard types" className="mb-4 overflow-x-auto pb-1">
      <div className="grid min-w-[660px] grid-cols-7 gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={`/leaderboard?cube=${tab.label.toLowerCase()}`}
            className={[
              "rounded-[8px] border px-2 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.05)]",
              tab.active
                ? "border-[var(--purple)] bg-[rgba(139,92,246,.12)] shadow-[0_0_22px_rgba(139,92,246,.25)]"
                : "border-[var(--border)] bg-white/[.04]",
            ].join(" ")}
          >
            <MiniCube grid={tab.grid} palette={tab.palette} wire={tab.wire} />
            <div className="mt-2 text-[15px] font-black leading-none text-white">{tab.label}</div>
            <div className="mt-1 text-[11px] font-semibold text-[var(--muted)]">{tab.scope}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FilterTabs({ filters }: { filters: string[] }) {
  return (
    <section className="mb-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-1">
      <div className="grid grid-cols-5 text-center">
        {filters.map((filter, index) => (
          <button
            key={filter}
            type="button"
            className={[
              "relative rounded-[6px] px-1 py-3 text-[12px] font-semibold",
              index === 0 ? "text-white" : "text-slate-400",
            ].join(" ")}
          >
            {filter}
            {index === 0 ? (
              <span className="absolute bottom-0 left-1/2 h-[2px] w-12 -translate-x-1/2 rounded-full bg-[var(--purple)] shadow-[0_0_10px_rgba(139,92,246,.8)]" />
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function Podium({ players }: { players: PodiumPlayer[] }) {
  return (
    <section aria-label="Top three preview players" className="mb-4 grid grid-cols-3 items-end gap-2">
      {players.map((player) => (
        <article
          key={player.rank}
          className={[
            "relative rounded-[8px] border bg-white/[.035] px-2 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.06)]",
            player.tone === "gold"
              ? "min-h-[154px] border-[rgba(245,185,66,.72)] shadow-[0_0_26px_rgba(245,185,66,.24)]"
              : player.tone === "silver"
                ? "min-h-[138px] border-[rgba(148,163,184,.48)]"
                : "min-h-[138px] border-[rgba(194,116,76,.5)]",
          ].join(" ")}
        >
          <RankMedal rank={player.rank} tone={player.tone} />
          <Avatar initials={player.initials} tone={player.tone} large={player.rank === 1} />
          <div className="mt-3 min-h-8">
            <p className="truncate text-[12px] font-black text-white">{player.name}</p>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="rounded bg-white/[.08] px-1.5 py-0.5 text-[9px] font-black text-slate-300">
                {player.country}
              </span>
              {player.badge ? <ProBadge>{player.badge}</ProBadge> : null}
            </div>
          </div>
          <p className={["mt-3 text-[28px] font-black leading-none", player.tone === "gold" ? "text-[var(--gold)]" : "text-white"].join(" ")}>
            {player.time}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Avg Time</p>
        </article>
      ))}
    </section>
  );
}

function LeaderTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <section className="mb-4 overflow-hidden rounded-[8px] border border-[var(--border)] bg-white/[.035]">
      <div className="grid grid-cols-[40px_1fr_82px] border-b border-[var(--border)] px-3 py-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Avg Time</span>
      </div>

      {rows.map((row) => (
        <Link
          key={row.rank}
          href={row.current ? "/profile" : `/leaderboard/player/${row.rank}`}
          className={[
            "grid grid-cols-[40px_1fr_82px] items-center border-b border-[rgba(255,255,255,.06)] px-3 py-3 last:border-b-0",
            row.current
              ? "bg-[linear-gradient(90deg,rgba(37,99,235,.22),rgba(139,92,246,.12))]"
              : "bg-transparent",
          ].join(" ")}
        >
          <span className="text-[15px] font-semibold text-slate-300">{row.rank}</span>
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={[
                "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-black text-white",
                row.current
                  ? "border border-[var(--blue)] bg-black shadow-[0_0_18px_rgba(46,166,255,.35)]"
                  : "bg-[linear-gradient(135deg,rgba(46,166,255,.45),rgba(139,92,246,.45))]",
              ].join(" ")}
            >
              {row.current ? <MiniCube grid={3} palette={cubePalette} compact /> : row.avatar}
            </span>
            <span className="min-w-0">
              <span className={["block truncate text-[14px] font-black", row.current ? "text-[var(--blue)]" : "text-white"].join(" ")}>
                {row.name} <span className="text-[10px] text-slate-400">{row.country}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                {row.note}
                {row.badge ? <ProBadge>{row.badge}</ProBadge> : null}
              </span>
            </span>
          </span>
          <span className="flex items-center justify-end gap-2">
            <span className={["text-[16px] font-black", row.current || row.rank === 4 ? "text-[var(--green)]" : "text-white"].join(" ")}>
              {row.time}
            </span>
            <ChevronRightIcon className="h-4 w-4 text-slate-500" />
          </span>
        </Link>
      ))}
    </section>
  );
}

function StatsPanel({ stats }: { stats: LeaderboardStat[] }) {
  return (
    <section className="mb-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-black text-white">Your 3x3 Stats</h2>
        <Link href="/profile" className="text-[12px] font-black text-[var(--purple)]">
          View All Stats
        </Link>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[560px] grid-cols-5 gap-2">
          {stats.map((stat) => (
            <article key={stat.label} className="rounded-[8px] border border-[var(--border)] bg-black/20 px-2 py-3 text-center">
              <p className="text-[11px] font-semibold text-slate-400">{stat.label}</p>
              <p className="mt-2 text-[22px] font-black leading-none text-white">{stat.value}</p>
              <p className={["mt-2 text-[11px] font-black", stat.tone].join(" ")}>{stat.helper}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClimbCard() {
  return (
    <section className="mb-4 rounded-[8px] border border-[rgba(139,92,246,.35)] bg-[linear-gradient(110deg,rgba(139,92,246,.18),rgba(37,99,235,.12))] p-4 shadow-[0_0_28px_rgba(139,92,246,.12)]">
      <div className="grid grid-cols-[58px_1fr] gap-3 min-[390px]:grid-cols-[64px_1fr_auto] min-[390px]:items-center">
        <div className="grid h-14 w-14 place-items-center rounded-[8px] bg-[rgba(245,185,66,.12)] text-[var(--gold)] shadow-[0_0_22px_rgba(245,185,66,.22)]">
          <TrophyIcon className="h-9 w-9" />
        </div>
        <div>
          <h2 className="text-[17px] font-black text-white">Climb the ranks!</h2>
          <p className="mt-1 text-[13px] leading-snug text-slate-300">
            Solve more and improve your average time to move up the leaderboard.
          </p>
        </div>
        <Link
          href="/solve"
          className="col-span-2 mt-4 inline-flex items-center justify-center gap-2 rounded-[8px] bg-[linear-gradient(95deg,var(--purple),var(--blue-2))] px-5 py-3 text-[15px] font-black text-white shadow-[0_0_24px_rgba(139,92,246,.35)] min-[390px]:col-span-1 min-[390px]:mt-0"
        >
          Start Solving
          <CubeIcon className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

function MiniCube({
  grid,
  palette,
  wire,
  compact,
  large,
}: {
  grid: number;
  palette: string[];
  wire?: boolean;
  compact?: boolean;
  large?: boolean;
}) {
  const sizeClass = compact ? "h-6 w-6" : large ? "h-14 w-14" : "h-12 w-12";
  const stickers = Array.from({ length: grid * grid }, (_, index) => palette[index % palette.length]);

  if (wire) {
    return (
      <span
        className={[
          "mx-auto block rounded-[6px] border border-slate-500/80 bg-[linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,0))] opacity-90",
          sizeClass,
        ].join(" ")}
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,.45) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.45) 1px, transparent 1px)",
          backgroundSize: "25% 25%",
        }}
      />
    );
  }

  return (
    <span
      className={["mx-auto grid rotate-[-14deg] gap-[2px] rounded-[7px] bg-black/80 p-[3px] shadow-[0_7px_14px_rgba(0,0,0,.35)]", sizeClass].join(" ")}
      style={{ gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))` }}
    >
      {stickers.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className="rounded-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,.5)]"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

function RankMedal({ rank, tone }: { rank: number; tone: PodiumPlayer["tone"] }) {
  const toneClass =
    tone === "gold"
      ? "border-[rgba(245,185,66,.8)] bg-[linear-gradient(135deg,#ffe08a,#b7791f)] text-[#241505]"
      : tone === "silver"
        ? "border-slate-300/80 bg-[linear-gradient(135deg,#e2e8f0,#64748b)] text-[#0f172a]"
        : "border-orange-300/70 bg-[linear-gradient(135deg,#f6ad55,#7c2d12)] text-[#241005]";

  return (
    <span className={["absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full border text-[17px] font-black shadow-[0_0_18px_rgba(255,255,255,.16)]", toneClass].join(" ")}>
      {rank}
    </span>
  );
}

function Avatar({
  initials,
  tone,
  large,
}: {
  initials: string;
  tone: PodiumPlayer["tone"];
  large?: boolean;
}) {
  const ring =
    tone === "gold"
      ? "from-[var(--gold)] to-[var(--purple)]"
      : tone === "silver"
        ? "from-[var(--blue)] to-[var(--purple)]"
        : "from-orange-400 to-[var(--blue)]";

  return (
    <div
      className={[
        "mx-auto mt-5 rounded-full bg-gradient-to-br p-[2px]",
        ring,
        large ? "h-[70px] w-[70px]" : "h-[62px] w-[62px]",
      ].join(" ")}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-[#101522] text-[14px] font-black text-white shadow-[inset_0_0_18px_rgba(255,255,255,.08)]">
        {initials}
      </div>
    </div>
  );
}

function ProBadge({ children }: { children: string }) {
  return (
    <span className="rounded bg-[linear-gradient(90deg,var(--purple),#a855f7)] px-1.5 py-0.5 text-[9px] font-black text-white shadow-[0_0_12px_rgba(139,92,246,.35)]">
      {children}
    </span>
  );
}

function LogoCube() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8 shrink-0">
      <polygon points="24,3 43,13 24,23 5,13" fill="#f4f6f8" />
      <polygon points="5,13 24,23 24,45 5,35" fill="#1667e0" />
      <polygon points="24,23 43,13 43,35 24,45" fill="#e6352b" />
      <polygon points="24,3 33,8 14,18 5,13" fill="#ffd21f" />
    </svg>
  );
}

const iconBase = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

function SearchIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

function BellIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}
