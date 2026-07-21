"use client";

/**
 * Premium mobile-first solver homepage for Cube Lab 3D.
 *
 * This component preserves the user's preferred single-column app layout while
 * correcting the product flow: the demo solution stays hidden until the visitor
 * starts a solve, solver and training inputs are separated clearly, and the
 * lower page expands into swipeable discovery rails without interrupting the
 * core cube-solving task.
 */

import Link from "next/link";
import { useState } from "react";
import styles from "./HomeLanding.module.css";

type Rail = {
  title: string;
  note: string;
  cards: Array<[string, string, string]>;
};

const rails: Rail[] = [
  {
    title: "Recommended speed cubes",
    note: "Product placeholders",
    cards: [
      ["Beginner magnetic 3×3", "A forgiving first upgrade with smooth turning and stable alignment.", "GEAR"],
      ["Competition speed cube", "A lighter, faster option for players improving their times.", "GEAR"],
      ["Timer and mat bundle", "A consistent practice setup for home solves.", "ACCESSORY"],
    ],
  },
  {
    title: "Daily challenge",
    note: "Coming after the solver",
    cards: [
      ["Today’s shared scramble", "Everyone receives the same scramble and one clean attempt.", "COMING NEXT"],
      ["Ghost race", "Race your own personal best without waiting for another player.", "PLANNED"],
      ["Weekly streak", "Complete one challenge each day to build a visible streak.", "PLANNED"],
    ],
  },
  {
    title: "Cube Lab games",
    note: "Our games first",
    cards: [
      ["Chameleon Loop", "A colorful timing and matching game built for mobile play.", "OUR GAME"],
      ["Mouse Hunt", "Search a dark cartoon house and catch every mouse before time runs out.", "OUR GAME"],
      ["Mobile game spotlight", "Reserved for a future approved game promotion or muted preview.", "PLACEHOLDER"],
    ],
  },
  {
    title: "Learn to solve",
    note: "Guides and tutorials",
    cards: [
      ["Beginner method", "Learn one layer at a time with simple visual instructions.", "GUIDE"],
      ["3×3 patterns", "Build checkerboards, cube-in-a-cube patterns, and more.", "GUIDE"],
      ["Faster solving", "Move from beginner steps toward efficient speed-solving methods.", "VIDEO"],
    ],
  },
  {
    title: "Featured videos",
    note: "Video placeholders",
    cards: [
      ["How the solver works", "A short walkthrough of manual entry and animated playback.", "VIDEO"],
      ["20×20 reveal", "A future performance showcase for the extreme cube engine.", "VIDEO"],
      ["Mobile game preview", "A reserved placement for a muted promotional video.", "VIDEO SLOT"],
    ],
  },
  {
    title: "Cube news",
    note: "Editorial placeholders",
    cards: [
      ["New puzzle releases", "Fresh cubes, accessories, and technology worth watching.", "NEWS"],
      ["Competition highlights", "Records, major events, and community achievements.", "NEWS"],
      ["Creator spotlight", "Profiles and videos from puzzle creators and teachers.", "COMMUNITY"],
    ],
  },
];

/** Decorative CSS cube used until the full color-entry editor is embedded. */
function HeroCube() {
  const stickers = Array.from({ length: 9 });
  return (
    <div className={styles.cubeCard} aria-label="Interactive cube preview">
      <span className={styles.badge}>◇ 3D</span>
      <span className={styles.resetView} aria-hidden="true">↻</span>
      <div className={styles.platform} />
      <div className={styles.cubeStage}>
        <div className={styles.cube}>
          <span className={`${styles.face} ${styles.front}`}>{stickers.map((_, i) => <i key={`f-${i}`} />)}</span>
          <span className={`${styles.face} ${styles.right}`}>{stickers.map((_, i) => <i key={`r-${i}`} />)}</span>
          <span className={`${styles.face} ${styles.top}`}>{stickers.map((_, i) => <i key={`t-${i}`} />)}</span>
        </div>
      </div>
      <span className={styles.dragHint}>↔ Drag to rotate</span>
    </div>
  );
}

