"use client";

/**
 * Interactive catalog shown on the Cube Lab 3D home page.
 *
 * Responsibilities:
 * - Give first-time visitors one obvious route into the working 3×3 puzzle.
 * - Preview the larger puzzle library without pretending unfinished games work.
 * - Read the visitor's device-local best 3×3 time when one exists.
 * - Produce a stable daily scramble label and a live countdown without a server.
 *
 * No personal information leaves the browser. The only persisted value read by
 * this component is `cube-lab-best-3x3-ms`, written after a completed solve.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteBrand from "./SiteBrand";

/** A puzzle's current availability in the staged product roadmap. */
type PuzzleStatus = "playable" | "next" | "planned" | "research";

/** Shape families determine which lightweight CSS illustration is displayed. */
type PuzzleShape = "cube" | "pyramid" | "megaminx" | "skewb";

/** Data needed to render one catalog card without hard-coding card markup. */
type PuzzleDefinition = {
  id: string;
  name: string;
  subtitle: string;
  sizeLabel: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  status: PuzzleStatus;
  shape: PuzzleShape;
  href?: string;
};

/** Local-storage key shared with the playable cube page. */
const BEST_TIME_STORAGE_KEY = "cube-lab-best-3x3-ms";

/**
 * The catalog is ordered intentionally: the playable 3×3 is first, followed by
 * the next cube sizes, extreme sizes, and then non-cubic twisty puzzles.
 */
const PUZZLES: PuzzleDefinition[] = [
  {
    id: "3x3",
    name: "Classic 3×3",
    subtitle: "The complete interactive prototype",
    sizeLabel: "3 × 3",
    difficulty: 2,
    status: "playable",
    shape: "cube",
    href: "/play/3x3",
  },
  {
    id: "2x2",
    name: "Pocket 2×2",
    subtitle: "Small, quick, and beginner-friendly",
    sizeLabel: "2 × 2",
    difficulty: 1,
    status: "next",
    shape: "cube",
  },
  {
    id: "4x4",
    name: "Revenge 4×4",
    subtitle: "More layers and parity challenges",
    sizeLabel: "4 × 4",
    difficulty: 3,
    status: "next",
    shape: "cube",
  },
  {
    id: "9x9",
    name: "Master 9×9",
    subtitle: "A serious long-form solve",
    sizeLabel: "9 × 9",
    difficulty: 4,
    status: "planned",
    shape: "cube",
  },
  {
    id: "20x20",
    name: "Titan 20×20",
    subtitle: "An extreme browser performance test",
    sizeLabel: "20 × 20",
    difficulty: 5,
    status: "research",
    shape: "cube",
  },
  {
    id: "pyraminx",
    name: "Pyraminx",
    subtitle: "Four triangular faces",
    sizeLabel: "PYRA",
    difficulty: 2,
    status: "planned",
    shape: "pyramid",
  },
  {
    id: "megaminx",
    name: "Megaminx",
    subtitle: "Twelve colorful faces",
    sizeLabel: "MEGA",
    difficulty: 4,
    status: "planned",
    shape: "megaminx",
  },
  {
    id: "skewb",
    name: "Skewb",
    subtitle: "Corner-turning cube geometry",
    sizeLabel: "SKEWB",
    difficulty: 3,
    status: "planned",
    shape: "skewb",
  },
];

/** Human-readable labels keep internal roadmap terms out of the interface. */
const STATUS_LABELS: Record<PuzzleStatus, string> = {
  playable: "Play now",
  next: "Building next",
  planned: "Planned",
  research: "Lab test",
};

/**
 * Converts a millisecond duration to a compact timer string.
 *
 * @param milliseconds - Non-negative solve duration in milliseconds.
 * @returns `M:SS.d` for display in the home-page personal-best tile.
 */
