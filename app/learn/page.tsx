import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import AdSlot from "@/components/AdSlot";
import FeaturedVideos from "@/components/FeaturedVideos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learn to Solve | Cube Lab 3D",
  description: "Step-by-step guides, animations, and algorithms — beginner method, CFOP, OLL/PLL, and 4×4/5×5 reduction. Learn to solve like a pro.",
};

const TOPICS = [
  { name: "Getting Started", blurb: "The pieces, faces, and basic moves.", meta: "6 lessons", href: "/cube-notation", accent: "surf-learn" },
  { name: "Beginner Method", blurb: "Layer-by-layer solving for the 3×3.", meta: "12 lessons", href: "/solver/3x3", accent: "surf-reviews" },
  { name: "CFOP Method", blurb: "The most popular speedcubing method.", meta: "23 lessons", href: "/cube-notation", accent: "surf-games" },
  { name: "OLL & PLL", blurb: "Orient then permute the last layer.", meta: "57 + 21 algs", href: "/cube-notation", accent: "surf-daily" },
];

const ALGS = [
  { name: "The Sexy Move", moves: "R U R' U'", use: "Sune / insertion", level: "Beginner", tone: "text-[var(--green)]" },
  { name: "Sledgehammer", moves: "R' F R F'", use: "OLL case", level: "Intermediate", tone: "text-[var(--cyan)]" },
  { name: "T Perm", moves: "R U R' U' R' F R2 U' R' U' R U R' F'", use: "PLL", level: "Advanced", tone: "text-[var(--purple)]" },
  { name: "Y Perm", moves: "F R U' R' U' R U R' F' R U R' U' R' F R F'", use: "PLL", level: "Advanced", tone: "text-[var(--purple)]" },
];

export default function LearnPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[980px] overflow-hidden px-5 pb-[calc(40px+env(safe-area-inset-bottom))] pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1]">
        <SiteHeader />

        <section className="mt-6">
          <p className="text-xs font-extrabold tracking-[.22em] text-[var(--purple)]">LEARN · PRACTICE · MASTER</p>
          <h1 className="mt-2 text-[40px] font-black leading-[1.02] tracking-[-1.5px] sm:text-[52px]">Learn to solve<br /><span className="accent-text">like a pro.</span></h1>
          <p className="mt-3 max-w-[560px] text-[15px] leading-6 text-[var(--muted)]">Step-by-step guides, animations, and an algorithm library to take your solving to the next level.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="glass rounded-full px-3 py-1.5">📘 Beginner friendly</span>
            <span className="glass rounded-full px-3 py-1.5">🧊 Visual &amp; interactive</span>
            <span className="glass rounded-full px-3 py-1.5">🚀 Progress tracking</span>
          </div>
          <form action="/learn" className="mt-5">
            <input name="q" placeholder="Search topics, algorithms, or guides…" className="w-full rounded-2xl border border-[var(--border-2)] bg-black/20 px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--purple)] focus:outline-none" />
          </form>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="grid gap-8">
            <section>
              <h2 className="mb-3 text-sm font-black uppercase tracking-[.14em] text-[var(--muted)]">Learn by topic</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {TOPICS.map((t) => (
                  <Link key={t.name} href={t.href} className={`${t.accent} flex flex-col gap-1 rounded-2xl p-4 transition hover:brightness-110`}>
                    <span className="text-base font-black">{t.name}</span>
                    <span className="text-sm text-[var(--muted)]">{t.blurb}</span>
                    <span className="mt-2 text-[11px] font-black uppercase tracking-wide text-[var(--faint)]">{t.meta}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-black uppercase tracking-[.14em] text-[var(--muted)]">Featured tutorials</h2>
              <FeaturedVideos placement="learn_featured" />
              <p className="mt-2 text-xs text-[var(--faint)]">Tutorials are managed in Admin → Videos and appear here automatically.</p>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-black uppercase tracking-[.14em] text-[var(--muted)]">Popular algorithms</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {ALGS.map((a) => (
                  <div key={a.name} className="cube-card grid gap-1 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black">{a.name}</span>
                      <span className={`text-[11px] font-black uppercase ${a.tone}`}>{a.level}</span>
                    </div>
                    <code className="mt-1 block break-words rounded-lg bg-black/25 px-2 py-1.5 text-sm font-bold tracking-wide text-[var(--text)]">{a.moves}</code>
                    <span className="text-xs text-[var(--muted)]">Use: {a.use}</span>
                  </div>
                ))}
              </div>
              <Link href="/cube-notation" className="mt-3 inline-flex text-sm font-bold text-[var(--purple)]">Full notation &amp; algorithm reference →</Link>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="grid content-start gap-5">
            <section className="cube-card rounded-2xl p-5">
              <h2 className="text-lg font-black">Your progress</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Sign in to track lessons, algorithms, and solve stats across devices.</p>
              <Link href="/auth" className="cta-purple mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm font-black">Sign in to track</Link>
            </section>

            <AdSlot placement="learn_promo" />

            <section className="signin-surf rounded-2xl border border-[var(--border-2)] p-5">
              <div className="flex items-center gap-2"><span className="text-xl">👑</span><h2 className="text-lg font-black">Go Premium</h2></div>
              <ul className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                <li>✓ Advanced tutorials &amp; methods</li>
                <li>✓ Exclusive algorithm database</li>
                <li>✓ Ad-free experience</li>
                <li>✓ Detailed progress tracking</li>
              </ul>
              <Link href="/auth" className="cta-blue mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm font-black">Upgrade now</Link>
            </section>
          </aside>
        </div>

        <div className="mt-8">
          <AdSlot placement="learn_bottom" />
        </div>
      </div>
    </main>
  );
}
