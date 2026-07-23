import { headers } from "next/headers";
import { getActiveCampaign } from "@/lib/ads/public";
import { AdImpression, TrackedLink } from "./tracking";

/*
 * Public banner ad slot. Drop <AdSlot placement="home_top_banner" /> into any
 * page. It fetches the highest-priority live campaign for that placement via the
 * anon key (RLS only exposes active, in-window rows), renders the creative with
 * a required disclosure, and records impression/click metrics. Renders nothing
 * when no campaign is live, so it never leaves an empty box.
 */

function isMobile(): boolean {
  const ua = headers().get("user-agent") ?? "";
  return /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
}

export default async function AdSlot({ placement, className = "", device: forced }: { placement: string; className?: string; device?: "mobile" | "desktop" }) {
  const device = forced ?? (isMobile() ? "mobile" : "desktop");
  const campaign = await getActiveCampaign(placement, device);
  if (!campaign) return null;

  const asset = (device === "mobile" ? campaign.mobile_asset_url : campaign.desktop_asset_url) || campaign.desktop_asset_url || campaign.mobile_asset_url;
  const href = campaign.destination_url;

  const inner = (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      {asset && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset} alt={campaign.alt_text ?? campaign.headline ?? "Sponsored"} className="h-16 w-16 flex-none rounded-xl object-cover" loading="lazy" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {campaign.headline && <strong className="truncate">{campaign.headline}</strong>}
          <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--faint)]">
            {campaign.disclosure || "Sponsored"}
          </span>
        </div>
        {campaign.body && <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{campaign.body}</p>}
      </div>
      {href && campaign.button_text && (
        <span className="hidden flex-none rounded-xl bg-[var(--blue)] px-4 py-2 text-sm font-extrabold text-white sm:inline-block">
          {campaign.button_text}
        </span>
      )}
    </div>
  );

  return (
    <div className={className}>
      <AdImpression id={campaign.id} />
      {href ? (
        <TrackedLink id={campaign.id} kind="ad_click" href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]">
          {inner}
        </TrackedLink>
      ) : (
        inner
      )}
    </div>
  );
}
