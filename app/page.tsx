/* ==========================================================================
   HOMEPAGE
   Mobile-first app column that reads like a native app on any screen. The
   solver is the front door; the ecosystem unfolds below it as swipeable rails.

   CONTENT ORDER
     header -> hero -> solution stepper -> feature grid -> ecosystem rails.

   SAFETY
     The production branch is untouched. This composition exists on the
     protected Drive-import branch until the Vercel preview is approved.
   ========================================================================== */
import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import SolutionStepper from "@/components/SolutionStepper";
import CarouselDots from "@/components/CarouselDots";
import FeatureGrid from "@/components/FeatureGrid";
import EcosystemSections from "@/components/EcosystemSections";

export default function Home() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      {/* Ambient floating background orbs remain behind all page content. */}
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <SiteHeader />
        <Hero />
        <SolutionStepper />
        <CarouselDots />
        <FeatureGrid />
        <EcosystemSections />
      </div>
    </main>
  );
}
