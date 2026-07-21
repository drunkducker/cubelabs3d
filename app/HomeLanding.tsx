"use client";

/**
 * Cube Lab 3D homepage.
 *
 * This component is a faithful React conversion of the founder's preferred
 * single-file mobile design. The mobile layout, option cards, green solve CTA,
 * draggable CSS cube, solution stepper, feature grid, and sign-in banner are
 * preserved instead of being reinterpreted.
 */

import Link from "next/link";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./HomeLanding.module.css";

const MOVES = [
  "R U R′ U′", "F R U′ R′", "U R U′ R′", "L′ U′ L U", "R U2 R′",
  "F U R U′", "R′ F R F′", "U′ L′ U L", "R U R′ F′", "F R U R′",
  "U2 R U R′", "L U L′ U′", "R′ U′ R U", "F′ U′ F", "R U R′ U R U2 R′",
  "U R U′ R′", "L′ U L U′", "F R′ F′ R", "R U2 R′ U′", "R U R′ U′",
];

const FACE_COLORS = ["#1667e0", "#24b84a", "#e6352b", "#ff7a18", "#f4f6f8", "#ffd21f"];

function Icon({ name }: { name: "edit" | "camera" | "shuffle" | "paste" }) {
  const glyph = { edit: "✎", camera: "▣", shuffle: "⌘", paste: "▤" }[name];
  return <span aria-hidden="true">{glyph}</span>;
}

/** CSS-only six-face cube with pointer drag and idle rotation. */
function HeroCube() {
  const [rotation, setRotation] = useState({ x: -24, y: -32 });
  const [dragging, setDragging] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (dragging) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      setRotation((current) => ({ ...current, y: current.y + 0.25 }));
    }, 30);
    return () => window.clearInterval(timer);
  }, [dragging]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    setDragging(true);
    setHintVisible(false);
    last.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || !last.current) return;
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    setRotation((current) => ({
      x: Math.max(-88, Math.min(88, current.x - dy * 0.6)),
      y: current.y + dx * 0.6,
    }));
    last.current = { x: event.clientX, y: event.clientY };
  }

  function endDrag() {
    setDragging(false);
    last.current = null;
  }

  const faces = ["front", "back", "right", "left", "top", "bottom"] as const;

  return (
    <div
      className={styles.cubeCard}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className={styles.badge}>◇ 3D</div>
      <button
        type="button"
        className={styles.refresh}
        aria-label="Reset cube view"
        onClick={() => setRotation({ x: -24, y: -32 })}
      >↻</button>
      <div className={styles.platform} />
      <div
        className={styles.cube}
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
        aria-hidden="true"
      >
        {faces.map((face, faceIndex) => (
          <span className={`${styles.face} ${styles[face]}`} key={face}>
            {Array.from({ length: 9 }, (_, stickerIndex) => (
              <i key={`${face}-${stickerIndex}`} style={{ background: FACE_COLORS[faceIndex] }} />
            ))}
          </span>
        ))}
      </div>
      <div className={`${styles.dragHint} ${hintVisible ? "" : styles.hiddenHint}`}>↔ Drag to rotate</div>
    </div>
  );
}

