import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, Notice, PageHeader, StatusPill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const MIGRATIONS = [
  "supabase/schema.sql",
  "20260722_cube_id_platform.sql",
  "20260722_cube_labs_mail_foundation.sql",
  "20260723_admin_platform.sql",
];

const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SITE_URL"];

const DATASETS = ["profiles", "solves", "challenges", "campaigns", "affiliate_products", "settings", "feature_flags"];

export default async function ExportsPage() {
  const ctx = await requirePermission("exports.create");
  const isOwner = ctx.role === "owner";
  const canMigrate = hasPermission(ctx.role, "migration.manage");

  return (
    <div>
      <PageHeader title="Exports & migration" subtitle="Bounded, audited data exports and provider-migration readiness. An export is a snapshot, not a verified backup." />

      <div className="mb-4"><Notice tone="warning">These CSV/JSON exports are snapshots for portability and review. They are <strong>not</strong> a verified backup or disaster-recovery guarantee. Test data is excluded by default.</Notice></div>

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-black">Create export</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {DATASETS.map((d) => (
            <div key={d} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
              <span className="font-bold">{d}</span>
              <span className="flex gap-2">
                <a href={`/api/admin/export?dataset=${d}&format=csv`} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-extrabold">CSV</a>
                <a href={`/api/admin/export?dataset=${d}&format=json`} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-extrabold">JSON</a>
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 px-3 py-2 text-sm">
            <span className="font-bold">audit_logs {isOwner ? "" : "(Owner only)"}</span>
            {isOwner ? (
              <a href="/api/admin/export?dataset=audit_logs&format=csv" className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs font-extrabold">CSV</a>
            ) : (
              <StatusPill status="warning" />
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Each export writes an audit record. Add <code>&amp;include_test=true</code> to include test data intentionally.</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-black">Migration readiness</h2>
          <ul className="grid gap-2 text-sm">
            {MIGRATIONS.map((m) => (
              <li key={m} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
                <code className="truncate">{m}</code>
                <StatusPill status="manual" />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">Committed to the repo. Applied-in-production status must be confirmed in Supabase and recorded in DAILY-LOG.md — it cannot be auto-detected here.</p>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-black">Environment inventory</h2>
          <ul className="grid gap-2 text-sm">
            {REQUIRED_ENV.map((k) => {
              const present = Boolean(process.env[k] || (k === "SUPABASE_URL" && process.env.NEXT_PUBLIC_SUPABASE_URL));
              return (
                <li key={k} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
                  <code className="truncate">{k}</code>
                  <StatusPill status={present ? "passed" : "warning"} />
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">Presence only — secret values are never displayed.</p>
        </Card>
      </div>

      {!isAdminConfigured() && <div className="mt-4"><Notice tone="warning">Admin service not configured — exports will fail until the service-role key is set.</Notice></div>}
      {!canMigrate && <div className="mt-4"><Notice tone="info">Full migration exports and destructive migration actions require the Owner role.</Notice></div>}
    </div>
  );
}
