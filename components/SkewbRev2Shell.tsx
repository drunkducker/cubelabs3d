import Link from "next/link";
import SkewbGame from "@/app/SkewbGame";
import styles from "./SkewbRev2Shell.module.css";

export default function SkewbRev2Shell() {
  return (
    <div className={styles.rev2}>
      <div className={styles.backdrop} aria-hidden="true" />
      <header className={styles.labHeader}>
        <div>
          <p className={styles.eyebrow}>CUBE LABS · PUZZLE LAB</p>
          <div className={styles.titleRow}>
            <h1>Skewb <span>Rev 2</span></h1>
            <span className={styles.badge}>NEW BUILD</span>
          </div>
          <p className={styles.subtitle}>
            Rebuilt around the proven 3×3 play flow, the 4×4 control discipline,
            and the Kilominx gesture-first 3D interaction model.
          </p>
        </div>
        <nav className={styles.nav} aria-label="Skewb revision navigation">
          <Link href="/solve">All solvers</Link>
          <Link href="/solver/skewb/rev1">Rev 1</Link>
        </nav>
      </header>

      <section className={styles.featureRail} aria-label="Skewb Rev 2 improvements">
        <article><strong>3×3 DNA</strong><span>Fast scramble-to-solve flow</span></article>
        <article><strong>4×4 Controls</strong><span>Clear turn and camera modes</span></article>
        <article><strong>Kilominx Feel</strong><span>Swipe-first piece interaction</span></article>
        <article><strong>Real Engine</strong><span>Verified state-based solutions</span></article>
      </section>

      <div className={styles.gameFrame}>
        <div className={styles.frameLabel}>
          <span className={styles.liveDot} /> LIVE PUZZLE ENGINE
        </div>
        <SkewbGame />
      </div>
    </div>
  );
}