export default function HomeLanding() {
  const [step, setStep] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [toast, setToast] = useState("");
  const miniColors = useMemo(
    () => Array.from({ length: 9 }, (_, index) => FACE_COLORS[((step + 1) * 7 + index * 3) % FACE_COLORS.length]),
    [step],
  );

  useEffect(() => {
    if (!autoPlaying) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % MOVES.length), 900);
    return () => window.clearInterval(timer);
  }, [autoPlaying]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  return (
    <main className={styles.page}>
      <div className={styles.app}>
        <div className={`${styles.orb} ${styles.orbA}`} />
        <div className={`${styles.orb} ${styles.orbB}`} />

        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.logo} aria-hidden="true"><i /><i /><i /></span>
            <div><strong>CUBE LAB <b>3D</b></strong><small>SOLVE · LEARN · MASTER</small></div>
          </div>
          <div className={styles.headActions}>
            <button type="button" className={styles.iconButton} onClick={() => showToast("Help and tips are coming soon")}>?</button>
            <button type="button" className={styles.menu} aria-label="Open menu" onClick={() => showToast("Menu is coming soon")}>☰</button>
          </div>
        </header>

        <h1 className={styles.heroTitle}>Solve Your<br />Cube in <span>Seconds</span></h1>
        <p className={styles.heroSub}>Enter your cube, get a step-by-step solution, and master every move.</p>
        <p className={styles.heroFree}>No account required.</p>

        <HeroCube />

        <div className={styles.options} aria-label="Cube input choices">
          <button type="button" onClick={() => showToast("Manual color editor is coming next")}><Icon name="edit" /><b>Enter<br />Manually</b></button>
          <button type="button" onClick={() => showToast("Camera scan is coming soon")}><Icon name="camera" /><b>Scan<br />Cube</b></button>
          <button type="button" onClick={() => showToast("Random scramble generated")}><Icon name="shuffle" /><b>Random<br />Scramble</b></button>
          <button type="button" onClick={() => showToast("Paste scramble input is coming next")}><Icon name="paste" /><b>Paste<br />Scramble</b></button>
        </div>

        <Link className={styles.solve} href="/play/3x3"><span>✦</span><b>SOLVE MY CUBE</b><span>→</span></Link>
        <div className={styles.trust}>▣ Solver free <span>•</span> No sign up required</div>

        <section className={styles.stepper} aria-label="Solution preview">
          <div className={styles.stepTop}>
            <div><small>Next Step</small><strong>{MOVES[step]}</strong></div>
            <div className={styles.miniWrap}>
              <div className={styles.miniCube}>{miniColors.map((color, index) => <i key={index} style={{ background: color }} />)}</div>
              <span>Step {step + 1} of {MOVES.length}</span>
            </div>
          </div>
          <div className={styles.stepButtons}>
            <button type="button" onClick={() => setStep((step - 1 + MOVES.length) % MOVES.length)}>‹ Prev</button>
            <button type="button" className={styles.primaryStep} onClick={() => setStep((step + 1) % MOVES.length)}>▶ Next</button>
            <button type="button" onClick={() => setAutoPlaying((value) => !value)}>{autoPlaying ? "Ⅱ Pause" : "≫ Auto Play"}</button>
          </div>
        </section>

        <div className={styles.dots} aria-hidden="true"><i className={styles.activeDot} /><i /><i /><i /><i /><i /><i /></div>

        <section className={styles.featureGrid} aria-label="Explore Cube Lab">
          <button type="button" className={styles.games} onClick={() => showToast("Cube games are coming soon")}><span>🎮</span><div><b>Play Cubes</b><small>Fun games and challenges</small></div><em>›</em></button>
          <button type="button" className={styles.daily} onClick={() => showToast("Daily challenge is coming soon")}><span>🏆</span><div><b>Daily Challenge</b><small>Compete and win rewards</small></div><em>›</em></button>
          <button type="button" className={styles.learn} onClick={() => showToast("Tutorials are coming soon")}><span>📘</span><div><b>Learn</b><small>Guides, tutorials and more</small></div><em>›</em></button>
          <button type="button" className={styles.reviews} onClick={() => showToast("Cube reviews are coming soon")}><span>◇</span><div><b>Cube Reviews</b><small>Find the best cubes</small></div><em>›</em></button>
        </section>

        <aside className={styles.signinBanner}>
          <span className={styles.avatar}>♙</span>
          <div><strong>Save your solves and sync across all your devices.</strong><small>Sign in or continue as Guest.</small></div>
          <div className={styles.signinActions}><button type="button" onClick={() => showToast("Continuing as Guest")}>Continue as Guest</button><button type="button" className={styles.signinButton} onClick={() => showToast("Sign in is coming soon")}>Sign In</button></div>
        </aside>
      </div>
      <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`} role="status" aria-live="polite">{toast}</div>
    </main>
  );
}
