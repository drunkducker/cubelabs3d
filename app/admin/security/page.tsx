import { requirePermission } from "@/lib/admin/auth";
import { getSecuritySummary } from "@/lib/admin/security";
import { Card, PageHeader, StatusPill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  await requirePermission("security.read");
  const { checks, events } = await getSecuritySummary();

  const summary = checks.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Security center" subtitle="Best-available status. Findings are labelled Passed, Warning, Failed, Unavailable, or Manual check required — we never claim automated verification where only a manual check was possible." />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["passed", "warning", "failed", "manual", "unavailable"] as const).map((s) => (
          <span key={s} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
            <StatusPill status={s} /> <span className="font-black">{summary[s] ?? 0}</span>
          </span>
        ))}
      </div>

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-black">Security checks</h2>
        <ul className="grid gap-2">
          {checks.map((c) => (
            <li key={c.id} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{c.label}</span>
                <StatusPill status={c.status} />
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{c.detail}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-black">Recent security events</h2>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No security events recorded (or the events table is not yet migrated).</p>
        ) : (
          <ul className="grid gap-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
                <div>
                  <p className="font-bold">{e.event_type}</p>
                  <p className="text-xs text-[var(--muted)]">{new Date(e.created_at).toLocaleString()}</p>
                </div>
                <StatusPill status={e.severity === "critical" ? "failed" : e.severity === "warning" ? "warning" : "manual"} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
