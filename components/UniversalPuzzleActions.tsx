"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import {
  buildFriendChallengePayload,
  buildPuzzleSolvePayload,
  canSavePuzzleAttempt,
  type PuzzleAttemptSnapshot,
} from "@/lib/puzzle-attempt";

type MemoryRow = {
  id: string;
  title: string | null;
  scramble: string | null;
  cube_state: unknown;
  move_count: number | null;
  created_at: string;
};

const ROUTE_TYPES: Array<[RegExp, string]> = [
  [/\/skewb(?:\/|$)/, "skewb"],
  [/\/kilominx(?:\/|$)/, "kilominx"],
  [/\/pyraminx(?:\/|$)/, "pyraminx"],
  [/\/(?:solver\/)?3x3(?:\/|$)/, "3x3"],
  [/\/(?:solver\/)?4x4(?:\/|$)/, "4x4"],
  [/\/(?:solver\/)?5x5(?:\/|$)/, "5x5"],
  [/\/(?:play|solver)\/(\d+)x\1(?:\/|$)/, "nxn"],
];

function detectPuzzleType(pathname: string) {
  for (const [pattern, type] of ROUTE_TYPES) {
    const match = pathname.match(pattern);
    if (!match) continue;
    if (type === "nxn" && match[1]) return `${match[1]}x${match[1]}`;
    return type;
  }
  return null;
}

function readVisibleScramble() {
  const explicit = document.querySelector<HTMLElement>("[data-puzzle-scramble]");
  const explicitScramble = explicit?.dataset.puzzleScramble?.trim();
  if (explicitScramble) return explicitScramble;
  const labels = Array.from(document.querySelectorAll("p,span,h2,h3"));
  const label = labels.find((node) => node.textContent?.trim().toUpperCase() === "SCRAMBLE");
  const section = label?.closest("section");
  if (!section) return "";
  const candidates = Array.from(section.querySelectorAll("p")).filter((node) => node !== label);
  const text = candidates.map((node) => node.textContent?.trim() || "").find(Boolean) || "";
  return /tap .*scramble|no saved|loading/i.test(text) ? "" : text;
}

