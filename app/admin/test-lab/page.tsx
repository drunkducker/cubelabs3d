import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { listRows } from "@/lib/admin/list";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, EmptyState, Notice, PageHeader, StatusPill, TestBadge } from "@/components/admin/ui";
import { generateTestSolves, cleanupTestRun } from "@/app/admin/actions/test-lab";

export const dynamic = "force-dynamic";

type TestRun = {
  id: string;
  name: string;
  purpose: string | null;
  status: string;
  cleanup_status: string;
  generated_counts: Record<string, number> | null;
  created_at: string;
  expires_at: string | null;
};

export default async function TestLabPage({ searchParams }: { searchParams: { message?: string; error?: string } }) {
  const ctx = await requirePermission("test_data.generate");
  const canDelete = hasPermission(ctx.role, "test_data.delete");
  const configured = isAdminConfigured();
  const runs = configured ? await listRows<TestRun>("/rest/v1/test_runs?select=id,name,purpose,status,cleanup_status,generated_counts,created_at,expires_at&order=created_at.desc") : [];

  return (
    <div>
      <PageHeader title="Test Lab" subtitle="Generate controlled QA records without solving a physical cube. All generated data is marked is_test and excluded from public rankings, real achievements, and production analytics." />
      {searchParams.message && <div className="mb-4"><Notice tone="info">{searchParams.message}</Notice></div>}
      {searchParams.error && <div className="mb-4"><Notice tone="danger">{searchParams.error}</Notice></div>}
      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — generation disabled until the migration and service-role key are in place.</Notice></div>}

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-black">Generate test solves</h2>
          <TestBadge />
        </div>
        <form action={generateTestSolves} className="grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Run name" className="input" />
          <input name="user_id" required placeholder="Target user ID (uuid)" className="input" />
          <select name="puzzle_type" className="input">
            {["2x2", "3x3", "4x4", "5x5", "pyraminx"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input name="count" type="number" min={1} max={200} defaultValue={10} placeholder="Count (max 200)" className="input" />
          <input name="base_time_ms" type="number" min={1000} defaultValue={15000} placeholder="Base time (ms)" className="input" />
          <input name="purpose" placeholder="Purpose" className="input" />
          <div className="flex gap-2 sm:col-span-2">
            <button name="dry_run" value="true" className="min-h-[44px] flex-1 rounded-xl border border-[var(--border)] px-4 text-sm font-extrabold">Dry run</button>
            <button name="dry_run" value="false" className="min-h-[44px] flex-1 rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white">Generate</button>
          </div>
        </form>
      </Card>

      <h2 className="mb-3 text-lg font-black">Test runs</h2>
      {runs.length === 0 ? (
        <EmptyState title="No test runs yet" hint="Generated QA data is grouped into runs so it can be cleaned up together." />
      ) : (
        <div className="grid gap-3">
          {runs.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-black">{r.name}</h3>
                    <StatusPill status={r.status === "active" ? "active" : r.status === "cleaned" ? "archived" : "warning"} />
                    <TestBadge />
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {r.purpose || "—"} · {Object.entries(r.generated_counts ?? {}).map(([k, v]) => `${v} ${k}`).join(", ") || "no counts"} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                {canDelete && r.status === "active" && (
                  <form action={cleanupTestRun}>
                    <input type="hidden" name="run_id" value={r.id} />
                    <button className="min-h-[40px] rounded-xl bg-rose-600 px-3 text-sm font-extrabold text-white">Clean up run</button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
