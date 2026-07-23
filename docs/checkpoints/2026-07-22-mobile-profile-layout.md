# Mobile Profile Layout Checkpoint

Generated: 2026-07-22  
Repo: `drunkducker/cubelabs3d`  
Branch: `gpt/mobile-profile-page-20260722`  
Status: coded and build-verified locally; layout needs owner approval before deeper wiring

## What Changed

- Rebuilt `/profile` as a mobile-first Cube ID dashboard based on the provided reference image.
- Used the current homepage app shell, mobile leaderboard header/card density, Learn page glow/card language, and existing profile Supabase reads as references.
- Added visible dashboard areas for:
  - profile identity hero;
  - total solves, average time, best time, streak, and global rank stat tiles;
  - quick actions for cubes, solve history, challenges, friends, stats, and achievements;
  - recent solves;
  - favorite cubes;
  - achievements;
  - challenges and invites;
  - five-item bottom navigation with Play centered.
- Added route shells for `/profile/settings`, `/profile/solves`, `/profile/collection`, `/profile/achievements`, and `/profile/friends` so the dashboard can be tapped without immediate 404s.

## Data Wiring State

`/profile` still reads these existing tables when a signed-in user has data:

| Area | Current source | Status |
| --- | --- | --- |
| Identity | `profiles` | Reads live row when available |
| Recent solves | `solve_results` | Reads live rows when available |
| Stat tiles | `user_stats` plus solve fallback | Reads live rows when available |
| Favorite cubes | `cube_collection` | Reads live rows when available |
| Achievements | `user_achievements` joined to `achievements` | Reads live rows when available |
| Challenge invite | `challenges` | Reads live rows when available |
| Friends count | `friendships` | Reads live accepted rows when available |
| Global rank | preview hook | Not production-wired |

Empty accounts show preview fallback rows so the layout can be judged before the final feature wiring is approved.

## Still Pending

- Replace preview global rank with the future production leaderboard service.
- Convert profile subroute shells into real connected feature pages.
- Wire settings edits through server actions or app services.
- Add full solve-history filtering over `solve_results` and `scramble_attempts`.
- Add real friends and invite management.
- Run real mobile browser QA after deployment.

## Verification

- `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes.
- Build output reports 36 app routes after the added profile subroutes.

## Rollback

Revert:

- `app/profile/page.tsx`
- `components/ProfilePlaceholderPage.tsx`
- `app/profile/settings/page.tsx`
- `app/profile/solves/page.tsx`
- `app/profile/collection/page.tsx`
- `app/profile/achievements/page.tsx`
- `app/profile/friends/page.tsx`
- the related `CHANGELOG.md`, `DAILY-LOG.md`, and checkpoint index entries.
