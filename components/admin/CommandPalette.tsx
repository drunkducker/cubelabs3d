"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminNavItem } from "./nav";

/*
 * Command palette (Cmd/Ctrl-K). Fuzzy-filters the role-visible admin sections
 * and jumps to them. Also supports "user <id-or-term>" to jump straight to the
 * user search. Keyboard-first and accessible.
 */
export function CommandPalette({ items }: { items: AdminNavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const userMatch = /^user\s+(.+)/i.exec(q.trim());
    const base = items.map((i) => ({ label: i.label, href: i.href, hint: "Section" }));
    if (userMatch) return [{ label: `Search users: "${userMatch[1]}"`, href: `/admin/users?q=${encodeURIComponent(userMatch[1])}`, hint: "Users" }, ...base];
    if (!q.trim()) return base;
    const needle = q.toLowerCase();
    return base.filter((r) => r.label.toLowerCase().includes(needle));
  }, [q, items]);

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--muted)] md:flex"
        aria-label="Open command palette"
      >
        <span>Search</span>
        <kbd className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2,#12161f)] shadow-[var(--shadow)]">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === "Enter" && results[active]) goTo(results[active].href);
              }}
              placeholder="Jump to a section, or type: user <name>"
              className="w-full border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none"
            />
            <ul className="max-h-80 overflow-y-auto p-1">
              {results.map((r, i) => (
                <li key={r.href}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => goTo(r.href)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-[var(--blue)]/15 text-[var(--blue)]" : ""}`}
                  >
                    <span>{r.label}</span>
                    <span className="text-[10px] uppercase text-[var(--faint)]">{r.hint}</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">No matches.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
