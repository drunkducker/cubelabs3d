# Cube Labs 3x3 Challenges, Scrambles, and Solver Memory Handoff

Generated: 2026-07-22 21:59 EDT  
Repo: `drunkducker/cubelabs3d`  
Working branch: `claude/home-page-html-rebuild-q7qomi`  
Last known pushed branch head: `33ff6ef`  
Supabase project: `Cubelabs3d` (`fvcjufbyjkjyorrmpgrm`)  
Status: coded, Supabase schema applied live, build verified locally, browser/two-account testing still pending

This handoff supersedes the earlier tracked-3x3 next-steps checkpoint where the scramble database and solver-memory tables were still marked as future work. Those database pieces now exist. The remaining work is browser verification, production trust hardening, and UI wiring for solver memory.

## What Is Built Now

- `/leaderboard` exists as a mobile-first leaderboard visual prototype.
- `/leaderboard/3x3/play` launches the tracked 3x3 leaderboard/daily challenge flow.
- `/play/3x3` launches the same cube-first tracked play experience for free play.
- `/challenge/[id]` opens a sent challenge for the sender or recipient.
- `/profile/challenges` shows a basic signed-in challenge inbox.
- Homepage Daily Challenge "Start Challenge" points to `/leaderboard/3x3/play`.
- Player can load the official daily scramble, generate a random scramble, or type a chosen scramble.
- Saving or sending uses the exact scramble currently loaded on the cube.
- The play page uses the focus layout: cube takes most of the phone screen, and extra controls are collapsed.
- Test/admin controls can override reported time, move count, undo count, touch moves, button moves, and solved status.
- Actual metrics and reported/test metrics are both preserved.
- Manual/test records are marked so public leaderboards can exclude them by default.

## Important Routes

| Route | Purpose | Status |
| --- | --- | --- |
| `/leaderboard` | Mobile leaderboard prototype | Visual prototype |
| `/leaderboard/3x3/play` | Daily/tracked 3x3 challenge run | Built |
| `/play/3x3` | General tracked 3x3 play mode | Built |
| `/challenge/[id]` | Direct sent-challenge attempt page | Built |
| `/profile/challenges` | Basic challenge inbox | Built |
| `/api/solves` | Save tracked solve result | Built |
| `/api/challenges` | Create account-to-account challenge | Built |
| `/api/challenges/[id]/attempt` | Submit challenge attempt | Built |
| `/api/solver-memory` | Save/load signed-in solver memories | API built, solver UI not wired |

## Important Files

| File | Why It Matters |
| --- | --- |
| `app/NxNCubeGame.tsx` | Shared playable cube, focus layout, tracking panel, chosen scramble, test/admin overrides, save/send UI |
| `app/lib/challenge-service.ts` | Server-side service for save solves, ensure scrambles, create challenges, submit attempts |
| `app/api/solves/route.ts` | Thin route over shared solve-save service |
| `app/api/challenges/route.ts` | Thin route over challenge creation service |
| `app/api/challenges/[id]/attempt/route.ts` | Thin route over challenge-attempt submit service |
| `app/api/solver-memory/route.ts` | Signed-in solver memory save/load endpoint |
| `app/leaderboard/3x3/play/page.tsx` | Daily challenge entry point |
| `app/play/3x3/page.tsx` | Free 3x3 tracked play entry point |
| `app/challenge/[id]/page.tsx` | Sent challenge page |
| `app/profile/challenges/page.tsx` | Challenge inbox |
| `lib/daily-challenge.ts` | Shared official daily scramble constant |
| `supabase/migrations/20260722_tracked_scrambles_solver_memory.sql` | Durable record of live DB changes |

## Supabase State

The Supabase connector was verified against the `Cubelabs3d` project. Database query access worked. The tracked scrambles/solver memory migration was applied live.

New or updated data domains:

- `scrambles`: reusable puzzle scrambles, keyed by puzzle type and scramble hash.
- `scramble_attempts`: rankable attempt rows attached to a scramble.
- `solver_memories`: private signed-in saved cube states and solution snapshots.
- `solve_results`: now has top-level scramble ID, leaderboard eligibility, test flags, manual override flags, actual/reported tracking metrics, and assistance flags.
- `challenges`: now has creator/sender compatibility fields, scramble ID, share code, creator result summary fields, and visibility.
- `challenge_attempts`: now has scramble ID, solve result link, leaderboard eligibility, test flags, and actual/reported tracking metrics.

Security/RLS summary:

