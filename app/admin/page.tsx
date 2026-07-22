import Link from "next/link";
import { requireAdmin, hasAnyRole } from "@/app/lib/admin";
import { getData } from "@/app/lib/data";
import { ADMIN_NAV } from "./adminNav";

type SearchParams = { searchParams?: { error?: string } };

export default async function AdminDashboard({ searchParams = {} }: SearchParams) {
  const { role, token } = await requireAdmin();
  const m = await getData().metrics.dashboard({ accessToken: token });

  const fmt = (n: number | undefined) => (n == null ? "—" : n.toLocaleString());
  const solveRate = m && m.solves > 0 ? `${Math.round((m.solves_solved / m.solves) * 100)}%` : "—";

  // All values come from the security-definer admin_dashboard_metrics() RPC.
  const tiles: { label: string; value: string; live: boolean }[] = [
    { label: "Players", value: fmt(m?.players), live: true },
    { label: "Solves", value: fmt(m?.solves), live: true },
    { label: "Solve rate", value: solveRate, live: true },
    { label: "Active ads", value: fmt(m?.ads_active), live: true },
    { label: "Ad clicks", value: fmt(m?.ad_clicks), live: true },
    { label: "Ad impressions", value: fmt(m?.ad_impressions), live: true },
  ];
  const metricsUnavailable = m == null;

  return (
    <div className="grid gap-5">
      <header>
        <h1 className="accent-text text-2xl font-black tracking-[-0.02em]">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Owner-operated control center. You are signed in as <span className="font-bold text-[var(--blue)]">{role}</span>.</p>
      </header>

      {searchParams.error && (
        <div role="status" className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
          {searchParams.error}
        </div>
      )}

      {metricsUnavailable && (
        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm font-semibold text-yellow-100">
          Live metrics are unavailable. Confirm <code>20260722_admin_metrics.sql</code> (plus the foundation and ads migrations) have been run.
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="cube-card rounded-2xl p-4">
            <div className="text-xs font-bold text-[var(--muted)]">{tile.label}</div>
            <div className="mt-2 text-2xl font-black">{tile.value}</div>
            {!tile.live && <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-[var(--faint)]">Data pending</div>}
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-[var(--muted)]">Control sections</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ADMIN_NAV.filter((item) => item.href !== "/admin" && (!item.roles || hasAnyRole(role, item.roles))).map((item) => (
            <div key={item.href} className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
              <div className="min-w-0">
                <div className="font-extrabold">{item.label}</div>
                {item.note && <div className="truncate text-xs text-[var(--muted)]">{item.note}</div>}
              </div>
              {item.ready ? (
                <Link href={item.href} className="flex-none rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-black text-[var(--blue)]">
                  Open
                </Link>
              ) : (
                <span className="flex-none rounded-lg bg-[var(--surface-2)] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--faint)]">Soon</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs leading-5 text-[var(--faint)]">
        Metrics are read live via the security-definer <code>admin_dashboard_metrics()</code> function (admin-only, no service key). Priority build order: managed ads, YouTube videos, and affiliate links, then user and test-lab tools.
      </p>
    </div>
  );
}
