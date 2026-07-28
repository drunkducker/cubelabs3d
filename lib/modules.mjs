/**
 * Site module registry — the single source of truth for the reusable site-level
 * building blocks that are NOT per-puzzle: the monetization/content/layout
 * modules that get dropped onto pages (affiliate carousel, ad windows, banners,
 * a YouTube carousel, the footer, …).
 *
 * Same idea as lib/puzzles.mjs but for the site chrome: each module declares the
 * component/files that back it and its status. A module still being built or
 * A/B-tested carries a `waiver` (with a reason) or `status: "experimental"` so it
 * reports as an intentional gap, not a failure. `scripts/check-modules.mjs`
 * verifies each and prints ✅ present / ⚠️ waived / ❌ missing, failing CI only on
 * an unwaived ❌.
 *
 * @typedef {Object} SiteModule
 * @property {string} id
 * @property {string} name
 * @property {"stable"|"experimental"|"coming-soon"} status
 * @property {string[]} files          Files that must all exist for the module.
 * @property {{file: string, pattern: string}|null} grep  Optional extra signal.
 * @property {string|null} waiver      Intentional "not there yet" → reason.
 * @property {{flag: string, note: string}|null} experiment
 */

/** @type {SiteModule[]} */
export const MODULES = [
  {
    id: "affiliateCarousel",
    name: "Amazon affiliate carousel",
    status: "stable",
    files: ["components/ads/ManagedCarousel.tsx", "components/ads/AffiliateProductCard.tsx", "components/CarouselDots.tsx"],
    grep: null,
    waiver: null,
    experiment: null,
  },
  {
    id: "adWindow",
    name: "Ad window / slot",
    status: "stable",
    files: ["components/ads/AdSlot.tsx"],
    grep: null,
    waiver: null,
    experiment: null,
  },
  {
    id: "adTracking",
    name: "Ad impression/click tracking",
    status: "stable",
    files: ["components/ads/tracking.tsx"],
    grep: null,
    waiver: null,
    experiment: null,
  },
  {
    id: "promoBanner",
    name: "Promo / sign-in banner",
    status: "stable",
    files: ["components/SignInBanner.tsx"],
    grep: null,
    waiver: null,
    experiment: null,
  },
  {
    id: "siteFooter",
    name: "Site footer",
    status: "stable",
    files: ["components/EcosystemSections.tsx"],
    grep: { file: "components/EcosystemSections.tsx", pattern: "footer" },
    waiver: null,
    experiment: null,
  },
  {
    id: "youtubeCarousel",
    name: "YouTube video carousel",
    status: "coming-soon",
    files: [],
    grep: null,
    waiver: "No YouTube video carousel module yet — content/embeds and a player row still to build.",
    experiment: null,
  },
];
