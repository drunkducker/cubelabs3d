import { requireAdmin, hasAnyRole } from "@/app/lib/admin";
import { getData } from "@/app/lib/data";
import type { VideoRecord as Video } from "@/app/lib/data/types";
import { createVideo, setVideoActive, deleteVideo } from "./actions";

const input = "w-full rounded-lg border border-[var(--border-2)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--blue)] focus:outline-none";

type PageProps = { searchParams?: { error?: string; message?: string } };

export default async function VideosManagerPage({ searchParams = {} }: PageProps) {
  const { role, token } = await requireAdmin();
  const canEdit = hasAnyRole(role, ["owner", "admin", "editor"]);
  const canDelete = hasAnyRole(role, ["owner", "admin"]);

  let videos: Video[] = [];
  let loadError = false;
  try {
    videos = await getData().videos.list({ accessToken: token });
  } catch {
    loadError = true;
  }

  return (
    <div className="grid gap-5">
      <header>
        <h1 className="accent-text text-2xl font-black tracking-[-0.02em]">Videos</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Managed YouTube videos, rendered by placement across Learn and other pages.</p>
      </header>

      {searchParams.message && <div className="rounded-2xl border border-green-400/30 bg-green-500/10 p-3 text-sm font-semibold text-green-200">{searchParams.message}</div>}
      {searchParams.error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{searchParams.error}</div>}

      {canEdit && (
        <details className="cube-card rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-black text-[var(--blue)]">+ Add video</summary>
          <form action={createVideo} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">YouTube URL or ID*<input className={input} name="youtube" required placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ" /></label>
            <label className="grid gap-1 text-xs font-bold">Title*<input className={input} name="title" required placeholder="How the 3×3 Cube Works" /></label>
            <label className="grid gap-1 text-xs font-bold">Category<input className={input} name="category" placeholder="Beginner" /></label>
            <label className="grid gap-1 text-xs font-bold">Placement<input className={input} name="placement" defaultValue="learn_featured" /></label>
            <label className="grid gap-1 text-xs font-bold">Priority<input className={input} name="priority" type="number" defaultValue={0} /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Description<input className={input} name="description" placeholder="Understand the pieces, faces, and basic moves." /></label>
            <label className="grid gap-1 text-xs font-bold">Starts at<input className={input} name="starts_at" type="datetime-local" /></label>
            <label className="grid gap-1 text-xs font-bold">Ends at<input className={input} name="ends_at" type="datetime-local" /></label>
            <div className="flex items-end gap-4 text-xs font-bold">
              <label className="flex items-center gap-2"><input type="checkbox" name="is_active" /> Published</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="is_test" /> Test</label>
            </div>
            <div className="sm:col-span-2"><button type="submit" className="cta-blue rounded-xl px-5 py-2.5 text-sm font-black">Add video</button></div>
          </form>
        </details>
      )}

      {loadError ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">Could not load videos. Confirm the videos migration has run.</div>
      ) : videos.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-sm text-[var(--muted)]">No videos yet.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {videos.map((v) => (
            <div key={v.id} className="cube-card grid gap-3 rounded-2xl p-4">
              <div className="overflow-hidden rounded-xl border border-[var(--border)]" style={{ aspectRatio: "16 / 9" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`} alt={v.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-extrabold">{v.title}</span>
                    {v.is_test && <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-black uppercase text-[var(--faint)]">Test</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">{v.placement}{v.category ? ` · ${v.category}` : ""} · priority {v.priority}</div>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-black ${v.is_active ? "bg-green-500/15 text-green-300" : "bg-yellow-500/15 text-yellow-200"}`}>{v.is_active ? "Live" : "Hidden"}</span>
              </div>
              {(canEdit || canDelete) && (
                <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                  {canEdit && (
                    <form action={setVideoActive}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="active" value={v.is_active ? "false" : "true"} />
                      <button type="submit" className="rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-black text-[var(--blue)]">{v.is_active ? "Hide" : "Publish"}</button>
                    </form>
                  )}
                  {canDelete && (
                    <form action={deleteVideo}>
                      <input type="hidden" name="id" value={v.id} />
                      <button type="submit" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-200">Delete</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
