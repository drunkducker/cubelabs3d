# Mobile Profile Layout Checkpoint

Generated: 2026-07-22  
Repo: `drunkducker/cubelabs3d`  
Branch: `gpt/mobile-profile-page-20260722`  
Status: layout approved; dashboard and profile subroutes wired to existing Supabase-backed app services

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
- Added `/profile/settings`, `/profile/solves`, `/profile/collection`, `/profile/achievements`, and `/profile/friends` routes so the dashboard can be tapped without 404s.
- Follow-up wiring pass after owner layout approval:
  - added `app/lib/profile-service.ts` as the shared profile data layer;
  - replaced local dashboard fetches with the shared service;
  - wired global rank from eligible rows, using `scramble_attempts` first and `solve_results` as a compatibility fallback;
  - replaced the placeholder subroutes with connected mobile pages;
  - added server actions for profile settings save and challenge decline;
  - removed the old placeholder component.

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
| Global rank | `scramble_attempts` / `solve_results` eligible rows | Reads live rows, but still lacks anti-cheat/browser proof |
| Settings form | `profiles` upsert | Saves display/profile/privacy fields through a server action |

Empty accounts show preview fallback rows so the layout can be judged before the final feature wiring is approved.

## Still Pending

- Add production leaderboard validation, anti-cheat review, assisted/unassisted splits, and ranking snapshots before public ranks are trusted.
- Add write actions for cube collection management.
- Add accept/block/search flows for friends and friend requests.
- Add full solve-history filters and detail screens over `solve_results` and `scramble_attempts`.
- Run real mobile browser QA after deployment.

## Verification

- `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes after the wiring pass.
- Build output reports 36 app routes.

## Rollback

Revert:

- `app/profile/page.tsx`
- `app/lib/profile-service.ts`
- `app/profile/settings/actions.ts`
- `app/profile/challenges/actions.ts`
- `app/profile/settings/page.tsx`
- `app/profile/solves/page.tsx`
- `app/profile/collection/page.tsx`
- `app/profile/achievements/page.tsx`
- `app/profile/friends/page.tsx`
- `app/profile/challenges/page.tsx`
- the related `CHANGELOG.md`, `DAILY-LOG.md`, and checkpoint index entries.