export default function HomeLanding() {
  const [solveStarted, setSolveStarted] = useState(false);
  const [step, setStep] = useState(0);
  const demoMoves = ["R U R′ U′", "F R U′ R′", "U R U′ R′", "L′ U′ L U"];

  return (
    <main className={styles.page}>
      <div className={styles.app}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.logo} aria-hidden="true"><i /><i /><i /></span>
            <div><strong>CUBE LAB <b>3D</b></strong><small>SOLVE · LEARN · MASTER</small></div>
          </div>
          <button className={styles.menu} type="button" aria-label="Open menu">☰</button>
        </header>

        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroCopy}>
            <h1 id="home-title">Solve Your<br />Cube in <span>Seconds</span></h1>
            <p>Enter your cube, get a step-by-step solution, and master every move.</p>
            <strong>No account required.</strong>
          </div>

          <HeroCube />

          <div className={styles.options} aria-label="Cube input choices">
            <button type="button"><b>✎</b><span>Enter manually<small>Solver input</small></span></button>
            <button type="button"><b>▣</b><span>Scan cube<small>Coming soon</small></span></button>
            <Link href="/play/3x3"><b>⌘</b><span>Random scramble<small>Training mode</small></span></Link>
            <Link href="/play/3x3"><b>▤</b><span>Paste scramble<small>Training mode</small></span></Link>
          </div>

          <button className={styles.cta} type="button" onClick={() => setSolveStarted(true)}>
            <span aria-hidden="true">✦</span> SOLVE MY CUBE <span aria-hidden="true">→</span>
          </button>
          <p className={styles.trust}>▣ Solver free · No account required</p>

          {solveStarted && (
            <section className={styles.stepper} aria-live="polite" aria-label="Demo solution playback">
              <div className={styles.stepTop}>
                <div><small>Next step</small><strong>{demoMoves[step]}</strong></div>
                <span>Step {step + 1} of {demoMoves.length}</span>
              </div>
              <p>This is the visual playback layout. It will connect to the real solver engine in the next solver build.</p>
              <div className={styles.stepButtons}>
                <button type="button" onClick={() => setStep((step - 1 + demoMoves.length) % demoMoves.length)}>‹ Prev</button>
                <button type="button" onClick={() => setStep((step + 1) % demoMoves.length)}>Next ›</button>
                <Link href="/play/3x3">Open 3×3</Link>
              </div>
            </section>
          )}
        </section>

        <section className={styles.quickGrid} aria-label="Explore Cube Lab">
          <article><b>🎮</b><strong>Play Cubes</strong><small>Games and challenges</small></article>
          <article><b>🏆</b><strong>Daily Challenge</strong><small>Compete and build streaks</small></article>
          <article><b>📘</b><strong>Learn</strong><small>Guides and tutorials</small></article>
          <article><b>◇</b><strong>Cube Reviews</strong><small>Find the right cube</small></article>
        </section>

        <aside className={styles.signinBanner}>
          <div><strong>Save solve history, streaks, and cross-device progress.</strong><p>Guest play always remains available.</p></div>
          <button type="button">Sign in</button>
        </aside>

        {rails.map((rail, railIndex) => (
          <section className={styles.section} key={rail.title} aria-labelledby={`rail-${railIndex}`}>
            <div className={styles.sectionHead}><h2 id={`rail-${railIndex}`}>{rail.title}</h2><span>{rail.note}</span></div>
            <div className={styles.rail}>
              {rail.cards.map(([title, description, tag]) => (
                <article className={styles.card} key={title}>
                  <span>{tag}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <footer className={styles.footer}>Development preview · Privacy, terms, data export, and account deletion must be completed before public launch.</footer>
      </div>
    </main>
  );
}
