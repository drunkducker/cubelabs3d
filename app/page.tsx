/* ==========================================================================
   HOMEPAGE
   Mobile-first app column that reads like a native app on any screen. The
   solver (hero) is the front door; the ecosystem unfolds below it. Order:
   header -> hero (cube + solve) -> solution stepper -> feature grid -> sign-in.

   FUTURE: the CarouselDots stand in for the full swipeable sections named in
   the master prompt (Recommended Speed Cubes, Cube News, Featured Videos, ...).
   ========================================================================== */
import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import SolutionStepper from "@/components/SolutionStepper";
import CarouselDots from "@/components/CarouselDots";
import FeatureGrid from "@/components/FeatureGrid";
import SignInBanner from "@/components/SignInBanner";

export default function Home() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      {/* Ambient floating background orbs */}
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      {/* Foreground content sits above the orbs */}
      <div className="relative z-[1]">
        <SiteHeader />
        <Hero />
        <SolutionStepper />
        <CarouselDots />
        <FeatureGrid />
        <SignInBanner />
      </div>
    </main>
  );
}
