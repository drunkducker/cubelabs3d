"use client";

/**
 * Lower homepage ecosystem for Cube Lab 3D.
 *
 * The vertical page is intentionally finite so visitors can always reach the
 * footer. Individual horizontal rails loop by rendering three copies of their
 * data and silently repositioning the scroll container inside the middle copy.
 * Promotional cards remain restricted to these lower rails and never interrupt
 * the solver, open popups, or autoplay sound.
 */

import { useEffect, useRef, useState } from "react";

type Card = {
  title: string;
  subtitle?: string;
  meta?: string;
  accent: string;
  art: string;
  sponsored?: boolean;
};

type Rail = {
  title: string;
  icon: string;
  accent: string;
  cards: Card[];
};

const rails: Rail[] = [
  { title: "RECOMMENDED CUBES", icon: "◇", accent: "#a855f7", cards: [
    { title: "GAN 15 MagLev", subtitle: "★★★★★ 4.9", meta: "$69.99", accent: "#8b5cf6", art: "3×3", sponsored: true },
    { title: "MoYu WRM V10", subtitle: "★★★★★ 4.8", meta: "$39.99", accent: "#2563eb", art: "WRM" },
    { title: "Tornado V4", subtitle: "★★★★★ 4.7", meta: "$24.99", accent: "#ef4444", art: "V4" },
    { title: "RS3M V6", subtitle: "★★★★★ 4.8", meta: "$19.99", accent: "#22c55e", art: "V6", sponsored: true },
  ]},
  { title: "CUBE NEWS", icon: "▤", accent: "#22c55e", cards: [
    { title: "New GAN 15 MagLev officially released", subtitle: "2 days ago", accent: "#0ea5e9", art: "GAN 15" },
    { title: "New 3×3 world record: 3.13 seconds", subtitle: "3 days ago", accent: "#22c55e", art: "3.13" },
    { title: "Core magnet technology explained", subtitle: "5 days ago", accent: "#8b5cf6", art: "CORE" },
    { title: "Cube Lab feature update", subtitle: "1 week ago", accent: "#06b6d4", art: "UPDATE" },
  ]},
  { title: "FEATURED VIDEOS", icon: "▶", accent: "#f43f5e", cards: [
    { title: "How to solve faster with F2L tricks", subtitle: "CubeHead · 8:45", accent: "#16a34a", art: "F2L" },
    { title: "CFOP full tutorial step by step", subtitle: "J Perm · 12:33", accent: "#eab308", art: "CFOP" },
    { title: "Insane 7.44 official solve", subtitle: "SpeedCubeShop · 0:18", accent: "#22c55e", art: "7.44" },
    { title: "Mobile puzzle game preview", subtitle: "Muted preview", accent: "#7c3aed", art: "AD", sponsored: true },
  ]},
  { title: "PLAY GAMES", icon: "🎮", accent: "#a855f7", cards: [
    { title: "Chameleon Loop", accent: "#22c55e", art: "🦎" },
    { title: "Hungry Hole", accent: "#f97316", art: "🕳️" },
    { title: "Mouse Hunt", accent: "#64748b", art: "🐭" },
    { title: "Cube Runner", accent: "#7c3aed", art: "◆" },
    { title: "Featured mobile game", accent: "#2563eb", art: "AD", sponsored: true },
  ]},
];

/** Keeps a three-copy horizontal rail visually looping without endless page height. */
function useLoopingRail() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    requestAnimationFrame(() => { node.scrollLeft = node.scrollWidth / 3; });
  }, []);
  const onScroll = () => {
    const node = ref.current;
    if (!node) return;
    const third = node.scrollWidth / 3;
    if (node.scrollLeft < third * 0.35) node.scrollLeft += third;
    else if (node.scrollLeft > third * 1.65) node.scrollLeft -= third;
  };
  return { ref, onScroll };
}

