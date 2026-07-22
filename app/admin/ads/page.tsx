import { requireAdmin, hasAnyRole } from "@/app/lib/admin";
import { supabaseRequest } from "@/app/lib/supabase-rest";
import { createAd, setAdActive, deleteAd } from "./actions";

type Ad = {
  id: string;
  name: string;
  advertiser: string | null;
  ad_type: string;
  placement: string;
  destination_url: string | null;
  priority: number;
  is_active: boolean;
  is_test: boolean;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
};

type AdStatus = "Active" | "Scheduled" | "Paused" | "Expired";
const FILTERS: (AdStatus | "All")[] = ["All", "Active", "Scheduled", "Paused", "Expired"];

function statusOf(ad: Ad): AdStatus {
  if (!ad.is_active) return "Paused";
  const now = Date.now();
  if (ad.ends_at && new Date(ad.ends_at).getTime() < now) return "Expired";
  if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return "Scheduled";
  return "Active";
}

function ctr(ad: Ad): string {
  if (!ad.impressions) return "—";
  return `${((ad.clicks / ad.impressions) * 100).toFixed(2)}%`;
}

const statusStyle: Record<AdStatus, string> = {
  Active: "bg-green-500/15 text-green-300",
  Scheduled: "bg-blue-500/15 text-blue-300",
  Paused: "bg-yellow-500/15 text-yellow-200",
  Expired: "bg-red-500/15 text-red-300",
};

const input = "w-full rounded-lg border border-[var(--border-2)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--blue)] focus:outline-none";

type PageProps = { searchParams?: { status?: string; error?: string; message?: string } };

export default async function AdsManagerPage({ searchParams = {} }: PageProps) {
  const { role, token } = await requireAdmin();
  const canEdit = hasAnyRole(role, ["owner", "admin", "editor"]);
  const canDelete = hasAnyRole(role, ["owner", "admin"]);

  let ads: Ad[] = [];
  let loadError = false;
  try {
    ads = await supabaseRequest<Ad[]>("/rest/v1/ads?select=*&order=priority.desc,created_at.desc", {}, token);
  } catch {
    loadError = true;
  }

  const activeFilter = (FILTERS.includes(searchParams.status as AdStatus) ? searchParams.status : "All") as AdStatus | "All";
  const shown = activeFilter === "All" ? ads : ads.filter((a) => statusOf(a) === activeFilter);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.02em]">Ads Manager</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Managed ad and affiliate slots, rendered by placement.</p>
        </div>
      </header>

      {searchParams.message && <div className="rounded-2xl border border-green-400/30 bg-green-500/10 p-3 text-sm font-semibold text-green-200">{searchParams.message}</div>}
      {searchParams.error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{searchParams.error}</div>}

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <a
            key={f}
            href={f === "All" ? "/admin/ads" : `/admin/ads?status=${f}`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-black ${activeFilter === f ? "border-[var(--blue)] bg-[var(--surface-2)] text-[var(--blue)]" : "border-[var(--border-2)] text-[var(--muted)]"}`}
          >
            {f}
          </a>
        ))}
      </nav>

      {canEdit && (
        <details className="cube-card rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-black text-[var(--blue)]">+ New Ad</summary>
          <form action={createAd} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold">Campaign name*<input className={input} name="name" required placeholder="SpeedCubeShop Banner" /></label>
            <label className="grid gap-1 text-xs font-bold">Placement*<input className={input} name="placement" required placeholder="home_top_banner" /></label>
            <label className="grid gap-1 text-xs font-bold">Advertiser / partner<input className={input} name="advertiser" placeholder="SpeedCubeShop" /></label>
            <label className="grid gap-1 text-xs font-bold">Type
              <select className={input} name="ad_type" defaultValue="banner">
                <option value="banner">Banner</option>
                <option value="carousel">Carousel</option>
                <option value="card">Card</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold">Headline<input className={input} name="headline" placeholder="The World's Best Cubes" /></label>
            <label className="grid gap-1 text-xs font-bold">Button text<input className={input} name="button_text" placeholder="Shop now" /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Destination / affiliate URL<input className={input} name="destination_url" placeholder="https://speedcubeshop.com/?ref=cubelab3d" /></label>
            <label className="grid gap-1 text-xs font-bold">Image URL (mobile)<input className={input} name="image_mobile_url" /></label>
            <label className="grid gap-1 text-xs font-bold">Image URL (desktop)<input className={input} name="image_desktop_url" /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Disclosure<input className={input} name="disclosure" placeholder="Sponsored · affiliate link" /></label>
            <label className="grid gap-1 text-xs font-bold">Starts at<input className={input} name="starts_at" type="datetime-local" /></label>
            <label className="grid gap-1 text-xs font-bold">Ends at<input className={input} name="ends_at" type="datetime-local" /></label>
            <label className="grid gap-1 text-xs font-bold">Priority<input className={input} name="priority" type="number" defaultValue={0} /></label>
            <div className="flex items-end gap-4 text-xs font-bold">
              <label className="flex items-center gap-2"><input type="checkbox" name="is_active" /> Active</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="is_test" /> Test</label>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="cta-blue rounded-xl px-5 py-2.5 text-sm font-black">Create ad</button>
            </div>
          </form>
        </details>
      )}

      {loadError ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
          Could not load ads. Confirm `20260722_admin_foundation.sql` and `20260722_ads_manager.sql` have been run.
        </div>
      ) : shown.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-sm text-[var(--muted)]">No ads{activeFilter !== "All" ? ` with status ${activeFilter}` : ""} yet.</div>
      ) : (
        <div className="grid gap-3">
          {shown.map((ad) => {
            const status = statusOf(ad);
            return (
              <div key={ad.id} className="cube-card grid gap-3 rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-extrabold">{ad.name}</span>
                      {ad.is_test && <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-black uppercase text-[var(--faint)]">Test</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">
                      {ad.placement} · {ad.ad_type}{ad.advertiser ? ` · ${ad.advertiser}` : ""}
                    </div>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-black ${statusStyle[status]}`}>{status}</span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
                  <span>Impressions: <span className="font-bold text-[var(--text)]">{ad.impressions.toLocaleString()}</span></span>
                  <span>Clicks: <span className="font-bold text-[var(--text)]">{ad.clicks.toLocaleString()}</span></span>
                  <span>CTR: <span className="font-bold text-[var(--text)]">{ctr(ad)}</span></span>
                  <span>Priority: <span className="font-bold text-[var(--text)]">{ad.priority}</span></span>
                </div>

                {ad.destination_url && (
                  <div className="truncate text-xs text-[var(--blue)]">{ad.destination_url}</div>
                )}

                {(canEdit || canDelete) && (
                  <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                    {canEdit && (
                      <form action={setAdActive}>
                        <input type="hidden" name="id" value={ad.id} />
                        <input type="hidden" name="active" value={ad.is_active ? "false" : "true"} />
                        <button type="submit" className="rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-black text-[var(--blue)]">
                          {ad.is_active ? "Pause" : "Activate"}
                        </button>
                      </form>
                    )}
                    {canDelete && (
                      <form action={deleteAd}>
                        <input type="hidden" name="id" value={ad.id} />
                        <button type="submit" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-200">
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
