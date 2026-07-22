import AdSlot from "@/components/AdSlot";
import PromoCarousel from "@/components/PromoCarousel";
import FeaturedVideos from "@/components/FeaturedVideos";

/*
 * Public showcase of the managed render layer. Everything here is driven from
 * the admin portal (Ads, Banners & Carousels, Videos) — no hard-coded content.
 * Empty sections render nothing, so this page fills in as content is published.
 */
export const dynamic = "force-dynamic";

export default function PartnersPage() {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[var(--bg)] px-5 py-10 sm:px-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1] mx-auto grid w-full max-w-[860px] gap-8">
        <header>
          <p className="text-xs font-extrabold tracking-[0.22em] text-[var(--blue)]">CUBE LAB 3D</p>
          <h1 className="accent-text mt-2 text-3xl font-black tracking-[-0.02em] sm:text-4xl">Partners &amp; Gear</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Hand-picked cubes, timers, and tutorials. Everything here is managed from the admin portal.</p>
        </header>

        <AdSlot placement="partner_top" />

        <section className="grid gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted)]">Featured</h2>
          <PromoCarousel carouselKey="home_carousel" />
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted)]">Learn</h2>
          <FeaturedVideos placement="learn_featured" />
        </section>

        <p className="text-xs leading-5 text-[var(--faint)]">
          Sponsored and affiliate placements are clearly disclosed. Managed via Admin → Ads, Banners &amp; Carousels, and Videos.
        </p>
      </div>
    </main>
  );
}
