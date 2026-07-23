import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, Notice, PageHeader, StatusPill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/*
 * Content management. Announcements and maintenance notices are stored as typed
 * site_settings (structured, sanitized) rather than raw HTML — no arbitrary
 * unsafe markup is accepted. Full Learn/help authoring is a scheduled follow-up
 * tracked in the roadmap; it must not turn into a homepage redesign.
 */
export default async function ContentPage() {
  await requirePermission("content.manage");
  const configured = isAdminConfigured();
  const settings = configured ? await getSettings() : [];
  const contentSettings = settings.filter((s) => s.category === "maintenance" || s.category === "general" || s.key.startsWith("content."));

  return (
    <div>
      <PageHeader title="Content" subtitle="Managed announcements, maintenance notices, and structured content blocks. Raw unsafe HTML is never accepted." />

      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — content management disabled until the migration and service-role key are in place.</Notice></div>}

      <div className="mb-4">
        <Notice tone="info">
          Announcements and maintenance messages are edited as typed settings (draft → published) on the{" "}
          <Link href="/admin/settings" className="font-extrabold underline">Settings</Link> page so they stay structured and sanitized. Learn-page and help authoring with the draft/preview/scheduled/published/archived workflow is the next content build step.
        </Notice>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-black">Current content settings</h2>
        {contentSettings.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No content settings yet. Add a <code>maintenance.notice</code> or <code>content.*</code> setting to publish a managed message.</p>
        ) : (
          <ul className="grid gap-2">
            {contentSettings.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold">{s.key}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{JSON.stringify(s.value)}</p>
                </div>
                <StatusPill status={s.is_public ? "active" : "draft"} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
