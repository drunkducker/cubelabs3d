import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/admin/overview";
import { Card, MetricCard, Notice, PageHeader, StatusPill } from "@/components/admin/ui";
import { BarChart, Donut } from "@/components/admin/Charts";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requirePermission("admin.overview.read");
  const overview = await getAdminOverview();
  const m = overview.metrics;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Operational health of Cube Labs. Metrics that cannot be retrieved are shown as Unavailable rather than a misleading zero."
      />

      {!overview.configured && (
        <div className="mb-5">
          <Notice tone="warning">
            <strong>Admin service not configured.</strong> Set <code>SUPABASE_URL</code> and{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> (server-only) and run{" "}
            <code>supabase/migrations/20260723_admin_platform.sql</code> to enable live metrics.
          </Notice>
        </div>
      )}

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Total users" metric={m.totalUsers ?? unavailable()} href="/admin/users" />
        <MetricCard label="New users (7d)" metric={m.newUsers7d ?? unavailable()} />
        <MetricCard label="Total solves" metric={m.totalSolves ?? unavailable()} />
        <MetricCard label="Solves today" metric={m.solvesToday ?? unavailable()} />
        <MetricCard label="Challenges created" metric={m.challengesCreated ?? unavailable()} href="/admin/challenges" />
        <MetricCard label="Challenges completed" metric={m.challengesCompleted ?? unavailable()} />
        <MetricCard label="Suspicious pending" metric={m.suspiciousPending ?? unavailable()} href="/admin/leaderboards" />
        <MetricCard label="Active campaigns" metric={m.activeCampaigns ?? unavailable()} href="/admin/ads" />
        <MetricCard label="Unresolved reports" metric={m.unresolvedReports ?? unavailable()} href="/admin/challenges" />
        <MetricCard label="Failed actions (7d)" metric={m.failedActions7d ?? unavailable()} href="/admin/security" />
        <MetricCard label="Security alerts" metric={m.securityAlerts ?? unavailable()} href="/admin/security" />
        <MetricCard label="Test-data solves" metric={m.testSolves ?? unavailable()} href="/admin/test-lab" />
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <Card>
          <h2 className="mb-3 text-lg font-black">Solves — last 7 days</h2>
          {overview.solveTrend.available ? (
            <BarChart data={overview.solveTrend.points} label="Production solves per day, last 7 days" />
          ) : (
            <p className="py-8 text-center text-sm font-bold text-amber-400">Trend unavailable — apply the migration and configure the service-role key.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-black">Challenge completion</h2>
          {m.challengesCreated?.available && m.challengesCompleted?.available ? (
            <div className="flex items-center gap-4">
              <Donut value={m.challengesCompleted.value ?? 0} total={m.challengesCreated.value ?? 0} label="Challenges completed" />
              <div className="text-sm">
                <p className="tabular-nums"><strong>{(m.challengesCompleted.value ?? 0).toLocaleString()}</strong> completed</p>
                <p className="tabular-nums text-[var(--muted)]">of {(m.challengesCreated.value ?? 0).toLocaleString()} created</p>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm font-bold text-amber-400">Unavailable</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-black">Recent administrative actions</h2>
          {overview.recentActions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No audit records yet. Privileged actions will appear here.</p>
          ) : (
            <ul className="grid gap-2">
              {overview.recentActions.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{a.action}</p>
                    <p className="text-xs text-[var(--muted)]">{a.actor_role ?? "—"} · {new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <StatusPill status={a.success ? "passed" : "failed"} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/audit" className="mt-3 inline-block text-sm font-extrabold text-[var(--blue)]">Open full audit log →</Link>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-black">Provider &amp; deployment health</h2>
          <ul className="grid gap-2 text-sm">
            <HealthRow label="Database / Supabase" status={overview.configured ? "passed" : "warning"} note={overview.configured ? "Service-role reachable" : "Not configured"} />
            <HealthRow label="Email provider (SES)" status="manual" note="Delivery verified manually — see AUTHENTICATION.md" />
            <HealthRow label="Deployment (Vercel)" status="manual" note="Confirm in Vercel dashboard" />
            <HealthRow label="Migration status" status="manual" note="Confirm 20260722 + 20260723 migrations applied" />
          </ul>
          <Link href="/admin/security" className="mt-3 inline-block text-sm font-extrabold text-[var(--blue)]">Open security center →</Link>
        </Card>
      </div>
    </div>
  );
}

function unavailable() {
  return { value: null, available: false, note: "Unavailable" };
}

function HealthRow({ label, status, note }: { label: string; status: string; note: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
      <span className="font-bold">{label}</span>
      <span className="flex items-center gap-2">
        <span className="hidden text-xs text-[var(--muted)] sm:inline">{note}</span>
        <StatusPill status={status} />
      </span>
    </li>
  );
}