function RailSection({ rail }: { rail: Rail }) {
  const loop = useLoopingRail();
  const repeated = [...rail.cards, ...rail.cards, ...rail.cards];
  return (
    <section className="mt-4 rounded-[20px] border border-white/10 bg-black/20 p-3 shadow-[0_18px_50px_rgba(0,0,0,.22)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[14px] font-extrabold tracking-wide text-white"><span style={{ color: rail.accent }}>{rail.icon}</span>{rail.title}</h2>
        <button className="text-xs font-semibold text-white/70" type="button">View All ›</button>
      </div>
      <div ref={loop.ref} onScroll={loop.onScroll} className="no-scrollbar grid snap-x snap-mandatory grid-flow-col auto-cols-[42%] gap-2 overflow-x-auto pb-1 sm:auto-cols-[31%]">
        {repeated.map((card, index) => (
          <article key={`${card.title}-${index}`} className="snap-start overflow-hidden rounded-[14px] border border-white/10 bg-[#0b111d]">
            <div className="relative grid h-[88px] place-items-center overflow-hidden" style={{ background: `radial-gradient(circle at 50% 45%, ${card.accent}66, transparent 68%), #07101d` }}>
              <span className="text-2xl font-black text-white drop-shadow-[0_0_16px_rgba(255,255,255,.4)]">{card.art}</span>
              {card.sponsored && <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[8px] font-extrabold tracking-wide text-white/80">PROMOTED</span>}
            </div>
            <div className="p-2.5">
              <h3 className="min-h-[34px] text-[12px] font-bold leading-[1.25] text-white">{card.title}</h3>
              {card.subtitle && <p className="mt-1 text-[10px] text-white/65">{card.subtitle}</p>}
              {card.meta && <p className="mt-1 text-[11px] font-bold text-lime-400">{card.meta}</p>}
              {rail.title === "RECOMMENDED CUBES" && <button type="button" className="mt-2 w-full rounded-lg border border-purple-500/70 py-1.5 text-[10px] font-bold text-purple-300">Our Review</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DailyChallenge() {
  return <section className="mt-4 rounded-[20px] border border-white/10 bg-black/20 p-3"><div className="mb-3 flex items-center justify-between"><h2 className="text-[14px] font-extrabold tracking-wide text-white"><span className="mr-2">🏆</span>DAILY CHALLENGE</h2><button type="button" className="text-xs font-semibold text-yellow-300">View Leaderboard ›</button></div><div className="grid gap-3 rounded-2xl border border-white/10 bg-[#0b111d] p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex items-center gap-3"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-white via-red-500 to-green-500 text-xl font-black text-black shadow-lg">3×3</div><div><p className="text-xs text-white/70">Today's Scramble</p><p className="mt-1 font-mono text-sm font-bold text-white">F R U R' U' F' U R U' R' F R2 U'</p><p className="mt-2 text-xs font-semibold text-lime-400">Your Best: 00:25.34</p><p className="text-xs font-semibold text-purple-400">Global Best: 00:04.35</p></div></div><div><button type="button" className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3 font-extrabold text-black shadow-[0_0_24px_rgba(250,204,21,.25)]">🏆 Start Challenge</button><p className="mt-2 text-center text-[10px] text-white/60">Solvers Today: 12,458</p></div></div></section>;
}

const learn = ["Beginner", "CFOP", "Roux", "ZZ", "One-Handed", "Blindfold"];
function LearnRail() {
  const loop = useLoopingRail();
  const repeated = [...learn, ...learn, ...learn];
  return <section className="mt-4 rounded-[20px] border border-white/10 bg-black/20 p-3"><div className="mb-3 flex items-center justify-between"><h2 className="text-[14px] font-extrabold text-white">📖 LEARN</h2><button type="button" className="text-xs text-white/70">View All ›</button></div><div ref={loop.ref} onScroll={loop.onScroll} className="no-scrollbar grid snap-x snap-mandatory grid-flow-col auto-cols-[26%] gap-2 overflow-x-auto">{repeated.map((item, index) => <button key={`${item}-${index}`} type="button" className="snap-start rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-3 text-center"><span className="block text-2xl" style={{ color: ["#22c55e", "#0ea5e9", "#a855f7", "#f59e0b", "#06b6d4", "#fb7185"][index % learn.length] }}>◇</span><span className="mt-2 block text-[10px] font-bold text-white">{item}</span></button>)}</div></section>;
}

function Footer() {
  const groups = [
    ["Company", "About", "Contact"],
    ["Legal", "Privacy Policy", "Terms of Service", "Cookie Settings"],
    ["Transparency", "Affiliate Disclosure", "Asset Credits", "Open Source Licenses"],
  ];
  return <footer className="mt-6 border-t border-white/10 px-1 pb-2 pt-6 text-white/60"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-yellow-300 via-blue-500 to-red-500 font-black text-black">3D</span><div><strong className="block text-sm text-white">CUBE LAB 3D</strong><span className="text-[10px] tracking-[.18em]">SOLVE · LEARN · MASTER</span></div></div><div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">{groups.map(([heading, ...links]) => <div key={heading}><h3 className="text-xs font-extrabold text-white">{heading}</h3><div className="mt-2 grid gap-2">{links.map((link) => <button key={link} type="button" className="text-left text-[11px] hover:text-white">{link}</button>)}</div></div>)}</div><div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[10px]"><span>© 2026 Cube Lab 3D</span><span>Development preview · Public launch gate still applies</span></div></footer>;
}

export default function EcosystemSections() {
  const [guest, setGuest] = useState(false);
  return <div className="mt-6">{rails.map((rail) => <RailSection key={rail.title} rail={rail} />)}<DailyChallenge /><LearnRail /><aside className="mt-4 grid gap-4 rounded-[20px] border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex items-center gap-3"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-blue-500 bg-blue-500/10 text-2xl shadow-[0_0_20px_rgba(59,130,246,.35)]">👤</span><div><strong className="text-sm text-white">Save your solves and sync across all your devices.</strong><p className="mt-1 text-xs text-white/60">Sign in or continue as Guest.</p></div></div><div className="grid gap-2"><button type="button" className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 px-8 py-3 font-bold text-white">Sign In</button><button type="button" onClick={() => setGuest(true)} className="text-sm font-semibold text-sky-400">{guest ? "Guest mode active" : "Continue as Guest"}</button></div></aside><Footer /></div>;
}
