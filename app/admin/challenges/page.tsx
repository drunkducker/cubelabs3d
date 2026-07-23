import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { listRows } from "@/lib/admin/list";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, EmptyState, Notice, PageHeader, StatusPill, TestBadge } from "@/components/admin/ui";
import { moderateChallenge } from "@/app/admin/actions/challenges";

export const dynamic = "force-dynamic";

type Challenge = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  puzzle_type: string;
  status: string;
  dispute_status: string;
  sender_time_ms: number | null;
  recipient_time_ms: number | null;
  winner_id: string | null;
  is_test: boolean;
  expires_at: string | null;
  created_at: string;
};

function fmt(ms: number | null) {
  return ms == null ? "—" : `${(ms / 1000).toFixed(2)}s`;
}

export default async function ChallengesPage({ searchParams }: { searchParams: { status?: string; message?: string; error?: string } }) {
  const ctx = await requirePermission("challenges.read");
  const canModerate = hasPermission(ctx.role, "challenges.moderate");
  const configured = isAdminConfigured();
  const status = (searchParams.status ?? "all").slice(0, 20);
  const statusFilter = status !== "all" ? `&status=eq.${status}` : "";
  const rows = configured
    ? await listRows<Challenge>(`/rest/v1/challenges?select=id,sender_id,recipient_id,puzzle_type,status,dispute_status,sender_time_ms,recipient_time_ms,winner_id,is_test,expires_at,created_at${statusFilter}&order=created_at.desc`, 0, 25)
    : [];

  return (
    <div>
      <PageHeader title="Challenges" subtitle="Inspect and moderate account-to-account challenges. Result changes require a reason and are audited; server validation remains the authority. Share tokens are never displayed." />
      {searchParams.message && <div className="mb-4"><Notice tone="info">{searchParams.message}</Notice></div>}
      {searchParams.error && <div className="mb-4"><Notice tone="danger">{searchParams.error}</Notice></div>}
      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — challenge moderation disabled until the migration and service-role key are in place.</Notice></div>}

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Status
            <select name="status" defaultValue={status} className="input ml-2 inline-block w-auto">
              {["all", "pending", "accepted", "completed", "declined", "expired"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button className="min-h-[44px] rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white">Filter</button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No challenges" hint="Challenges will appear here as players create them." />
      ) : (
        <div className="grid gap-3">
          {rows.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong>{c.puzzle_type} challenge</strong>
                    <StatusPill status={c.status === "completed" ? "passed" : c.status === "declined" || c.status === "expired" ? "archived" : "warning"} />
                    {c.dispute_status !== "none" && <span className="rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-rose-300">{c.dispute_status}</span>}
                    {c.is_test && <TestBadge />}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {c.sender_id.slice(0, 8)}… ({fmt(c.sender_time_ms)}) vs {c.recipient_id ? `${c.recipient_id.slice(0, 8)}… (${fmt(c.recipient_time_ms)})` : "guest/open"} · {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {canModerate && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["cancel", "reopen", "expire", "force_complete", "mark_disputed", "resolve_dispute"] as const).map((d) => (
                    <form key={d} action={moderateChallenge} className="flex items-center">
                      <input type="hidden" name="challenge_id" value={c.id} />
                      <input type="hidden" name="decision" value={d} />
                      <input type="hidden" name="reason" value={`Admin: ${d}`} />
                      <button className="min-h-[40px] rounded-xl border border-[var(--border)] px-3 text-xs font-extrabold">{d.replace("_", " ")}</button>
                    </form>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
