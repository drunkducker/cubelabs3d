"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  createChallengeId,
  saveLocalChallenge,
  type LocalChallengeMode,
} from "../../../lib/localChallenges";
import styles from "./create.module.css";

const DEFAULT_SCRAMBLE = "R U R' U' F2 D L2 B' U2 R2";

export default function CreateChallengePage() {
  const [mode, setMode] = useState<LocalChallengeMode>("beat-time");
  const [title, setTitle] = useState("Think you can beat this?");
  const [senderName, setSenderName] = useState("Dustin");
  const [message, setMessage] = useState("I made this cube for you. Give it your best shot.");
  const [scramble, setScramble] = useState(DEFAULT_SCRAMBLE);
  const [timeSeconds, setTimeSeconds] = useState("52.40");
  const [moves, setMoves] = useState("67");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  function createChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = createChallengeId();
    const senderSolved = mode === "beat-time";
    const parsedTime = Number(timeSeconds);
    const parsedMoves = Number(moves);

    saveLocalChallenge({
      id,
      version: 1,
      cubeSize: 3,
      mode,
      title: title.trim() || "Cube challenge",
      senderName: senderName.trim() || "A friend",
      message: message.trim(),
      scramble: scramble.trim() || DEFAULT_SCRAMBLE,
      senderSolved,
      senderTimeMs: senderSolved && Number.isFinite(parsedTime) ? Math.round(parsedTime * 1000) : null,
      senderMoves: senderSolved && Number.isFinite(parsedMoves) ? Math.max(0, Math.round(parsedMoves)) : null,
      createdAt: new Date().toISOString(),
    });

    setShareUrl(`${window.location.origin}/challenge/${id}`);
    setCopied(false);
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/community">← Community</Link>
        <span>Cube Labs Challenge Builder</span>
      </header>

      <section className={styles.hero}>
        <p>3×3 SOCIAL PLAY</p>
        <h1>Scramble it. Send it.</h1>
        <span>Create a working challenge link now. Account-based cloud sharing comes next.</span>
      </section>

      <form className={styles.form} onSubmit={createChallenge}>
        <fieldset className={styles.modePicker}>
          <legend>Challenge type</legend>
          <button type="button" className={mode === "beat-time" ? styles.active : ""} onClick={() => setMode("beat-time")}>
            <strong>Beat my time</strong>
            <span>I solved it. Can your friend do it faster?</span>
          </button>
          <button type="button" className={mode === "solve-this" ? styles.active : ""} onClick={() => setMode("solve-this")}>
            <strong>I bet you can’t</strong>
            <span>You could not finish it. Challenge a friend to solve it.</span>
          </button>
        </fieldset>

        <div className={styles.grid}>
          <label>
            Your name
            <input value={senderName} onChange={(event) => setSenderName(event.target.value)} maxLength={30} />
          </label>
          <label>
            Challenge title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} />
          </label>
        </div>

        <label>
          Message to your friend
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={180} rows={3} />
        </label>

        <label>
          Scramble notation
          <textarea value={scramble} onChange={(event) => setScramble(event.target.value)} rows={3} spellCheck={false} />
          <small>This will be captured directly from the playable cube in the next engine-integration step.</small>
        </label>

        {mode === "beat-time" && (
          <div className={styles.grid}>
            <label>
              Your time in seconds
              <input inputMode="decimal" value={timeSeconds} onChange={(event) => setTimeSeconds(event.target.value)} />
            </label>
            <label>
              Your move count
              <input inputMode="numeric" value={moves} onChange={(event) => setMoves(event.target.value)} />
            </label>
          </div>
        )}

        <button className={styles.submit} type="submit">Create share link</button>
      </form>

      {shareUrl && (
        <section className={styles.result} aria-live="polite">
          <p>CHALLENGE CREATED</p>
          <h2>Your link is ready</h2>
          <input readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
          <div>
            <button type="button" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
            <Link href={shareUrl.replace(window.location.origin, "")}>Preview challenge</Link>
          </div>
          <small>Local prototype: the link works on this browser. Database sharing will make it work across devices.</small>
        </section>
      )}
    </main>
  );
}
