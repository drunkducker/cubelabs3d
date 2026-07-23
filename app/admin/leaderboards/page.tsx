import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { listRows } from "@/lib/admin/list";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, EmptyState, Notice, PageHeader, StatusPill, TestBadge } from "@/components/admin/ui";
import { reviewLeaderboardEntry, correctSolveTime } from "@/app/admin/actions/leaderboards";

export const dynamic = "force-dynamic";

type SolveRow = {
  id: string;
  user_id: string;
  puzzle_type: string;
  solve_time_ms: number | null;
  move_count: number | null;
  is_test: boolean;
  assisted: boolean;
  leaderboard_eligible: boolean;
  is_suspicious: boolean;
  moderation_status: string;
  original_time_ms: number | null;
  created_at: string;
};

function fmt(ms: number | null) {
  return ms == null ? "—" : `${(ms / 1000).toFixed(2)}s`;
}

export default async function LeaderboardsPage({ searchParams }: { searchParams: { puzzle?: string; view?: string; message?: string; error?: string } }) {
  const ctx = await requirePermission("leaderboards.read");
  const canModerate = hasPermission(ctx.role, "leaderboards.moderate");
  const configured = isAdminConfigured();
  const puzzle = (searchParams.puzzle ?? "3x3").slice(0, 12);
  const view = searchParams.view === "suspicious" ? "suspicious" : "top";

  const filter = view === "suspicious"
    ? `&is_suspicious=eq.true`
    : `&is_test=eq.false&leaderboard_eligible=eq.true&is_dnf=eq.false&solve_time_ms=not.is.null`;
  const order = view === "suspicious" ? "created_at.desc" : "solve_time_ms.asc";
  const rows = configured
    ? await listRows<SolveRow>(`/rest/v1/solve_results?puzzle_type=eq.${puzzle}${filter}&select=id,user_id,puzzle_type,solve_time_ms,move_count,is_test,assisted,leaderboard_eligible,is_suspicious,moderation_status,original_time_ms,created_at&order=${order}`, 0, 25)
    : [];

  return (
    <div>
      <PageHeader title="Leaderboards" subtitle="Review rankings and the suspicious-result queue. Overrides preserve the original attempt; they never silently overwrite it." />
      {searchParams.message && <div className="mb-4"><Notice tone="info">{searchParams.message}</Notice></div>}
      {searchParams.error && <div className="mb-4"><Notice tone="danger">{searchParams.error}</Notice></div>}
      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — leaderboard moderation disabled until the migration and service-role key are in place.</Notice></div>}

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Puzzle
            <select name="puzzle" defaultValue={puzzle} className="input ml-2 inline-block w-auto">
              {["2x2", "3x3", "4x4", "5x5", "pyraminx"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-sm">View
            <select name="view" defaultValue={view} className="input ml-2 inline-block w-auto">
              <option value="top">Top eligible</option>
              <option value="suspicious">Suspicious queue</option>
            </select>
          </label>
          <button className="min-h-[44px] rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white">Apply</button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No entries" hint={view === "suspicious" ? "No entries are flagged suspicious." : "No eligible ranked solves for this puzzle yet."} />
      ) : (
        <div className="grid gap-3">
          {rows.map((r, i) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tabular-nums">#{view === "top" ? i + 1 : "—"}</span>
                    <strong className="tabular-nums">{fmt(r.solve_time_ms)}</strong>
                    {r.original_time_ms != null && r.original_time_ms !== r.solve_time_ms && (
                      <span className="text-xs text-amber-400">(orig {fmt(r.original_time_ms)})</span>
                    )}
                    {r.is_test && <TestBadge />}
                    {r.is_suspicious && <StatusPill status="warning" />}
                    {r.assisted && <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase">Assisted</span>}
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]">
                    user {r.user_id.slice(0, 8)}… · {r.move_count ?? "—"} moves · {r.moderation_status} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {canModerate && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ReviewButton solveId={r.id} decision="mark_valid" label="Mark valid" />
                  <ReviewButton solveId={r.id} decision="mark_suspicious" label="Flag suspicious" />
                  <ReviewButton solveId={r.id} decision="exclude" label="Exclude" />
                  <ReviewButton solveId={r.id} decision="restore" label="Restore" />
                  <form action={correctSolveTime} className="flex items-center gap-1">
                    <input type="hidden" name="solve_id" value={r.id} />
                    <input name="new_time_ms" type="number" placeholder="new ms" className="input w-24" />
                    <input name="reason" placeholder="reason" className="input w-28" required />
                    <button className="min-h-[40px] rounded-xl border border-[var(--border)] px-3 text-xs font-extrabold">Correct time</button>
                  </form>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewButton({ solveId, decision, label }: { solveId: string; decision: string; label: string }) {
  return (
    <form action={reviewLeaderboardEntry} className="flex items-center gap-1">
      <input type="hidden" name="solve_id" value={solveId} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="reason" value={`Admin review: ${decision}`} />
      <button className="min-h-[40px] rounded-xl border border-[var(--border)] px-3 text-xs font-extrabold">{label}</button>
    </form>
  );
}
