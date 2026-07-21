"use client";

/**
 * Premium solver-first home page for Cube Lab 3D.
 *
 * The first viewport is intentionally focused on solving a cube. Lower sections
 * are horizontally swipeable discovery rails for challenges, games, learning,
 * videos, news, products, and future advertising placements. All current cards
 * are local placeholders so the page stays reliable while real data sources and
 * licensing records are added later.
 */

import Link from "next/link";
import styles from "./HomeLanding.module.css";

const rails = [
  {
    title: "Recommended speed cubes",
    note: "Placeholder products",
    cards: [
      ["Beginner magnetic 3×3", "Smooth turning, forgiving alignment, and a good first upgrade.", "GEAR"],
      ["Competition speed cube", "A lighter, faster option for improving solve times.", "GEAR"],
      ["Timer and mat bundle", "Practice with a consistent setup at home.", "ACCESSORY"],
    ],
  },
  {
    title: "Daily challenge",
    note: "Retention feature preview",
    cards: [
      ["Today’s shared scramble", "Everyone receives the same scramble. Beat your best time.", "COMING NEXT"],
      ["Ghost race", "Race your personal best without waiting for another player.", "PLANNED"],
      ["Weekly streak", "Complete a challenge each day to build your streak.", "PLANNED"],
    ],
  },
  {
    title: "Cube Lab games",
    note: "Our games first",
    cards: [
      ["Chameleon Loop", "A colorful puzzle game about timing, matching, and automatic tongue strikes.", "OUR GAME"],
      ["Mouse Hunt", "Search a dark cartoon house and catch every mouse before time runs out.", "OUR GAME"],
      ["More games", "Future Cube Lab experiments and mobile-first puzzle games.", "IN DEVELOPMENT"],
    ],
  },
  {
    title: "Learn to solve",
    note: "Guides and tutorials",
    cards: [
      ["Beginner method", "Learn the cube one layer at a time with clear visual steps.", "GUIDE"],
      ["3×3 patterns", "Create checkerboards, cube-in-a-cube patterns, and more.", "GUIDE"],
      ["Faster solving", "Move from beginner steps toward efficient speed-solving methods.", "VIDEO"],
    ],
  },
  {
    title: "Featured videos",
    note: "Video placements",
    cards: [
      ["How the solver works", "A short walkthrough showing manual entry and animated playback.", "VIDEO"],
      ["20×20 reveal", "A future performance showcase for the extreme cube engine.", "VIDEO"],
      ["Mobile game spotlight", "Reserved for a muted preview or approved game promotion.", "VIDEO AD"],
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

/** Decorative CSS cube used until the full solver editor is embedded on home. */
function HeroCube() {
  const stickers = Array.from({ length: 9 });
  return (
    <div className={styles.cubeStage} aria-hidden="true">
      <div className={styles.glow} />
      <div className={styles.cube}>
        <span className={`${styles.face} ${styles.front}`}>{stickers.map((_, i) => <i key={`f-${i}`} />)}</span>
        <span className={`${styles.face} ${styles.right}`}>{stickers.map((_, i) => <i key={`r-${i}`} />)}</span>
        <span className={`${styles.face} ${styles.top}`}>{stickers.map((_, i) => <i key={`t-${i}`} />)}</span>
      </div>
    </div>
  );
}

export default function HomeLanding() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.logo} aria-hidden="true"><i /><i /><i /><i /></span>
            <span>Cube Lab 3D</span>
          </div>
          <button className={styles.signin} type="button">Sign in</button>
        </header>

        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>PREMIUM 3×3 SOLVER</p>
            <h1 id="home-title">Solve your cube <span>in seconds.</span></h1>
            <p className={styles.sub}>Enter your colors, paste a scramble, or use the future camera scanner. No account is required to start.</p>
          </div>

          <HeroCube />

          <div className={styles.modeRow} aria-label="Cube input choices">
            <button className={styles.mode} type="button">Manual<small>Color each face</small></button>
            <button className={styles.mode} type="button">Scramble<small>Paste notation</small></button>
            <button className={styles.mode} type="button">Camera<small>Coming soon</small></button>
          </div>

          <Link className={styles.cta} href="/play/3x3">Solve my cube <span aria-hidden="true">→</span></Link>
          <p className={styles.hint}>The working 3×3 opens now. A dedicated solver editor and playback system are the next build stage.</p>
        </section>

        {rails.map((rail, railIndex) => (
          <section className={styles.section} key={rail.title} aria-labelledby={`rail-${railIndex}`}>
            <div className={styles.sectionHead}>
              <h2 id={`rail-${railIndex}`}>{rail.title}</h2>
              <span>{rail.note}</span>
            </div>
            <div className={styles.rail}>
              {rail.cards.map(([title, description, tag], cardIndex) => (
                <article className={`${styles.card} ${tag.includes("AD") ? styles.ad : ""}`} key={`${title}-${cardIndex}`}>
                  <span className={styles.tag}>{tag}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <footer className={styles.footer}>Cube Lab 3D development preview · Privacy, terms, data export, and account deletion will be completed before public launch.</footer>
      </div>
    </main>
  );
}
