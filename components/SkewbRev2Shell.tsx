import Link from "next/link";
import SkewbPhysicalGame from "@/components/SkewbPhysicalGame";
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
      <section className={styles.readout} aria-label="Skewb model status">
        <div><span className={styles.greenDot} /> PHYSICAL MODEL</div>
        <div>TRUE CORNER CUTS</div>
        <div>120° TURNS</div>
      </section>
      <main className={styles.stage}>
        <div className={styles.cornerLabel}>SKEWB / PHYSICAL REVISION</div>
        <SkewbPhysicalGame />
      </main>
      <footer className={styles.footerNote}>
        Built to resemble a real speed Skewb: deep diagonal cuts, thick black plastic, beveled pieces, and large diamond centers.
      </footer>
    </div>
  );
}
