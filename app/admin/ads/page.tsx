import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { listRows } from "@/lib/admin/list";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, EmptyState, Notice, PageHeader, StatusPill } from "@/components/admin/ui";
import { createCampaign, setCampaignStatus } from "@/app/admin/actions/ads";

export const dynamic = "force-dynamic";

type Campaign = {
  id: string;
  name: string;
  advertiser: string | null;
  placement: string;
  status: string;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  impression_count: number;
  click_count: number;
  disclosure: string | null;
};

const PLACEMENTS = ["home_top_banner", "home_carousel", "solver_top_banner", "solver_product_carousel", "learn_mid_banner", "leaderboard_sponsor", "profile_promo"];

export default async function AdminAdsPage({ searchParams }: { searchParams: { message?: string; error?: string } }) {
  const ctx = await requirePermission("ads.read");
  const canManage = hasPermission(ctx.role, "ads.manage");
  const canPublish = hasPermission(ctx.role, "ads.publish");
  const configured = isAdminConfigured();
  const campaigns = configured ? await listRows<Campaign>("/rest/v1/ad_campaigns?select=id,name,advertiser,placement,status,priority,starts_at,ends_at,impression_count,click_count,disclosure&order=priority.desc,created_at.desc") : [];

  return (
    <div>
      <PageHeader title="Ads & Campaigns" subtitle="Database-driven managed advertising. Content changes never require a deploy. Sponsored/affiliate content is always disclosed." />
      {searchParams.message && <div className="mb-4"><Notice tone="info">{searchParams.message}</Notice></div>}
      {searchParams.error && <div className="mb-4"><Notice tone="danger">{searchParams.error}</Notice></div>}
      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — campaign management disabled until the migration and service-role key are in place.</Notice></div>}

      {canManage && (
        <Card className="mb-4">
          <h2 className="mb-3 text-lg font-black">New campaign (starts as draft)</h2>
          <form action={createCampaign} className="grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Internal campaign name" className="input" />
            <input name="advertiser" placeholder="Advertiser / partner" className="input" />
            <select name="placement" className="input">
              {PLACEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input name="campaign_type" placeholder="Type (banner, carousel, sponsor)" className="input" />
            <input name="headline" placeholder="Headline" className="input" />
            <input name="button_text" placeholder="Button text" className="input" />
            <input name="destination_url" placeholder="Destination URL (https)" className="input" />
            <input name="tracking_url" placeholder="Tracking URL (https)" className="input" />
            <input name="disclosure" placeholder="Disclosure (default: Sponsored)" className="input" />
            <input name="priority" type="number" min={0} defaultValue={0} placeholder="Priority" className="input" />
            <label className="text-xs text-[var(--muted)]">Starts<input name="starts_at" type="datetime-local" className="input mt-1" /></label>
            <label className="text-xs text-[var(--muted)]">Ends<input name="ends_at" type="datetime-local" className="input mt-1" /></label>
            <textarea name="body" placeholder="Supporting copy" className="input sm:col-span-2" />
            <button className="min-h-[44px] rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white sm:col-span-2">Create draft campaign</button>
          </form>
        </Card>
      )}

      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns yet" hint={canManage ? "Create your first draft above." : "Campaigns will appear here once created."} />
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-black">{c.name}</h3>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {c.placement} · priority {c.priority} · {c.advertiser || "—"} · {c.disclosure || "Sponsored"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {c.impression_count.toLocaleString()} impressions · {c.click_count.toLocaleString()} clicks
                  </p>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    {c.status !== "active" && canPublish && <StatusButton id={c.id} status="active" label="Publish" tone="bg-emerald-600 text-white" />}
                    {c.status === "active" && <StatusButton id={c.id} status="paused" label="Pause" tone="bg-amber-600 text-white" />}
                    {c.status !== "archived" && <StatusButton id={c.id} status="archived" label="Archive" tone="border border-[var(--border)]" />}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusButton({ id, status, label, tone }: { id: string; status: string; label: string; tone: string }) {
  return (
    <form action={setCampaignStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`min-h-[40px] rounded-xl px-3 text-sm font-extrabold ${tone}`}>{label}</button>
    </form>
  );
}
