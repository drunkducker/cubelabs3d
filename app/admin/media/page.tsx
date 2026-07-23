import { requirePermission } from "@/lib/admin/auth";
import { listMedia } from "@/lib/admin/media";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, EmptyState, Notice, PageHeader, StatusPill } from "@/components/admin/ui";
import { MediaUploader } from "@/components/admin/MediaUploader";

export const dynamic = "force-dynamic";

function kb(bytes: number | null) {
  if (bytes == null) return "—";
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function MediaPage() {
  await requirePermission("content.manage");
  const configured = isAdminConfigured();
  const assets = configured ? await listMedia() : [];

  return (
    <div>
      <PageHeader title="Media library" subtitle="Upload and manage ad, carousel, and tutorial images. Files are validated by content (not extension), stored privately, and tracked by stable metadata — never by a provider URL." />

      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — media library disabled until the service-role key and migration are in place.</Notice></div>}

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-black">Upload image</h2>
        <MediaUploader />
        <p className="mt-2 text-xs text-[var(--muted)]">
          PNG, JPEG, GIF, or WebP up to 5 MB. Requires a private Supabase Storage bucket named <code>admin-media</code>. Type is verified by magic bytes server-side.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-black">Assets</h2>
        {assets.length === 0 ? (
          <EmptyState title="No media yet" hint="Uploaded images appear here with their metadata and moderation status." />
        ) : (
          <ul className="grid gap-2">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold">{a.object_key}</p>
                  <p className="text-xs text-[var(--muted)]">{a.mime_type ?? "—"} · {kb(a.size_bytes)} · {a.alt_text ? `“${a.alt_text}”` : "no alt text"}</p>
                </div>
                <StatusPill status={a.moderation_status === "approved" ? "passed" : a.moderation_status === "rejected" ? "failed" : "warning"} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
