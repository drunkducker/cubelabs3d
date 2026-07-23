import { getCarouselSlides } from "@/lib/ads/public";
import { TrackedLink } from "./tracking";

/*
 * Managed carousel. Renders active slides for a placement as a scroll-snap
 * strip (no JS needed, works on mobile). Each slide carries its disclosure.
 * Returns null when the carousel/slides are not live.
 */
export default async function ManagedCarousel({ placement, className = "" }: { placement: string; className?: string }) {
  const slides = await getCarouselSlides(placement);
  if (slides.length === 0) return null;

  return (
    <div className={`-mx-4 overflow-x-auto px-4 ${className}`}>
      <div className="flex snap-x snap-mandatory gap-3">
        {slides.map((s) => {
          const asset = s.desktop_asset_url || s.mobile_asset_url;
          const card = (
            <div className="w-[80vw] max-w-sm flex-none snap-start overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              {asset && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset} alt={s.alt_text ?? s.headline ?? "Sponsored"} className="h-40 w-full object-cover" loading="lazy" />
              )}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  {s.headline && <strong className="truncate">{s.headline}</strong>}
                  <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--faint)]">{s.disclosure || "Sponsored"}</span>
                </div>
                {s.body && <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{s.body}</p>}
              </div>
            </div>
          );
          return s.destination_url ? (
            <TrackedLink key={s.id} id={s.id} kind="ad_click" href={s.destination_url} className="block">
              {card}
            </TrackedLink>
          ) : (
            <div key={s.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