- RLS is enabled on the new tables.
- `solver_memories` are owner-only.
- Public reads for result/attempt data are limited to `leaderboard_eligible` rows.
- Challenge participants can read relevant challenge attempt data.
- Active scrambles are readable because they are the shared catalog key.
- The old public executable profile trigger warning was tightened by revoking direct execute access.
- Supabase security advisor was reported clean except for leaked password protection being disabled in Auth settings.

## Tracking Rules

Leaderboard-trusted rows should require:

- `solved = true`
- `is_dnf = false`
- `leaderboard_eligible = true`
- `is_test_data = false`
- `manual_time_override = false`
- `manual_tracking_override = false`

Manual/test/admin records are useful for QA, but they must not appear in public rankings or production analytics unless an admin view explicitly asks for test data.

Actual metrics are the client-observed values. Reported metrics may be admin/test overrides. Both must stay available for audit.

## What Is Not Production-Trusted Yet

- No server-side cube-state validation yet.
- No anti-cheat or suspicious-result review pipeline yet.
- No production `getLeaderboard()` service over verified rows yet.
- No real friend picker yet; recipient lookup is exact match by Cube Tag, username, or public slug.
- No duplicate-name resolution UI yet.
- No challenge rate limiting, blocking, reporting, expiration, rematch, or abuse controls yet.
- No admin audit log UI for manual/test overrides yet.
- Solver-memory API exists, but individual solver pages do not auto-save or resume from it yet.
- Paid-user solver-memory limits are not enforced yet.
- Vercel deployment was previously blocked by build rate limit, even though local build passed.

## Browser Verification Needed Next

Use two signed-in accounts.

1. Open `/leaderboard/3x3/play` on mobile.
2. Load the official scramble and confirm the cube starts from that scramble.
3. Use "Choose your own scramble", load it, then save.
4. Confirm Supabase created or reused a `scrambles` row.
5. Confirm Supabase created a `solve_results` row and a `scramble_attempts` row.
6. Enter manual/test time or move overrides, save again, and confirm the row is test-marked and not leaderboard eligible.
7. Send the loaded scramble to another account.
8. Confirm a `challenges` row is created with the same `scramble_id`.
9. Log in as recipient and open `/profile/challenges`.
10. Open the direct `/challenge/[id]` link as the recipient.
11. Submit the recipient attempt.
12. Confirm `challenge_attempts` and `scramble_attempts` are both written.
13. Try opening the challenge as a third account and confirm access is denied.

## Solver Memory Next Step

The API and table are ready. The solver UI still needs wiring.

Recommended first UI pass:

- On `/solver/3x3`, add "Save this cube" after manual input or generated solution.
- Add "Resume last cube" when signed in.
- Save `puzzle_type`, `scramble`, `cube_state`, `solution_steps`, `solution_summary`, `solver_name`, and current playback step.
- Start with signed-in memory only.
- Add paid-tier deeper history after billing/account tier is real.

## Admin Portal Next Step

Admin/testing needs a protected view over:

- all solve rows, including test data;
- actual vs reported metrics;
- manual time overrides;
- manual tracking overrides;
- undo/touch/button counts;
- leaderboard eligibility;
- challenge status;
- scramble attempt ranking;
- admin notes and audit history.

Do not rely on browser-only admin flags. Admin actions need server-side role checks and audit rows before production use.

## Scramble Ranking Next Step

Build a provider-isolated `getScrambleLeaderboard()` service that ranks by:

- best time;
- fewest moves;
- completion count;
- completion rate;
- average time;
- assisted vs unassisted;
- test-data exclusion;
- puzzle type.

Use `scramble_attempts` as the ranking source, not preview arrays or JSON-only replay metadata.

## Astryx Evaluation

Astryx may help the Cube Labs UI layer, especially the admin portal, challenge inbox, profile dashboards, tables, forms, menus, modals, and collapsible controls.

Do not use Astryx to replace the cube renderer, Three.js interaction, swipe logic, scramble validation, anti-cheat, or Supabase ranking logic.

Recommended path: make a small spike branch for the admin portal or challenge inbox only. Do not let it touch the homepage or cube play screens until CSS cascade/theme compatibility is proven.

## Build Verification

Last reported local verification:

```bash
HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build
```

Result: passed with 31 routes.

## Handoff Summary

The project now has the first real path from "play a 3x3" to "save a tracked result" to "send this exact scramble to another account" to "record rankable scramble attempts." The database foundation for chosen scrambles and solver memory is no longer just planned. The next phase is proof: two-account browser testing, production leaderboard query service, server-side validation, and solver UI auto-save/resume.
