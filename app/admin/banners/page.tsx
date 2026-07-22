import { requireAdmin, hasAnyRole } from "@/app/lib/admin";
import { getData } from "@/app/lib/data";
import type { PromoSlideRecord as Slide } from "@/app/lib/data/types";
import { createSlide, setSlideActive, deleteSlide } from "./actions";

const input = "w-full rounded-lg border border-[var(--border-2)] bg-black/20 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--blue)] focus:outline-none";

type PageProps = { searchParams?: { error?: string; message?: string } };

export default async function BannersPage({ searchParams = {} }: PageProps) {
  const { role, token } = await requireAdmin();
  const canEdit = hasAnyRole(role, ["owner", "admin", "editor"]);
  const canDelete = hasAnyRole(role, ["owner", "admin"]);

  let slides: Slide[] = [];
  let loadError = false;
  try {
    slides = await getData().promoSlides.list({ accessToken: token });
  } catch {
    loadError = true;
  }

  // Group by carousel for a slide-manager feel.
  const groups = new Map<string, Slide[]>();
  for (const s of slides) {
    const arr = groups.get(s.carousel_key) ?? [];
    arr.push(s);
    groups.set(s.carousel_key, arr);
  }

  return (
    <div className="grid gap-5">
      <header>
        <h1 className="accent-text text-2xl font-black tracking-[-0.02em]">Banners &amp; Carousels</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Promo and affiliate slides, grouped by carousel and rendered by placement.</p>
      </header>

      {searchParams.message && <div className="rounded-2xl border border-green-400/30 bg-green-500/10 p-3 text-sm font-semibold text-green-200">{searchParams.message}</div>}
      {searchParams.error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{searchParams.error}</div>}

      {canEdit && (
        <details className="cube-card rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-black text-[var(--blue)]">+ New slide</summary>
          <form action={createSlide} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold">Carousel*<input className={input} name="carousel_key" required defaultValue="home_carousel" placeholder="home_carousel" /></label>
            <label className="grid gap-1 text-xs font-bold">Priority (order)<input className={input} name="priority" type="number" defaultValue={0} /></label>
            <label className="grid gap-1 text-xs font-bold">Title*<input className={input} name="title" required placeholder="The World's Best Cubes" /></label>
            <label className="grid gap-1 text-xs font-bold">Subtitle<input className={input} name="subtitle" placeholder="Shop Now" /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Link / affiliate URL<input className={input} name="link_url" placeholder="https://speedcubeshop.com/?ref=cubelab3d" /></label>
            <label className="grid gap-1 text-xs font-bold">Image URL (mobile)<input className={input} name="image_mobile_url" /></label>
            <label className="grid gap-1 text-xs font-bold">Image URL (desktop)<input className={input} name="image_desktop_url" /></label>
            <label className="grid gap-1 text-xs font-bold">Advertiser / partner<input className={input} name="advertiser" placeholder="SpeedCubeShop" /></label>
            <label className="grid gap-1 text-xs font-bold">Disclosure<input className={input} name="disclosure" placeholder="Affiliate link" /></label>
            <label className="grid gap-1 text-xs font-bold">Starts at<input className={input} name="starts_at" type="datetime-local" /></label>
            <label className="grid gap-1 text-xs font-bold">Ends at<input className={input} name="ends_at" type="datetime-local" /></label>
            <div className="flex items-end gap-4 text-xs font-bold">
              <label className="flex items-center gap-2"><input type="checkbox" name="is_active" /> Active</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="is_test" /> Test</label>
            </div>
            <div className="sm:col-span-2"><button type="submit" className="cta-blue rounded-xl px-5 py-2.5 text-sm font-black">Create slide</button></div>
          </form>
        </details>
      )}

      {loadError ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">Could not load slides. Confirm the promo slides migration has run.</div>
      ) : slides.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-sm text-[var(--muted)]">No slides yet.</div>
      ) : (
        Array.from(groups.entries()).map(([carousel, items]) => (
          <section key={carousel} className="grid gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">{carousel}</h2>
            {items.map((s) => (
              <div key={s.id} className="cube-card grid grid-cols-[auto_1fr] gap-3 rounded-2xl p-3">
                <div className="h-16 w-24 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                  {(s.image_desktop_url || s.image_mobile_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(s.image_desktop_url || s.image_mobile_url) as string} alt={s.title} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-extrabold">{s.title}</span>
                      {s.is_test && <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-black uppercase text-[var(--faint)]">Test</span>}
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-black ${s.is_active ? "bg-green-500/15 text-green-300" : "bg-yellow-500/15 text-yellow-200"}`}>{s.is_active ? "Active" : "Paused"}</span>
                  </div>
                  {s.subtitle && <div className="truncate text-xs text-[var(--muted)]">{s.subtitle}</div>}
                  {s.link_url && <div className="truncate text-xs text-[var(--blue)]">{s.link_url}</div>}
                  {(canEdit || canDelete) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canEdit && (
                        <form action={setSlideActive}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="active" value={s.is_active ? "false" : "true"} />
                          <button type="submit" className="rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] px-3 py-1 text-xs font-black text-[var(--blue)]">{s.is_active ? "Pause" : "Activate"}</button>
                        </form>
                      )}
                      {canDelete && (
                        <form action={deleteSlide}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200">Delete</button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
