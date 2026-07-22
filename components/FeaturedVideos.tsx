import { getData } from "@/app/lib/data";
import type { VideoRecord } from "@/app/lib/data/types";

/*
 * Managed YouTube videos for a placement, rendered as responsive embeds.
 * Returns nothing if none are live.
 */
export default async function FeaturedVideos({ placement, className = "" }: { placement: string; className?: string }) {
  let videos: VideoRecord[] = [];
  try {
    videos = await getData().videos.liveByPlacement(placement);
  } catch {
    videos = [];
  }
  if (!videos.length) return null;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      {videos.map((v) => (
        <figure key={v.id} className="cube-card overflow-hidden rounded-2xl">
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube.com/embed/${v.youtube_id}`}
              title={v.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <figcaption className="p-3">
            <div className="flex items-center gap-2">
              {v.category && <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-black uppercase text-[var(--blue)]">{v.category}</span>}
              <span className="truncate font-extrabold">{v.title}</span>
            </div>
            {v.description && <p className="mt-1 text-sm text-[var(--muted)]">{v.description}</p>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
