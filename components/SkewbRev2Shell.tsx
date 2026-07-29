import Link from "next/link";
import SkewbGame from "@/app/SkewbGame";
import styles from "./SkewbRev2Shell.module.css";

export default function SkewbRev2Shell() {
  return (
    <div className={styles.workspace}>
      <div className={styles.ambient} aria-hidden="true" />

      <header className={styles.topbar}>
        <Link href="/solve" className={styles.iconButton} aria-label="Back to all solvers">←</Link>
        <div className={styles.brandBlock}>
          <span className={styles.brand}>CUBE LABS</span>
          <strong>SKEWB</strong>
        </div>
        <Link href="/solver/skewb/rev1" className={styles.revision}>REV 1</Link>
      </header>

      <section className={styles.readout} aria-label="Skewb control guide">
        <div><span className={styles.greenDot} /> ENGINE ONLINE</div>
        <div>120° CORNER TURNS</div>
        <div>SWIPE TO MOVE</div>
      </section>

      <main className={styles.stage}>
        <div className={styles.cornerLabel}>SKEWB / REV 2</div>
        <SkewbGame />
      </main>

      <footer className={styles.footerNote}>
        Drag a colored piece to turn. Switch to view mode to rotate the puzzle.
      </footer>
    </div>
  );
}
