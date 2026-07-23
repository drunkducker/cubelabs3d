import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { ChevronRightIcon, CubeIcon, GamepadIcon, PlayIcon, TrophyIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "My Arcade | Cube Lab 3D",
  description: "The Cube Labs owner arcade for playable cubes, challenge modes, and original game ideas.",
};

type ArcadeGame = {
  title: string;
  body: string;
  status: string;
  href?: string;
  action?: string;
  accent: string;
  stat: string;
};

const liveGames: ArcadeGame[] = [
  {
    title: "Daily 3x3 Challenge",
    body: "Load the daily scramble, track time and moves, save the attempt, and send it to another Cube Labs account.",
    status: "Live",
    href: "/leaderboard/3x3/play",
    action: "Start challenge",
    accent: "#f5b942",
    stat: "Ranked lane",
  },
  {
    title: "3x3 Free Play",
    body: "Mobile-first cube play with scramble, timer, undo, touch turns, button moves, and save/send controls.",
    status: "Live",
    href: "/play/3x3",
    action: "Play 3x3",
    accent: "#2ea6ff",
    stat: "Tracked play",
  },
  {
    title: "4x4 Cube Lab",
    body: "The larger cube playground for testing movement, view placement, and future challenge modes.",
    status: "Live",
    href: "/play/4x4",
    action: "Open 4x4",
    accent: "#34d058",
    stat: "Big cube",
  },
  {
    title: "10x10 Engine Test",
    body: "A stress room for Cube Labs NxN rendering and interaction work before it becomes a polished public mode.",
    status: "Test",
    href: "/play/10x10",
    action: "Open test",
    accent: "#8b5cf6",
    stat: "Engine lab",
  },
];

const ownerGames: ArcadeGame[] = [
  {
    title: "Chameleon Loop",
    body: "Conveyor puzzle concept with silly defense timing and color-changing lanes.",
    status: "Owner idea",
    accent: "#22c55e",
    stat: "Next shelf",
  },
  {
    title: "Hungry Hole",
    body: "A 3D hole that eats houses, buses, props, and anything else the arcade throws at it.",
    status: "Owner idea",
    accent: "#f97316",
    stat: "Prototype target",
  },
  {
    title: "Mouse Hunt: Lights Out",
    body: "Small mobile game slot for the single-file arcade experiments to graduate into Cube Labs.",
    status: "Owner idea",
    accent: "#64748b",
    stat: "Mobile slot",
  },
  {
    title: "Duck Shoot Deluxe",
    body: "Canvas arcade lane for the older desktop game artifact if you decide to bring it into the site.",
    status: "Owner idea",
    accent: "#0ea5e9",
    stat: "Archive slot",
  },
];

export default function MyArcadePage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <SiteHeader />
        <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
          Back to home
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.55)]">
          <ArcadeBackdrop />
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--purple)]">Owner Arcade</p>
            <h1 className="mt-2 text-[46px] font-black leading-[.9] text-white">
              My
              <br />
              Arcade
            </h1>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Cube Labs can be more than solvers. This is the home-page doorway into your playable cubes, challenge modes, and original game shelf.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link href="/leaderboard/3x3/play" className="cta-purple grid min-h-11 place-items-center rounded-[8px] text-sm font-black text-white">
                Start Challenge
              </Link>
              <Link href="/news" className="grid min-h-11 place-items-center rounded-[8px] border border-[var(--border-2)] bg-black/20 text-sm font-black text-white">
                Site News
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Playable" value="4" helper="now" />
          <Metric label="Ideas" value="4" helper="shelf" />
          <Metric label="Owner" value="1" helper="site" />
        </section>

        <section className="mt-5">
          <SectionHeader eyebrow="Ready now" title="Playable Cube Rooms" />
          <div className="mt-3 grid gap-3">
            {liveGames.map((game) => (
              <ArcadeCard key={game.title} game={game} live />
            ))}
          </div>
        </section>

        <section id="coming-next" className="mt-5">
          <SectionHeader eyebrow="Coming next" title="Original Arcade Shelf" />
          <div className="mt-3 grid gap-3">
            {ownerGames.map((game) => (
              <ArcadeCard key={game.title} game={game} />
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[8px] border border-[rgba(139,92,246,.28)] bg-[rgba(139,92,246,.08)] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[rgba(139,92,246,.16)] text-[var(--purple)]">
              <GamepadIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-white">Why this page exists</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Because it is your site. The homepage can stay clean while My Arcade holds cube games, challenge modes, and the personal game ideas you want to grow later.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ArcadeCard({ game, live }: { game: ArcadeGame; live?: boolean }) {
  const content = (
    <article className="rounded-[8px] border border-[var(--border)] bg-[#070b14] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
      <div className="flex items-start gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] border text-white"
          style={{ borderColor: `${game.accent}66`, background: `${game.accent}22` }}
        >
          {live ? <PlayIcon className="h-5 w-5" /> : <GamepadIcon className="h-6 w-6" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: game.accent }}>
              {game.status}
            </span>
            <span className="shrink-0 rounded-full border border-white/[.08] bg-white/[.04] px-2 py-1 text-[10px] font-black text-[var(--muted)]">
              {game.stat}
            </span>
          </span>
          <span className="mt-1 block text-[19px] font-black leading-tight text-white">{game.title}</span>
          <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{game.body}</span>
          {game.action ? (
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-white">
              {game.action}
              <ChevronRightIcon className="h-4 w-4" />
            </span>
          ) : (
            <span className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[var(--faint)]">
              Waiting on build pass
            </span>
          )}
        </span>
      </div>
    </article>
  );

  if (!game.href) return content;

  return (
    <Link href={game.href} className="block transition-transform active:scale-[.99]">
      {content}
    </Link>
  );
}

function ArcadeBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className="absolute right-[-18px] top-[-18px] grid h-36 w-36 rotate-12 grid-cols-3 gap-1 opacity-80">
        {["#f4f6f8", "#e6352b", "#ffd21f", "#1667e0", "#34d058", "#f97316", "#8b5cf6", "#2ea6ff", "#f4f6f8"].map((color, index) => (
          <span key={`${color}-${index}`} className="rounded-[4px] border border-black/30" style={{ background: color }} />
        ))}
      </div>
      <div className="absolute bottom-[-30px] left-[-34px] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,.26),transparent_66%)]" />
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-white/[.035] p-3 text-center">
      <p className="text-[22px] font-black leading-none text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-[10px] font-semibold text-[var(--faint)]">{helper}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="px-1">
      <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--blue)]">{eyebrow}</p>
      <h2 className="mt-1 text-[22px] font-black text-white">{title}</h2>
    </div>
  );
}
