"use client";

/**
 * Reusable "saved scrambles" panel for solver pages. Signed-in users can save
 * the current scramble to their solver memory (POST /api/solver-memory) and
 * load any previously saved scramble back onto the puzzle. Guests get a gentle
 * sign-in prompt instead of an error — the API returns 401 for them, which we
 * treat as "not signed in" rather than a failure.
 *
 * Kept puzzle-agnostic (it only deals in the scramble NOTATION string), so the
 * same panel works for any solver: pass the puzzle type, the current scramble,
 * and an `onLoad` that applies a scramble string to that puzzle.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "./Toast";

type SavedScramble = {
  id: string;
  title: string | null;
  scramble: string | null;
  move_count: number | null;
  created_at: string;
};

export default function SavedScrambles({
  puzzleType,
  currentScramble,
  onLoad,
}: {
  puzzleType: string;
  currentScramble: string;
  onLoad: (scramble: string) => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<SavedScramble[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // null = unknown yet, true/false = whether the visitor is signed in.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/solver-memory?puzzle_type=${encodeURIComponent(puzzleType)}`);
      if (res.status === 401) { setSignedIn(false); setItems([]); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load saved scrambles.");
      setSignedIn(true);
      // Only scramble-bearing memories are relevant here.
      setItems((data.memories as SavedScramble[]).filter(m => m.scramble));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to load saved scrambles.");
    } finally {
      setLoading(false);
    }
  }, [puzzleType, toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = async () => {
    if (!currentScramble) { toast("Scramble first, then save it."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/solver-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzle_type: puzzleType,
          title: `${puzzleType} scramble`,
          scramble: currentScramble,
          cube_state: { scramble: currentScramble },
          move_count: currentScramble.trim().split(/\s+/).filter(Boolean).length,
          source: "solver",
        }),
      });
      const data = await res.json();
      if (res.status === 401) { setSignedIn(false); toast("Sign in to save scrambles."); return; }
      if (!res.ok) throw new Error(data.error || "Unable to save scramble.");
      setSignedIn(true);
      toast("Scramble saved.");
      void refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save scramble.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass mt-3 rounded-[18px] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SAVED SCRAMBLES</p>
        <button
          onClick={save}
          disabled={saving || !currentScramble}
          className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-1.5 text-xs font-extrabold text-[var(--text)] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save current"}
        </button>
      </div>

      {signedIn === false ? (
        <p className="mt-3 text-[13px] leading-5 text-[var(--muted)]">
          <Link href="/auth" className="font-bold text-[var(--blue)]">Sign in</Link> to save scrambles and reload them on any device.
        </p>
      ) : loading && !items.length ? (
        <p className="mt-3 text-[13px] text-[var(--muted)]">Loading…</p>
      ) : items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map(item => (
            <li key={item.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/[0.03] p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[12px] leading-5 text-[var(--text)]">{item.scramble}</p>
                <p className="text-[11px] text-[var(--muted)]">{item.move_count ?? "—"} moves · {new Date(item.created_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => onLoad(item.scramble!)}
                className="flex-none rounded-lg border border-[var(--border)] bg-white/5 px-3 py-1.5 text-xs font-extrabold text-[var(--text)]"
              >
                Load
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-[var(--muted)]">No saved scrambles yet. Scramble, then tap “Save current”.</p>
      )}
    </section>
  );
}
