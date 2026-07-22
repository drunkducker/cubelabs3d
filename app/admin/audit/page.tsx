import { requireAdmin } from "@/app/lib/admin";
import { supabaseRequest } from "@/app/lib/supabase-rest";

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  success: boolean;
  created_at: string;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default async function AuditLogPage() {
  // Audit is limited to owner/admin/moderator.
  const { token } = await requireAdmin(["owner", "admin", "moderator"]);

  let rows: AuditRow[] = [];
  let loadError = false;
  try {
    rows = await supabaseRequest<AuditRow[]>(
      "/rest/v1/admin_audit_log?select=*&order=created_at.desc&limit=100",
      {},
      token,
    );
  } catch {
    loadError = true;
  }

  return (
    <div className="grid gap-5">
      <header>
        <h1 className="text-2xl font-black tracking-[-0.02em]">Audit Log</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Every privileged action is recorded here. Most recent first (last 100).</p>
      </header>

      {loadError ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
          Could not load the audit log. Confirm the admin foundation migration has been run.
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-sm text-[var(--muted)]">
          No audit entries yet. Privileged actions will appear here as admin tools are used.
        </div>
      ) : (
        <div className="cube-card overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3 font-black">Time</th>
                <th className="px-4 py-3 font-black">Role</th>
                <th className="px-4 py-3 font-black">Action</th>
                <th className="px-4 py-3 font-black">Target</th>
                <th className="px-4 py-3 font-black">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]/60">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{formatWhen(row.created_at)}</td>
                  <td className="px-4 py-3 font-bold text-[var(--blue)]">{row.actor_role ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">{row.action}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{row.target_type ? `${row.target_type}${row.target_id ? `:${row.target_id}` : ""}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-black ${row.success ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>
                      {row.success ? "OK" : "FAIL"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
