import Link from "next/link";
import type { Metric } from "@/lib/admin/overview";

/*
 * Shared, accessible admin UI primitives. Server-safe (no client hooks) so they
 * can be used directly inside server components.
 */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 ${className}`}>{children}</section>;
}

/*
 * Metric card that NEVER shows a fake zero — an unavailable metric renders a
 * clear "Unavailable" label instead of "0".
 */
export function MetricCard({ label, metric, href }: { label: string; metric: Metric; href?: string }) {
  const body = (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      {metric.available ? (
        <p className="mt-2 text-2xl font-black tabular-nums">{metric.value?.toLocaleString() ?? "0"}</p>
      ) : (
        <p className="mt-2 text-sm font-bold text-amber-400">{metric.note ?? "Unavailable"}</p>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-2)] p-6 text-center">
      <p className="font-bold">{title}</p>
      {hint && <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    passed: "bg-emerald-500/15 text-emerald-400",
    active: "bg-emerald-500/15 text-emerald-400",
    warning: "bg-amber-500/15 text-amber-400",
    failed: "bg-rose-500/15 text-rose-400",
    unavailable: "bg-slate-500/15 text-slate-300",
    manual: "bg-sky-500/15 text-sky-300",
    draft: "bg-slate-500/15 text-slate-300",
    paused: "bg-amber-500/15 text-amber-400",
    archived: "bg-slate-600/20 text-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${tone[status] ?? "bg-slate-500/15 text-slate-300"}`}>
      {status}
    </span>
  );
}

export function TestBadge() {
  return <span className="rounded-md bg-fuchsia-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-fuchsia-300">TEST DATA</span>;
}

/*
 * Notice banner used when the admin service is unconfigured or a migration is
 * pending, so the UI is honest instead of rendering fake empty states.
 */
export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "danger"; children: React.ReactNode }) {
  const tones = {
    info: "border-sky-500/40 bg-sky-500/10 text-sky-200",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    danger: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  };
  return <div className={`rounded-2xl border p-4 text-sm ${tones[tone]}`}>{children}</div>;
}