function formatElapsed(ms: number) {
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

type UniversalPuzzleActionsProps = {
  placement?: "floating" | "inline";
  puzzleType?: string;
  currentScramble?: string;
  onLoadScramble?: (scramble: string) => void;
  attempt?: PuzzleAttemptSnapshot;
};

export default function UniversalPuzzleActions({
  placement = "floating",
  puzzleType: explicitPuzzleType,
  currentScramble,
  onLoadScramble,
  attempt,
}: UniversalPuzzleActionsProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const routePuzzleType = useMemo(() => detectPuzzleType(pathname), [pathname]);
  const puzzleType = explicitPuzzleType || routePuzzleType;
  const active = Boolean(puzzleType) && !(placement === "floating" && puzzleType === "skewb");
  const challengeId = searchParams.get("challengeId") || searchParams.get("challenge_id") || "";
  const queryScramble = searchParams.get("scramble") || "";

  const [open, setOpen] = useState(false);
  const [scramble, setScramble] = useState(queryScramble);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [attemptTime, setAttemptTime] = useState("");
  const [attemptMoves, setAttemptMoves] = useState("");
  const [savedAttempt, setSavedAttempt] = useState<{ fingerprint: string; id: string } | null>(null);
  const [challengeLink, setChallengeLink] = useState("");
  const expanded = open;
  const normalizedScramble = scramble.trim();
  const attemptMatchesPuzzle = currentScramble === undefined ||
    normalizedScramble === currentScramble.trim();
  const attemptReady = Boolean(
    attempt && attemptMatchesPuzzle && canSavePuzzleAttempt(normalizedScramble, attempt),
  );
  const attemptFingerprint = attempt
    ? [puzzleType, normalizedScramble, Math.round(attempt.elapsedMs), attempt.moveCount].join("|")
    : "";

  const refresh = useCallback(async () => {
    if (!active || !puzzleType) return;
    const response = await fetch(`/api/solver-memory?puzzle_type=${encodeURIComponent(puzzleType)}`);
    if (response.status === 401) {
      setSignedIn(false);
      setMemories([]);
      return;
    }
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to load puzzle memory.");
    setSignedIn(true);
    setMemories((body.memories || []).filter((row: MemoryRow) => row.scramble));
  }, [active, puzzleType]);

  useEffect(() => {
    if (!active || !puzzleType) return;
    setScramble(queryScramble || currentScramble || "");
    const update = () => {
      if (queryScramble) return;
      setScramble(currentScramble ?? readVisibleScramble());
    };
    update();
    let loadTimer = 0;
    if (queryScramble) {
      // Delay until the puzzle component has installed its load listener.
      loadTimer = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("cube-labs:load-scramble", {
          detail: { puzzleType, scramble: queryScramble },
        }));
      }, 0);
    }
    const observer = currentScramble === undefined ? new MutationObserver(update) : null;
    observer?.observe(document.body, { childList: true, subtree: true, characterData: true });
    void refresh().catch((error) => toast(error instanceof Error ? error.message : "Unable to load puzzle memory."));
    return () => {
      observer?.disconnect();
      if (loadTimer) window.clearTimeout(loadTimer);
    };
  }, [active, currentScramble, puzzleType, queryScramble, refresh, toast]);

  useEffect(() => {
    setSavedAttempt(current =>
      current?.fingerprint === attemptFingerprint ? current : null,
    );
    setChallengeLink("");
  }, [attemptFingerprint]);

  if (!active || !puzzleType) return null;

  const applyScramble = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      toast("Add or choose a scramble first.");
      return;
    }
    setScramble(normalized);
    if (onLoadScramble) {
      onLoadScramble(normalized);
    } else {
      window.dispatchEvent(new CustomEvent("cube-labs:load-scramble", { detail: { puzzleType, scramble: normalized } }));
    }
    toast("Scramble loaded.");
  };

  const saveMemory = async () => {
    if (!scramble.trim()) {
      toast("Generate or enter a scramble before saving.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/solver-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzle_type: puzzleType,
          title: `${puzzleType} scramble`,
          scramble: scramble.trim(),
          cube_state: { scramble: scramble.trim() },
          move_count: scramble.trim().split(/\s+/).filter(Boolean).length,
          source: "solver",
        }),
      });
      const body = await response.json();
      if (response.status === 401) {
        setSignedIn(false);
        throw new Error("Sign in to save puzzle memory.");
      }
      if (!response.ok) throw new Error(body.error || "Unable to save puzzle memory.");
      setSignedIn(true);
      toast("Puzzle memory saved.");
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save puzzle memory.");
    } finally {
      setBusy(false);
    }
  };

  const saveAttemptRecord = async () => {
    if (!attempt || !attemptReady) {
      throw new Error(
        attempt?.assisted
          ? "Auto-solved attempts are not saved as completed results."
          : "Finish the timed solve before saving its result.",
      );
    }
    if (savedAttempt?.fingerprint === attemptFingerprint) return savedAttempt.id;

    const response = await fetch("/api/solves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPuzzleSolvePayload({
        puzzleType,
        scramble: normalizedScramble,
        attempt,
      })),
    });
    const body = await response.json();
    if (response.status === 401) {
      setSignedIn(false);
      throw new Error("Sign in to save completed results.");
    }
    if (!response.ok) throw new Error(body.error || "Unable to save this result.");
    const id = body.id || body.solve_id;
    if (!id) throw new Error("The result was saved without an id.");
    setSignedIn(true);
    setSavedAttempt({ fingerprint: attemptFingerprint, id });
    return id as string;
  };

  const saveResult = async () => {
    setBusy(true);
    try {
      await saveAttemptRecord();
      toast("Solve result saved.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save this result.");
    } finally {
      setBusy(false);
    }
  };

  const sendChallenge = async () => {
    if (!normalizedScramble) {
      toast("Generate or enter a scramble before challenging a friend.");
      return;
    }
    if (!recipient.trim()) {
      toast("Enter your friend's Cube Tag, username, or public slug.");
      return;
    }
    setBusy(true);
    try {
      const solveId = attemptReady ? await saveAttemptRecord() : undefined;
      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildFriendChallengePayload({
          recipient,
          puzzleType,
          scramble: normalizedScramble,
          message,
          senderSolveId: solveId,
          attempt,
        })),
      });
      const body = await response.json();
      if (response.status === 401) throw new Error("Sign in before challenging a friend.");
      if (!response.ok) throw new Error(body.error || "Unable to send challenge.");
      const sentTo = body.recipient_name || recipient.trim();
      if (body.id) setChallengeLink(`${window.location.origin}/challenge/${body.id}`);
      toast(attemptReady
        ? `Result saved and challenge sent to ${sentTo}.`
        : `Puzzle sent to ${sentTo}.`);
      setRecipient("");
      setMessage("");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to send challenge.");
    } finally {
      setBusy(false);
    }
  };

  const shareScramble = async () => {
    const normalized = scramble.trim();
    if (!normalized) {
      toast("Generate or enter a scramble before sharing.");
      return;
    }
    const url = new URL(pathname, window.location.origin);
    url.searchParams.set("scramble", normalized);
    const shareUrl = url.toString();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${puzzleType} challenge · Cube Lab 3D`,
          text: `Try this ${puzzleType} scramble: ${normalized}`,
          url: shareUrl,
        });
        toast("Puzzle shared.");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast("Share link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("Unable to share this puzzle.");
    }
  };

  const submitAttempt = async () => {
    if (!challengeId) return;
    if (attempt && !attemptReady) {
      toast(attempt.assisted
        ? "Reset and solve without Auto-solve before submitting this challenge."
        : "Finish this challenge on the puzzle before submitting it.");
      return;
    }
    let payload: Record<string, unknown>;
    if (attempt && attemptReady) {
      const tracked = buildPuzzleSolvePayload({
        puzzleType,
        scramble: normalizedScramble,
        attempt,
      });
      payload = {
        ...tracked,
        replay_data: {
          ...tracked.replay_data,
          source: "challenge",
          universal_panel: true,
        },
      };
    } else {
      const seconds = Number(attemptTime);
      const moves = attemptMoves.trim() ? Number(attemptMoves) : null;
      if (!Number.isFinite(seconds) || seconds < 0) {
        toast("Enter your solve time in seconds, such as 25.34.");
        return;
      }
      if (moves !== null && (!Number.isInteger(moves) || moves < 0)) {
        toast("Move count must be a whole number, zero or higher.");
        return;
      }
      payload = {
        puzzle_type: puzzleType,
        scramble: normalizedScramble,
        solve_time_ms: Math.round(seconds * 1000),
        move_count: moves,
        solved: true,
        is_dnf: false,
        replay_data: { source: "challenge", universal_panel: true },
      };
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to submit challenge attempt.");
      toast("Challenge attempt submitted.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to submit challenge attempt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={placement === "inline"
      ? "mt-3 w-full"
      : "fixed bottom-4 left-1/2 z-[80] w-[min(calc(100vw-2rem),428px)] -translate-x-1/2"}>
      {expanded ? (
        <section className={`glass overflow-y-auto rounded-[20px] border border-white/15 p-4 ${placement === "inline" ? "" : "max-h-[78dvh] shadow-2xl"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--green)]">{puzzleType} save + send</p>
              <h2 className="mt-1 text-lg font-black text-white">Save, share, or send this puzzle.</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="glass h-9 w-9 rounded-full font-black"
              aria-label={placement === "inline" ? "Collapse puzzle actions" : "Close puzzle actions"}
            >
              {placement === "inline" ? "−" : "×"}
            </button>
          </div>

          <label className="mt-4 block text-xs font-black text-[var(--muted)]">
            Current scramble / start state
            <textarea value={scramble} onChange={(event) => setScramble(event.target.value)} rows={3} placeholder="Generate a scramble or paste one here" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-3 font-mono text-xs text-white outline-none" />
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button onClick={() => applyScramble(scramble)} disabled={busy || !scramble.trim()} className="glass min-h-11 rounded-xl text-xs font-black disabled:opacity-40">Load</button>
            <button onClick={saveMemory} disabled={busy || !scramble.trim()} className="cta-green min-h-11 rounded-xl text-xs font-black disabled:opacity-40">Save Start</button>
            <button onClick={shareScramble} disabled={busy || !scramble.trim()} className="cta-purple min-h-11 rounded-xl text-xs font-black disabled:opacity-40">Share Link</button>
          </div>

          {attempt ? <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--blue)]">Timed result</p>
                <p className="mt-1 text-sm font-bold text-white">{formatElapsed(attempt.elapsedMs)} · {attempt.moveCount} moves</p>
              </div>
              <button
                onClick={saveResult}
                disabled={busy || !attemptReady || savedAttempt?.fingerprint === attemptFingerprint}
                className="cta-blue min-h-11 shrink-0 rounded-xl px-3 text-xs font-black disabled:opacity-40"
              >
                {savedAttempt?.fingerprint === attemptFingerprint
                  ? "Result Saved"
                  : attempt.assisted
                    ? "Auto-solved"
                    : attempt.solved
                      ? "Save Result"
                      : "Finish to Save"}
              </button>
            </div>
            {!attemptReady ? <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
              {attempt.assisted
                ? "Reset and solve without Auto-solve to save a result."
                : "The result unlocks when the timed puzzle is solved."}
            </p> : null}
          </div> : null}

          {signedIn === false ? <p className="mt-3 text-xs leading-5 text-[var(--muted)]"><Link href="/auth" className="font-black text-[var(--blue)]">Sign in</Link> to save results and send account challenges.</p> : null}

          {memories.length ? <div className="mt-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--muted)]">Saved memories</p>
            {memories.slice(0, 8).map((item) => <button key={item.id} onClick={() => applyScramble(item.scramble || "")} className="block w-full rounded-xl border border-[var(--border)] bg-black/20 p-3 text-left">
              <span className="block truncate font-mono text-xs text-white">{item.scramble}</span>
              <span className="mt-1 block text-[10px] text-[var(--muted)]">{item.move_count ?? "—"} moves · {new Date(item.created_at).toLocaleDateString()}</span>
            </button>)}
          </div> : null}

          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--gold)]">Challenge a friend</p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
              {attemptReady
                ? "Your timed result is saved and attached, so your friend can try to beat it."
                : "Send the exact start state now, or solve it first to attach your time and move count."}
            </p>
            <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Cube Tag, username, or slug" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 text-sm text-white outline-none" />
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Optional message" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 text-sm text-white outline-none" />
            <button onClick={sendChallenge} disabled={busy || !scramble.trim() || !recipient.trim()} className="cta-purple mt-2 min-h-11 w-full rounded-xl font-black disabled:opacity-40">
              {attemptReady ? "Save Result + Send Challenge" : "Send Exact Puzzle"}
            </button>
            {challengeLink ? <a href={challengeLink} className="mt-2 block break-all rounded-xl border border-[rgba(52,208,88,.3)] bg-[rgba(52,208,88,.08)] p-3 text-xs font-bold text-[var(--green)]">Open sent challenge: {challengeLink}</a> : null}
          </div>

          {challengeId ? <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--green)]">Submit this challenge attempt</p>
            {attempt ? (
              <p className="mt-2 rounded-xl border border-[var(--border)] bg-black/20 p-3 text-sm font-bold text-white">
                {formatElapsed(attempt.elapsedMs)} · {attempt.moveCount} moves
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input value={attemptTime} onChange={(event) => setAttemptTime(event.target.value)} inputMode="decimal" placeholder="Seconds" className="min-h-11 rounded-xl border border-[var(--border)] bg-black/30 px-3 text-sm text-white outline-none" />
                <input value={attemptMoves} onChange={(event) => setAttemptMoves(event.target.value)} inputMode="numeric" placeholder="Moves (optional)" className="min-h-11 rounded-xl border border-[var(--border)] bg-black/30 px-3 text-sm text-white outline-none" />
              </div>
            )}
            <button onClick={submitAttempt} disabled={busy || (attempt ? !attemptReady : !attemptTime.trim())} className="cta-green mt-2 min-h-11 w-full rounded-xl font-black disabled:opacity-40">Submit Solved Attempt</button>
          </div> : null}
        </section>
      ) : placement === "inline" ? (
        <section className="glass rounded-[18px] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--green)]">{puzzleType} save + send</p>
              <p className="mt-1 truncate text-sm font-bold text-[var(--muted)]">
                {scramble.trim() || "Scramble the puzzle to enable these actions."}
              </p>
            </div>
            <button onClick={() => setOpen(true)} className="glass h-9 shrink-0 rounded-lg px-3 text-xs font-black">Load / More</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={saveMemory} disabled={busy || !scramble.trim()} className="cta-green min-h-11 rounded-xl text-xs font-black disabled:opacity-40">Save Start</button>
            <button onClick={shareScramble} disabled={busy || !scramble.trim()} className="glass min-h-11 rounded-xl text-xs font-black disabled:opacity-40">Share Link</button>
            {attempt ? <button
              onClick={saveResult}
              disabled={busy || !attemptReady || savedAttempt?.fingerprint === attemptFingerprint}
              className="cta-blue min-h-11 rounded-xl text-xs font-black disabled:opacity-40"
            >
              {savedAttempt?.fingerprint === attemptFingerprint
                ? "Result Saved"
                : attempt.assisted
                  ? "Auto-solved"
                  : attempt.solved
                    ? "Save Result"
                    : "Finish to Save"}
            </button> : null}
            <button onClick={() => setOpen(true)} disabled={!scramble.trim()} className="cta-purple min-h-11 rounded-xl text-xs font-black disabled:opacity-40">Send to Friend</button>
          </div>
          {signedIn === false ? <p className="mt-3 text-xs leading-5 text-[var(--muted)]"><Link href="/auth" className="font-black text-[var(--blue)]">Sign in</Link> to save results and send account challenges.</p> : null}
        </section>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="cta-purple ml-auto flex min-h-12 items-center gap-2 rounded-full px-5 font-black shadow-2xl"
        >
          <span aria-hidden>↗</span> Save &amp; Friend Play
        </button>
      )}
    </div>
  );
}
