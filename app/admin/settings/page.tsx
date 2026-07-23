import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { getSettings, getFeatureFlags } from "@/lib/admin/settings";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, EmptyState, Notice, PageHeader, StatusPill } from "@/components/admin/ui";
import { saveSetting } from "@/app/admin/actions/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: { message?: string; error?: string } }) {
  const ctx = await requirePermission("settings.read");
  const canManage = hasPermission(ctx.role, "settings.manage"); // Owner-only
  const configured = isAdminConfigured();
  const [settings, flags] = configured ? await Promise.all([getSettings(), getFeatureFlags()]) : [[], []];

  return (
    <div>
      <PageHeader title="Settings & feature flags" subtitle="Typed configuration. Secret values live only in environment variables — the dashboard shows whether they are configured, never their contents." />
      {searchParams.message && <div className="mb-4"><Notice tone="info">{searchParams.message}</Notice></div>}
      {searchParams.error && <div className="mb-4"><Notice tone="danger">{searchParams.error}</Notice></div>}
      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — settings unavailable until the migration and service-role key are in place.</Notice></div>}

      {!canManage && (
        <div className="mb-4"><Notice tone="info">You have read-only access. Changing settings requires the Owner role.</Notice></div>
      )}

      {canManage && (
        <Card className="mb-4">
          <h2 className="mb-3 text-lg font-black">Create / update setting (Owner)</h2>
          <form action={saveSetting} className="grid gap-3 sm:grid-cols-2">
            <input name="key" required placeholder="key (e.g. gameplay.daily_scramble_enabled)" className="input" />
            <select name="category" className="input">
              {["general", "gameplay", "challenges", "leaderboards", "advertising", "email", "moderation", "security", "maintenance", "features", "integrations", "migration"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select name="data_type" className="input">
              {["string", "number", "boolean", "json"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select name="is_public" className="input">
              <option value="false">Private</option>
              <option value="true">Public</option>
            </select>
            <input name="value" placeholder="value" className="input sm:col-span-2" />
            <input name="description" placeholder="description" className="input sm:col-span-2" />
            <button className="min-h-[44px] rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white sm:col-span-2">Save setting</button>
          </form>
          <p className="mt-2 text-xs text-[var(--muted)]">Settings flagged secret in the database are rejected by the save action — secrets belong in environment variables.</p>
        </Card>
      )}

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-black">Settings</h2>
        {settings.length === 0 ? (
          <EmptyState title="No settings yet" hint="Create typed settings above." />
        ) : (
          <ul className="grid gap-2">
            {settings.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold">{s.key}</p>
                  <p className="text-xs text-[var(--muted)]">{s.category} · {s.data_type} · {s.description ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.is_secret ? <StatusPill status="warning" /> : <code className="max-w-[160px] truncate rounded bg-black/30 px-2 py-1 text-xs">{JSON.stringify(s.value)}</code>}
                  {s.is_public && <span className="text-[10px] font-black uppercase text-emerald-400">public</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-black">Feature flags</h2>
        {flags.length === 0 ? (
          <EmptyState title="No feature flags" hint="Feature flags support enabled state, environment, rollout %, and scheduling." />
        ) : (
          <ul className="grid gap-2">
            {flags.map((f) => (
              <li key={f.key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
                <div>
                  <p className="font-bold">{f.key}</p>
                  <p className="text-xs text-[var(--muted)]">{f.environment} · {f.rollout_percentage}% · {f.description ?? "—"}</p>
                </div>
                <StatusPill status={f.enabled ? "active" : "paused"} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
