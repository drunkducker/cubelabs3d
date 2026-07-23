import { requirePermission } from "@/lib/admin/auth";
import { listRows } from "@/lib/admin/list";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, EmptyState, Notice, PageHeader, StatusPill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  previous_value: unknown;
  new_value: unknown;
  reason: string | null;
  success: boolean;
  failure_category: string | null;
  correlation_id: string | null;
  created_at: string;
};

export default async function AuditPage({ searchParams }: { searchParams: { action?: string; target_type?: string; success?: string; page?: string } }) {
  await requirePermission("audit.read");
  const configured = isAdminConfigured();
  const page = Math.max(0, parseInt(searchParams.page ?? "0", 10) || 0);

  const filters: string[] = [];
  if (searchParams.action) filters.push(`action=ilike.*${encodeURIComponent(searchParams.action)}*`);
  if (searchParams.target_type) filters.push(`target_type=eq.${encodeURIComponent(searchParams.target_type)}`);
  if (searchParams.success === "true" || searchParams.success === "false") filters.push(`success=eq.${searchParams.success}`);
  const query = filters.length ? `&${filters.join("&")}` : "";

  const rows = configured
    ? await listRows<AuditRow>(`/rest/v1/admin_audit_log?select=id,actor_id,actor_role,action,target_type,target_id,previous_value,new_value,reason,success,failure_category,correlation_id,created_at&order=created_at.desc${query}`, page, 25)
    : [];

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Append-only record of privileged actions. Values are redacted before storage. Ordinary admins cannot edit or delete entries." />
      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — audit log unavailable until the migration and service-role key are in place.</Notice></div>}

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Action<input name="action" defaultValue={searchParams.action} placeholder="e.g. user.suspend" className="input mt-1 w-48" /></label>
          <label className="text-sm">Target type<input name="target_type" defaultValue={searchParams.target_type} placeholder="user, solve…" className="input mt-1 w-40" /></label>
          <label className="text-sm">Result
            <select name="success" defaultValue={searchParams.success ?? ""} className="input mt-1 w-32">
              <option value="">Any</option>
              <option value="true">Success</option>
              <option value="false">Failure</option>
            </select>
          </label>
          <button className="min-h-[44px] rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white">Filter</button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No audit records" hint="Privileged actions will populate this log." />
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <details key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <strong>{r.action}</strong>
                  <span className="ml-2 text-xs text-[var(--muted)]">{r.actor_role ?? "—"} · {r.target_type ?? "—"}:{(r.target_id ?? "").slice(0, 10)} · {new Date(r.created_at).toLocaleString()}</span>
                </span>
                <StatusPill status={r.success ? "passed" : "failed"} />
              </summary>
              <dl className="mt-3 grid gap-2 text-xs">
                <div><dt className="font-bold text-[var(--muted)]">Reason</dt><dd>{r.reason ?? "—"}</dd></div>
                <div><dt className="font-bold text-[var(--muted)]">Correlation ID</dt><dd className="font-mono">{r.correlation_id ?? "—"}</dd></div>
                {r.failure_category && <div><dt className="font-bold text-[var(--muted)]">Failure</dt><dd>{r.failure_category}</dd></div>}
                <div>
                  <dt className="font-bold text-[var(--muted)]">Previous → New</dt>
                  <dd className="grid gap-2 sm:grid-cols-2">
                    <pre className="overflow-x-auto rounded-lg bg-black/30 p-2">{JSON.stringify(r.previous_value ?? null, null, 2)}</pre>
                    <pre className="overflow-x-auto rounded-lg bg-black/30 p-2">{JSON.stringify(r.new_value ?? null, null, 2)}</pre>
                  </dd>
                </div>
              </dl>
            </details>
          ))}
          <div className="mt-2 flex items-center justify-between text-sm">
            {page > 0 ? <a href={`?page=${page - 1}`} className="font-extrabold text-[var(--blue)]">← Previous</a> : <span />}
            <span className="text-[var(--muted)]">Page {page + 1}</span>
            {rows.length === 25 ? <a href={`?page=${page + 1}`} className="font-extrabold text-[var(--blue)]">Next →</a> : <span />}
          </div>
        </div>
      )}
    </div>
  );
}
