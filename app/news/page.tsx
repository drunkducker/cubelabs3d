import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { BookIcon, ChevronRightIcon, CubeIcon, GamepadIcon, TrophyIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Cube Labs News | Cube Lab 3D",
  description: "Cube Labs updates, cube news, reviews, videos, and owner notes.",
};

type NewsItem = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  meta: string;
  href: string;
  action: string;
  accent: string;
};

type MiniItem = {
  id: string;
  title: string;
  meta: string;
  accent: string;
};

const siteUpdates: NewsItem[] = [
  {
    id: "profile-social",
    eyebrow: "Site update",
    title: "Profile is becoming a real Cube ID hub",
    body: "Friends, player suggestions, achievements, challenge shortcuts, settings, export requests, and account closure controls are now part of the profile branch.",
    meta: "Today",
    href: "/profile",
    action: "Open profile",
    accent: "#8b5cf6",
  },
  {
    id: "tracked-challenge",
    eyebrow: "Challenge lab",
    title: "Tracked 3x3 challenge flow is the main competitive lane",
    body: "Players can load a scramble, track time and moves, save results, and send the same scramble to another Cube Labs account.",
    meta: "Latest branch",
    href: "/leaderboard/3x3/play",
    action: "Start challenge",
    accent: "#f5b942",
  },
  {
    id: "solver-memory",
    eyebrow: "Account feature",
    title: "Solver memory is ready for signed-in cube history",
    body: "The database and API foundation are in place so solver pages can remember previous cubes, scrambles, solutions, and resume points.",
    meta: "In wiring",
    href: "/solve",
    action: "View solvers",
    accent: "#2ea6ff",
  },
];

const cubeNews: MiniItem[] = [
  { id: "gan-15", title: "GAN 15 MagLev release notes and review queue", meta: "Cube watch", accent: "#0ea5e9" },
  { id: "world-record", title: "New 3x3 world-record lane to track on launch", meta: "Speedcubing", accent: "#34d058" },
  { id: "core-tech", title: "Core magnets, auto-alignment, and what buyers should know", meta: "Explainer", accent: "#8b5cf6" },
  { id: "buyers-guide", title: "Budget cube picks for beginners, kids, and serious practice", meta: "Review desk", accent: "#f5b942" },
];

const videos: MiniItem[] = [
  { id: "f2l-video", title: "F2L tricks worth turning into a Learn path", meta: "Video queue", accent: "#22c55e" },
  { id: "cfop-video", title: "CFOP full tutorial playlist planning", meta: "Learning", accent: "#eab308" },
  { id: "solve-clip", title: "Fast solve clips for homepage/news embeds", meta: "Shorts", accent: "#f43f5e" },
];

export default function NewsPage() {
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
          <div className="absolute right-[-26px] top-[-20px] h-36 w-36 rotate-45 rounded-[8px] border border-[rgba(52,208,88,.25)] bg-[rgba(52,208,88,.1)]" />
          <div className="absolute bottom-[-30px] left-[-36px] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(46,166,255,.26),transparent_66%)]" />
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--green)]">Cube Labs News</p>
            <h1 className="mt-2 text-[42px] font-black leading-[.95] text-white">
              News,
              <br />
              reviews,
              <br />
              updates.
            </h1>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              A real home for Cube Labs updates, cube releases, review notes, video picks, and the stuff you want on your own site.
            </p>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Site" value="3" helper="updates" />
          <Metric label="Reviews" value="4" helper="queued" />
          <Metric label="Videos" value="3" helper="picked" />
        </section>

        <section className="mt-5">
          <SectionTitle title="Latest From Cube Labs" href="/my-arcade" action="My Arcade" />
          <div className="mt-3 grid gap-3">
            {siteUpdates.map((item, index) => (
              <NewsCard key={item.id} item={item} featured={index === 0} />
            ))}
          </div>
        </section>

        <section id="reviews" className="mt-5 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
          <SectionTitle title="Cube News & Reviews" href="/solve" action="Solvers" tight />
          <div className="mt-3 grid gap-2">
            {cubeNews.map((item) => (
              <MiniNewsRow key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section id="videos" className="mt-5 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
          <SectionTitle title="Video Queue" href="/cube-notation" action="Notation" tight />
          <div className="mt-3 grid gap-2">
            {videos.map((item) => (
              <MiniNewsRow key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[8px] border border-[rgba(46,166,255,.28)] bg-[rgba(46,166,255,.08)] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[rgba(46,166,255,.16)] text-[var(--blue)]">
              <BookIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-white">Owner notes belong here too</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                This page can hold cube industry news, Cube Labs build notes, affiliate review content, and personal project announcements without crowding the homepage.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NewsCard({ item, featured }: { item: NewsItem; featured?: boolean }) {
  return (
    <Link
      id={item.id}
      href={item.href}
      className={[
        "block rounded-[8px] border bg-[#070b14] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] transition-transform active:scale-[.99]",
        featured ? "border-[rgba(139,92,246,.45)]" : "border-[var(--border)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] border text-white"
          style={{ borderColor: `${item.accent}66`, background: `${item.accent}22` }}
        >
          {featured ? <TrophyIcon className="h-6 w-6" /> : <CubeIcon className="h-6 w-6" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: item.accent }}>
              {item.eyebrow}
            </span>
            <span className="shrink-0 text-[11px] font-bold text-[var(--faint)]">{item.meta}</span>
          </span>
          <span className="mt-1 block text-[18px] font-black leading-tight text-white">{item.title}</span>
          <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{item.body}</span>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-white">
            {item.action}
            <ChevronRightIcon className="h-4 w-4" />
          </span>
        </span>
      </div>
    </Link>
  );
}

function MiniNewsRow({ item }: { item: MiniItem }) {
  return (
    <article id={item.id} className="grid grid-cols-[44px_1fr] gap-3 rounded-[8px] border border-white/[.08] bg-black/20 p-3">
      <span
        className="grid h-11 w-11 place-items-center rounded-[8px] border text-sm font-black text-white"
        style={{ borderColor: `${item.accent}66`, background: `${item.accent}20` }}
      >
        <GamepadIcon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[15px] font-black leading-snug text-white">{item.title}</span>
        <span className="mt-1 block text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">{item.meta}</span>
      </span>
    </article>
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

function SectionTitle({ title, href, action, tight }: { title: string; href: string; action: string; tight?: boolean }) {
  return (
    <div className={["flex items-center justify-between gap-3", tight ? "" : "px-1"].join(" ")}>
      <h2 className="text-[20px] font-black text-white">{title}</h2>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[var(--blue)]">
        {action}
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
