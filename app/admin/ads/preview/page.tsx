import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import AdSlot from "@/components/ads/AdSlot";
import AffiliateProductGrid from "@/components/ads/AffiliateProductCard";
import ManagedCarousel from "@/components/ads/ManagedCarousel";

export const dynamic = "force-dynamic";

/*
 * Live preview: renders the actual public ad/affiliate components against live
 * data, so the owner sees exactly what visitors see for each placement. Empty
 * frames mean nothing is currently published for that placement.
 */
export default async function AdsPreviewPage() {
  await requirePermission("ads.read");

  return (
    <div>
      <PageHeader
        title="Live preview"
        subtitle="What visitors see right now for each placement. Only published (active, in-window) content appears — drafts are intentionally invisible here, just like on the site."
        action={<Link href="/admin/ads" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-extrabold">← Campaigns</Link>}
      />

      <div className="mb-4">
        <Notice tone="info">
          To place any of these on a real page, drop the matching component into it, e.g.{" "}
          <code>&lt;AdSlot placement=&quot;home_top_banner&quot; /&gt;</code>,{" "}
          <code>&lt;AffiliateProductGrid placement=&quot;solver_product_carousel&quot; /&gt;</code>, or{" "}
          <code>&lt;ManagedCarousel placement=&quot;home_carousel&quot; /&gt;</code>. They render nothing when no content is live, so they never leave an empty box.
        </Notice>
      </div>

      <div className="grid gap-4">
        <Frame title="home_top_banner — mobile vs desktop">
          <div className="grid gap-3 lg:grid-cols-2">
            <DeviceFrame label="Mobile"><AdSlot placement="home_top_banner" device="mobile" /><EmptyHint /></DeviceFrame>
            <DeviceFrame label="Desktop"><AdSlot placement="home_top_banner" device="desktop" /><EmptyHint /></DeviceFrame>
          </div>
        </Frame>

        <Frame title="home_carousel">
          <div><ManagedCarousel placement="home_carousel" /><EmptyHint /></div>
        </Frame>

        <Frame title="solver_product_carousel — affiliate products">
          <div><AffiliateProductGrid placement="solver_product_carousel" /><EmptyHint /></div>
        </Frame>

        <Frame title="leaderboard_sponsor">
          <div><AdSlot placement="leaderboard_sponsor" /><EmptyHint /></div>
        </Frame>
      </div>
    </div>
  );
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--muted)]">{title}</h2>
      {children}
    </Card>
  );
}

function DeviceFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-[var(--faint)]">{label}</p>
      <div className="rounded-2xl border border-dashed border-[var(--border-2)] p-3">{children}</div>
    </div>
  );
}

/* Shown only when its sibling slot rendered nothing (pure CSS: last-child hint). */
function EmptyHint() {
  return (
    <p className="mt-1 text-center text-xs text-[var(--faint)] only:block [&:not(:only-child)]:hidden">
      Nothing published for this placement yet.
    </p>
  );
}
