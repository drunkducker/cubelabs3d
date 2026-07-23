# Cube Labs Site Health and Context-Rot Review

Generated: 2026-07-22 22:09 EDT  
Repo: `drunkducker/cubelabs3d`  
Working branch under review: `claude/home-page-html-rebuild-q7qomi`  
Last known pushed head before this document: `33ff6ef`  
Status: build passes locally, database foundation exists, browser proof and several routes still need work

This checkpoint documents the health review after the tracked 3x3 challenge, chosen scramble, Supabase scramble ranking, and solver-memory work. It is meant for the next AI or developer so they can improve the site without re-litigating the whole chat history.

## Summary

Cube Labs is in a better state than before this session because the 3x3 challenge path now has a real database foundation instead of only replay metadata. The project also has much clearer handoff notes, tracking rules, and Supabase migration evidence.

The main weakness is not TypeScript compilation. The main weakness is product proof: some buttons link to routes that do not exist yet, the visible leaderboard still uses preview data, and the new challenge/save/send flow needs a real two-account browser test before anyone should trust public rankings.

## What Is Working

- `npm run build` was reported green with 31 app routes after the Supabase scramble/solver-memory changes.
- Supabase project access was verified against `Cubelabs3d`.
- New Supabase structures exist for reusable scrambles, ranked scramble attempts, and private solver memories.
- `/leaderboard/3x3/play` and `/play/3x3` use the cube-first tracked play experience.
- A player can choose or load a scramble and save/send that exact scramble.
- Test/admin tracking overrides exist for reported time, moves, undo, touch moves, button moves, and solved status.
- Actual metrics and reported/test metrics are separated so future admin views can audit them.
- `/api/solver-memory` exists for saved solver states, even though solver pages are not wired to it yet.
- The handoff doc `2026-07-22-3x3-scrambles-solver-memory-handoff.md` now records the database/API state.

## What Looks Not Working or Incomplete

### Clickable routes can 404

These links appear in the UI but the matching routes were not present in this checkout:

| Link | Source | Needed fix |
| --- | --- | --- |
| `/learn` | `components/FeatureGrid.tsx`, `components/AppBottomNav.tsx` | Add `app/learn/page.tsx` or disable/hide the link |
| `/profile/settings` | `app/profile/page.tsx` | Add placeholder or real settings page |
| `/profile/solves` | `app/profile/page.tsx` | Add solve-history page backed by `solve_results` |
| `/profile/collection` | `app/profile/page.tsx` | Add collection page or disable the CTA |
| `/profile/achievements` | `app/profile/page.tsx` | Add achievements page or disable the CTA |
| `/leaderboard/player/[rank]` | `app/leaderboard/page.tsx` | Add player detail route or link to `/profile`/public profile only when real |

### Leaderboard is still preview data

The route `/leaderboard` exists, but it is not yet a production leaderboard. It still needs a service that reads verified rows from `scramble_attempts` and excludes test/admin/manual override records by default.

Homepage Daily Challenge stats such as "Your Best" and "Global Best" should also come from live data before they are treated as real.

### Challenge flow needs proof

The database is structurally ready, but the review found no live rows yet in the new scramble/solve/challenge/memory flow. That means the next proof step is not another schema change. It is browser testing:

1. Account A saves a chosen scramble.
2. Account A sends that scramble to Account B.
3. Account B receives it in `/profile/challenges`.
4. Account B opens `/challenge/[id]`.
5. Account B submits an attempt.
6. Supabase shows linked rows in `scrambles`, `solve_results`, `scramble_attempts`, `challenges`, and `challenge_attempts`.
7. A third account cannot open private challenge data.

### Solver memory is API-ready, not UI-ready

The table and `/api/solver-memory` endpoint exist. The solver pages still need controls:

- "Save this cube"
- "Resume last cube"
- signed-in-only messaging
- paid-user history limits later
- export/delete behavior for saved personal cube data

### Lint is not a usable check yet

`npm run lint` was reported to open the Next.js ESLint setup prompt. That means lint is not configured as a repeatable CI check.

### Supabase security setting remains

Supabase security advisor still flagged leaked-password protection as disabled in Auth settings. That is a dashboard configuration item, not a code migration.

### Local worktree health is weak

The local checkout used in the prior work had a broken `.git` pointer. Source files were readable and buildable, but normal `git status`/`git push` behavior was unreliable. Use a fresh clone or the GitHub connector path for publishing until the worktree is repaired.

## Highest-Value Improvements Next

1. Add placeholder or real pages for every clickable route that can currently 404.
2. Replace leaderboard preview arrays with a `getScrambleLeaderboard()` service over `scramble_attempts`.
3. Run and document the two-account challenge test.
4. Wire `/solver/3x3` to `/api/solver-memory` with save/resume controls.
5. Add server-side cube-state validation before public competition trust.
6. Add anti-cheat and suspicious-result review rules.
7. Add admin views for actual vs reported metrics, manual overrides, test data, undo, touch moves, button moves, and leaderboard eligibility.
8. Configure lint so `npm run lint` is non-interactive and CI-safe.
9. Enable Supabase leaked-password protection.
10. Add real mobile browser QA for `/play/3x3`, `/leaderboard/3x3/play`, and `/challenge/[id]`.

## Context-Rot Reduction Already Used

These actions reduced the chance that another AI or future branch misunderstands the site:

| Context-rot reduction | How it helped |
| --- | --- |
| Dated handoff docs | Captured current branch, routes, Supabase state, test gaps, and next steps |
| Checkpoint index | Made the newest handoff findable from `docs/checkpoints/README.md` |
| Current-status branch registry | Prevents mixing `main`, RootA, RootB, preview branches, and stale work |
| ADR 0002 | Explains why tracked 3x3 challenges separate prototype behavior from production trust |
| Migration file | Keeps the live Supabase changes reproducible from the repo |
| Daily log and changelog | Records what was checked, changed, blocked, and build-verified |
| Preview/test labels | Prevents visual prototypes and test overrides from being called production leaderboard truth |
| Actual vs reported metrics | Lets admin testing exist without poisoning future public rankings |
| Service/API boundary | Keeps Supabase logic out of UI components and makes migration away from Supabase easier |
| Explicit next-proof steps | Moves the project from "we think it works" to testable browser/database evidence |

## Do Not Claim Yet

Do not mark these complete until verified:

- production leaderboard ranking;
- public anti-cheat;
- server-side solve validation;
- two-account challenge send/receive/submit;
- solver auto-save/resume UI;
- paid-user solver memory;
- admin portal;
- live `/learn` experience;
- profile subpages;
- Vercel deployment readiness after rate limits clear.

## Recommended Next Branch

Start with `fix/clickable-route-placeholders-and-live-leaderboard-read`.

Suggested scope:

1. Add minimal mobile-first placeholder pages for missing routes.
2. Build a read-only leaderboard service from `scramble_attempts`.
3. Swap `/leaderboard` preview rows to live rows with an empty state.
4. Keep test/manual rows excluded by default.
5. Record one browser/mobile test pass in `DAILY-LOG.md`.

This gives the site the biggest visible reliability gain without touching the cube engine.
