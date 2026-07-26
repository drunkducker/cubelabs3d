/* ========================================================================== 
   HOMEPAGE
   Mobile-first app column that reads like a native app on any screen. The
   interactive hero is the front door; the ecosystem unfolds below it.

   Set NEXT_PUBLIC_COMING_SOON=1 in Vercel to show the branded launch page.
   Remove the variable, or set it to 0, to restore the full homepage.
   ========================================================================== */
import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import CarouselDots from "@/components/CarouselDots";
import FeatureGrid from "@/components/FeatureGrid";
import EcosystemSections from "@/components/EcosystemSections";
import ComingSoonPage from "@/components/ComingSoonPage";

export default function Home() {
  if (process.env.NEXT_PUBLIC_COMING_SOON === "1") {
    return <ComingSoonPage />;
  }

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
