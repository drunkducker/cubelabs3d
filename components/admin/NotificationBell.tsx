"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AdminNotification } from "@/lib/admin/notifications";

/*
 * Header notification bell. Shows a live count of unresolved security events +
 * open moderation reports and a dropdown of the most recent items.
 */
export function NotificationBell({ count, items }: { count: number | null; items: AdminNotification[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const badge = count && count > 0 ? (count > 99 ? "99+" : String(count)) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${badge ? `, ${badge} unread` : ""}`}
        aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] text-base"
      >
        🔔
        {badge && (
          <span className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2,#12161f)] shadow-[var(--shadow)]">
          <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-black">Notifications</div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">Nothing needs attention.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex items-start gap-2 border-b border-[var(--border)]/60 px-4 py-3 text-sm hover:bg-white/5">
                    <span aria-hidden="true" className={n.severity === "critical" ? "text-rose-400" : n.severity === "warning" ? "text-amber-400" : "text-sky-400"}>●</span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold capitalize">{n.text}</span>
                      <span className="text-xs text-[var(--muted)]">{new Date(n.created_at).toLocaleString()}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
