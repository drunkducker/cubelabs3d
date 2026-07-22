import { getData } from "@/app/lib/data";
import type { PromoSlideRecord } from "@/app/lib/data/types";

/*
 * Managed promo/affiliate carousel. Renders live slides for a carousel_key as a
 * horizontally-scrolling strip, or nothing if empty. Affiliate links open in a
 * new tab with rel="sponsored".
 */
export default async function PromoCarousel({ carouselKey, className = "" }: { carouselKey: string; className?: string }) {
  let slides: PromoSlideRecord[] = [];
  try {
    slides = await getData().promoSlides.liveByCarousel(carouselKey);
  } catch {
    slides = [];
  }
  if (!slides.length) return null;

  return (
    <div className={`flex snap-x gap-3 overflow-x-auto pb-2 ${className}`}>
      {slides.map((s) => {
        const image = s.image_desktop_url || s.image_mobile_url;
        const inner = (
          <div className="cube-card flex h-full w-[260px] flex-none snap-start flex-col overflow-hidden rounded-2xl">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-32 w-full object-cover" />
            )}
            <div className="flex flex-1 flex-col gap-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-black">{s.title}</span>
                {s.advertiser && <span className="flex-none rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-black uppercase text-[var(--faint)]">Affiliate</span>}
              </div>
              {s.subtitle && <span className="text-sm text-[var(--muted)]">{s.subtitle}</span>}
              {s.disclosure && <span className="mt-auto pt-1 text-[10px] uppercase tracking-wide text-[var(--faint)]">{s.disclosure}</span>}
            </div>
          </div>
        );
        return s.link_url ? (
          <a key={s.id} href={s.link_url} target="_blank" rel="sponsored noopener noreferrer" className="transition hover:opacity-90">
            {inner}
          </a>
        ) : (
          <div key={s.id}>{inner}</div>
        );
      })}
    </div>
  );
}
