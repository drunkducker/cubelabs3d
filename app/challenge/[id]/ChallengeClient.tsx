"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatChallengeTime, getLocalChallenge, type LocalChallenge } from "../../../lib/localChallenges";
import styles from "./challenge.module.css";

export default function ChallengeClient({ id }: { id: string }) {
  const [challenge, setChallenge] = useState<LocalChallenge | null | undefined>(undefined);

  useEffect(() => {
    setChallenge(getLocalChallenge(id));
  }, [id]);

  if (challenge === undefined) {
    return <main className={styles.page}><p className={styles.loading}>Loading challenge…</p></main>;
  }

  if (!challenge) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.kicker}>CHALLENGE NOT FOUND</p>
          <h1>This local challenge is not on this browser.</h1>
          <p>Cloud-backed challenge links are the next build step. For now, create and preview the link on the same device.</p>
          <Link className={styles.primary} href="/challenge/create">Create a challenge</Link>
        </section>
      </main>
    );
  }

  const solvedMessage = challenge.senderSolved
    ? `${challenge.senderName} solved this in ${formatChallengeTime(challenge.senderTimeMs)} using ${challenge.senderMoves ?? "—"} moves.`
    : `${challenge.senderName} could not finish this position and bets you cannot either.`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/community">Cube Labs 3D</Link>
        <span>Challenge #{challenge.id}</span>
      </header>

      <section className={styles.card}>
        <p className={styles.kicker}>{challenge.mode === "beat-time" ? "BEAT MY TIME" : "I BET YOU CAN’T"}</p>
        <div className={styles.avatar}>{challenge.senderName.slice(0, 2).toUpperCase()}</div>
        <h1>{challenge.title}</h1>
        <p className={styles.lead}>{solvedMessage}</p>
        {challenge.message && <blockquote>“{challenge.message}”</blockquote>}

        <div className={styles.scramble}>
          <span>STARTING SCRAMBLE</span>
          <code>{challenge.scramble}</code>
        </div>

        <div className={styles.stats}>
          <div><strong>3×3</strong><span>Cube</span></div>
          <div><strong>{formatChallengeTime(challenge.senderTimeMs)}</strong><span>Time to beat</span></div>
          <div><strong>{challenge.senderMoves ?? "—"}</strong><span>Moves</span></div>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primary} href={`/play/3x3?challenge=${challenge.id}`}>Accept challenge</Link>
          <Link className={styles.secondary} href="/challenge/create">Challenge them back</Link>
        </div>

        <small>The playable cube does not consume the scramble automatically yet. This screen establishes the share, accept, and rematch flow for engine wiring.</small>
      </section>
    </main>
  );
}
