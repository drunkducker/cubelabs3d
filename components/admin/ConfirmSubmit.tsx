"use client";

import { useRef } from "react";

/*
 * Accessible confirm-then-submit control for impactful one-click actions.
 * Uses the native <dialog> element (focus trap + Esc handled by the platform,
 * no dependency). Must be rendered inside the <form> it submits.
 */
export function ConfirmSubmit({
  label,
  title,
  message,
  confirmLabel = "Confirm",
  className = "",
  tone = "danger",
}: {
  label: string;
  title: string;
  message: string;
  confirmLabel?: string;
  className?: string;
  tone?: "danger" | "primary";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className={className} onClick={() => dialogRef.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="w-[90vw] max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface-2,#12161f)] p-0 text-[var(--text)] backdrop:bg-black/60"
      >
        <div className="p-5">
          <h2 className="text-lg font-black">{title}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-[44px] rounded-xl border border-[var(--border)] px-4 text-sm font-extrabold"
            >
              Cancel
            </button>
            {/* type=submit submits the enclosing form */}
            <button
              type="submit"
              className={`min-h-[44px] rounded-xl px-4 text-sm font-extrabold text-white ${tone === "danger" ? "bg-rose-600" : "bg-[var(--blue)]"}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