function formatBestTime(milliseconds: number): string {
  const safeMilliseconds = Math.max(0, milliseconds);
  const minutes = Math.floor(safeMilliseconds / 60_000);
  const seconds = Math.floor((safeMilliseconds % 60_000) / 1_000);
  const tenths = Math.floor((safeMilliseconds % 1_000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

/**
 * Returns a deterministic, date-based label for the future Daily Challenge.
 * The same UTC date produces the same label in every time zone.
 *
 * @param date - Current wall-clock time.
 * @returns A short seed such as `072026` that can later map to a real scramble.
 */
function getDailySeed(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month}${day}${year}`;
}

/**
 * Calculates time remaining until midnight UTC, the intended challenge reset.
 *
 * @param date - Current wall-clock time.
 * @returns `HH:MM:SS`, always padded to prevent layout movement each second.
 */
function getDailyCountdown(date: Date): string {
  const nextReset = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  );
  const totalSeconds = Math.max(0, Math.floor((nextReset - date.getTime()) / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

/**
 * Draws a deliberately lightweight puzzle silhouette with CSS.
 *
 * The catalog can therefore show many shapes without loading eight WebGL scenes.
 * Screen readers ignore this decoration because the surrounding card supplies
 * the puzzle's accessible name and status.
 *
 * @param props.shape - Geometric family used for the CSS class.
 * @param props.sizeLabel - Short label rendered inside cube-shaped previews.
 * @param props.hero - Enlarges the illustration for the first-viewport hero.
 * @returns Decorative markup styled by the catalog visual-system section.
 */
function PuzzleArtwork({
  shape,
  sizeLabel,
  hero = false,
}: {
  shape: PuzzleShape;
  sizeLabel: string;
  hero?: boolean;
}) {
  return (
    <div
      className={`puzzle-art puzzle-art--${shape} ${hero ? "puzzle-art--hero" : ""}`}
      aria-hidden="true"
    >
      <span className="puzzle-art-face puzzle-art-face--front">
        <i />
        <i />
        <i />
        <i />
        <b>{sizeLabel}</b>
      </span>
      <span className="puzzle-art-face puzzle-art-face--top">
        <i />
        <i />
        <i />
      </span>
      <span className="puzzle-art-face puzzle-art-face--side">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/**
 * Renders the complete mobile-first catalog experience.
 *
 * @returns Header, hero, challenge preview, puzzle cards, local stats, and footer.
 */
export default function HomeCatalog() {
  // `null` means no completed solve has been stored on this device yet.
  const [bestTime, setBestTime] = useState<number | null>(null);

  // One Date instance drives both the daily seed and visible reset countdown.
  const [now, setNow] = useState(() => new Date());

  /** Read device-local progress and advance the reset clock once per second. */
  useEffect(() => {
    // Reading is deferred to the next paint so effect setup does not synchronously
    // trigger another render. This also lets the server-rendered placeholder hydrate
    // consistently before device-only storage modifies it.
    const bestReadFrame = window.requestAnimationFrame(() => {
      const storedBest = window.localStorage.getItem(BEST_TIME_STORAGE_KEY);
      if (storedBest !== null) {
        const parsedBest = Number(storedBest);
        if (Number.isFinite(parsedBest) && parsedBest > 0) setBestTime(parsedBest);
      }
    });

    const clock = window.setInterval(() => setNow(new Date()), 1_000);
    return () => {
      window.cancelAnimationFrame(bestReadFrame);
      window.clearInterval(clock);
    };
  }, []);

  // The seed changes only when the UTC calendar date changes.
  const dailySeed = useMemo(() => getDailySeed(now), [now]);

  return (
    <main className="catalog-shell">
      {/* Blurred color fields add depth while remaining non-interactive. */}
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="catalog-header">
        <SiteBrand />
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#puzzles">Puzzles</a>
          <a href="#daily">Daily</a>
          <a href="#roadmap">Roadmap</a>
        </nav>
        <Link className="header-play-link" href="/play/3x3">
          Play 3×3
        </Link>
      </header>

      <section className="catalog-hero" aria-labelledby="catalog-title">
        <div className="hero-copy">
          <p className="eyebrow">THE ONLINE TWISTY-PUZZLE LAB</p>
          <h1 id="catalog-title">
            Pick a puzzle.
            <span>Make your move.</span>
          </h1>
          <p className="hero-description">
            Turn a real 3D cube in your browser. No download, no account, and no waiting.
          </p>
          <div className="hero-actions">
            <Link className="hero-primary-action" href="/play/3x3">
              <span>Play 3×3 now</span>
              <b aria-hidden="true">↗</b>
            </Link>
            <a className="hero-secondary-action" href="#puzzles">
              Explore the lab
            </a>
          </div>
          <div className="hero-proof" aria-label="Prototype features">
            <span><i /> Fully turnable</span>
            <span><i /> Solvable</span>
            <span><i /> Touch ready</span>
          </div>
        </div>

        <Link className="hero-puzzle-card" href="/play/3x3" aria-label="Open the playable Classic 3 by 3 cube">
          <span className="hero-card-label">LIVE / PLAYABLE</span>
          <PuzzleArtwork shape="cube" sizeLabel="3 × 3" hero />
          <span className="hero-card-footer">
            <b>Classic cube</b>
            <small>Swipe a tile to turn</small>
          </span>
        </Link>
      </section>

      <section className="daily-strip" id="daily" aria-labelledby="daily-title">
        <div className="daily-icon" aria-hidden="true">✦</div>
        <div className="daily-copy">
          <p>DAILY CHALLENGE / PREVIEW</p>
          <h2 id="daily-title">Same scramble. Everyone gets one shot.</h2>
        </div>
        <div className="daily-seed">
          <span>SEED</span>
          <b>{dailySeed}</b>
        </div>
        <div className="daily-reset">
          <span>RESETS IN</span>
          <b>{getDailyCountdown(now)}</b>
        </div>
        <span className="coming-chip">COMING NEXT</span>
      </section>

      <section className="puzzle-catalog" id="puzzles" aria-labelledby="puzzle-catalog-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PUZZLE CATALOG</p>
            <h2 id="puzzle-catalog-title">One lab. Every shape.</h2>
          </div>
          <p>Start with the working 3×3. The rest show the order we are building.</p>
        </div>

        <div className="puzzle-grid">
          {PUZZLES.map((puzzle, index) => {
            const cardContents = (
              <>
                <div className="puzzle-card-topline">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span className={`status-chip status-chip--${puzzle.status}`}>
                    {STATUS_LABELS[puzzle.status]}
                  </span>
                </div>
                <PuzzleArtwork shape={puzzle.shape} sizeLabel={puzzle.sizeLabel} />
                <div className="puzzle-card-copy">
                  <h3>{puzzle.name}</h3>
                  <p>{puzzle.subtitle}</p>
                  <div className="difficulty" aria-label={`Difficulty ${puzzle.difficulty} out of 5`}>
                    {Array.from({ length: 5 }, (_, dotIndex) => (
                      <i className={dotIndex < puzzle.difficulty ? "is-filled" : ""} key={dotIndex} />
                    ))}
                  </div>
                </div>
              </>
            );

            return puzzle.href ? (
              <Link className="puzzle-card puzzle-card--playable" href={puzzle.href} key={puzzle.id}>
                {cardContents}
              </Link>
            ) : (
              <article className="puzzle-card puzzle-card--locked" key={puzzle.id} aria-label={`${puzzle.name}, ${STATUS_LABELS[puzzle.status]}`}>
                {cardContents}
              </article>
            );
          })}
        </div>
      </section>

      <section className="progress-strip" aria-label="Your device-local progress">
        <div>
          <p>YOUR PROGRESS / THIS DEVICE</p>
          <h2>{bestTime === null ? "Complete your first timed solve." : "Your best 3×3 is waiting to be beaten."}</h2>
        </div>
        <div className="personal-best">
          <span>PERSONAL BEST</span>
          <b>{bestTime === null ? "—:—.—" : formatBestTime(bestTime)}</b>
        </div>
        <Link href="/play/3x3">Start a solve <span aria-hidden="true">→</span></Link>
      </section>

      <section className="roadmap-strip" id="roadmap" aria-labelledby="roadmap-title">
        <p className="eyebrow">BUILD ORDER</p>
        <h2 id="roadmap-title">Playable first. Community next.</h2>
        <div className="roadmap-steps">
          <span className="is-current"><b>01</b> Catalog + 3×3</span>
          <span><b>02</b> 2×2 + 4×4</span>
          <span><b>03</b> Daily challenge</span>
          <span><b>04</b> Races + rankings</span>
        </div>
      </section>

      <footer className="site-footer">
        <SiteBrand />
        <p>Original online twisty-puzzle games, built one reliable move at a time.</p>
        <div>
          <span>Prototype release</span>
          <span>© {new Date().getFullYear()} Cube Lab 3D</span>
        </div>
      </footer>

      {/* Four items is the mobile limit set by the architecture. Only Play is a
          live destination in this release; the other labels preview navigation. */}
      <nav className="mobile-tabbar" aria-label="Mobile navigation">
        <Link className="is-active" href="/">
          <span aria-hidden="true">◆</span>
          Home
        </Link>
        <Link href="/play/3x3">
          <span aria-hidden="true">◫</span>
          Play
        </Link>
        <a href="#daily">
          <span aria-hidden="true">✦</span>
          Daily
        </a>
        <a href="#roadmap">
          <span aria-hidden="true">◎</span>
          Roadmap
        </a>
      </nav>
    </main>
  );
}
