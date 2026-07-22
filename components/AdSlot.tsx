import { getData } from "@/app/lib/data";

/*
 * Managed ad slot. Renders the highest-priority live ad for a named placement,
 * or nothing if none is scheduled. Reusable — drop <AdSlot placement="..." />
 * onto any page. Clicks route through /api/ads/[id]/click for tracking.
 */
export default async function AdSlot({ placement, className = "" }: { placement: string; className?: string }) {
  let ad = null;
  try {
    const ads = await getData().ads.liveByPlacement(placement);
    ad = ads?.[0] ?? null;
  } catch {
    ad = null;
  }
  if (!ad) return null;

  const image = ad.image_desktop_url || ad.image_mobile_url;

  return (
    <a
      href={`/api/ads/${ad.id}/click`}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={`signin-surf relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[var(--border-2)] p-4 transition hover:border-[rgba(46,166,255,.55)] ${className}`}
    >
      <span className="absolute right-3 top-3 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--muted)]">
        {ad.advertiser ? "Affiliate" : "Ad"}
      </span>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-16 w-16 flex-none rounded-xl object-cover sm:h-20 sm:w-20" />
      )}
      <span className="min-w-0 flex-1">
        {ad.headline && <span className="block truncate text-base font-black">{ad.headline}</span>}
        {ad.body && <span className="mt-0.5 block text-sm text-[var(--muted)]">{ad.body}</span>}
        {ad.disclosure && <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--faint)]">{ad.disclosure}</span>}
      </span>
      {ad.button_text && (
        <span className="cta-blue hidden flex-none rounded-xl px-4 py-2 text-sm font-black sm:inline-block">{ad.button_text}</span>
      )}
    </a>
  );
}
