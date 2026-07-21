/* ========================================================================== 
   HOMEPAGE
   Mobile-first app column that reads like a native app on any screen. The
   interactive hero is the front door; the ecosystem unfolds below it.

   CONTENT ORDER
     header -> interactive hero demo -> feature grid -> ecosystem rails.
   ========================================================================== */
import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import CarouselDots from "@/components/CarouselDots";
import FeatureGrid from "@/components/FeatureGrid";
import EcosystemSections from "@/components/EcosystemSections";

export default function Home() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <SiteHeader />
        <Hero />
        <CarouselDots />
        <FeatureGrid />
        <EcosystemSections />
      </div>
    </main>
  );
}
