# 2026-07-23 — News, My Arcade, and Home Links

## Purpose

The owner asked for News and My Arcade to come off the homepage because Cube Labs is also an owner-controlled site, not only a cube solver. This checkpoint records the first route/link pass.

## Implemented

- Added `app/news/page.tsx`.
- Added `app/my-arcade/page.tsx`.
- Added `app/learn/page.tsx` because `/learn` was already linked from the homepage and bottom nav but did not exist in this checkout.
- Updated `components/FeatureGrid.tsx` so the four homepage feature cards route to:
  - `/my-arcade`
  - `/leaderboard/3x3/play`
  - `/learn`
  - `/news`
- Updated `components/EcosystemSections.tsx` so Cube News, Featured Videos, Recommended Cubes, Play Games, and Learn rails have real View All/card destinations.

## Product State

- `/news` is a static mobile-first content hub for site updates, cube news, review queue, video queue, and owner notes.
- `/my-arcade` is a mobile-first owner arcade hub with live cube play routes and future original-game slots.
- `/learn` is a lightweight learning landing route with paths into notation, 3x3, challenge practice, and big-cube solvers.

## Verification

- `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes.
- Build reports 39 app routes.

## Still Needed

- Admin/CMS controls for editing News items.
- Real affiliate/review data and disclosure placement for product review content.
- Actual game pages for Chameleon Loop, Hungry Hole, Mouse Hunt, Duck Shoot Deluxe, or any other owner arcade games that are promoted from idea to playable.
- Full Learn content system and lesson pages.
- Mobile browser QA and Vercel deployment confirmation.

## Rollback

Remove `app/news`, `app/my-arcade`, and `app/learn`, then revert the `FeatureGrid` and `EcosystemSections` link changes plus the docs entries from this checkpoint.
