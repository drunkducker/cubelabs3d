# Cube Labs 3D — Daily Check-In Log

Use this file for concise daily project check-ins. The newest entry goes first. Do not mark work complete without repository evidence.

## 2026-07-23 — Main merge: admin, profile, hubs, security headers

**Completed**

- [x] Merged `claude/cubelabs-admin-dashboard-4pe35q` into the main promotion branch.
- [x] Merged GitHub `gpt/mobile-profile-page-20260722` and ported the local-only GPT follow-up commits for connected profile pages, social discovery/privacy queue, and News/My Arcade/Learn hubs.
- [x] Preserved local handoff/checkpoint notes that were not on GitHub.
- [x] Bumped Next.js + `eslint-config-next` to `14.2.35`.
- [x] Added global security headers and CSP in `next.config.mjs`.
- [x] Kept the standalone Learn rebuild available at `/learn/standalone` while `/learn` uses the app route.

**Blocked or unverified**

- [ ] Production migrations, service-role key, Stripe keys, private media bucket, owner bootstrap, browser QA, and RLS advisor verification remain required before marking the merged systems fully complete.

---

## 2026-07-23 — Roles editor, media, billing, operator UX

**Completed**

- [x] Migration `20260725_media_and_billing.sql` (media_assets, premium_plans seeded, premium_subscriptions; RLS).
- [x] Roles editor `/admin/roles` (owner-only, audited, last-owner guard) + `lib/admin/roles.ts` + actions.
- [x] Sortable `DataTable` component (filter + mobile cards); used on roles + billing.
- [x] Operator UX: notification bell + ⌘K command palette in the shell; onboarding checklist on overview from real signals.
- [x] Media library `/admin/media` + `/api/admin/media` (magic-byte validation, private Storage, signed preview) + `lib/admin/media.ts` / `image-detect.ts`.
- [x] Premium billing `/admin/billing` + `lib/admin/billing.ts`; Stripe checkout (`/api/billing/checkout`) + signature-verified webhook (`/api/billing/webhook`).
- [x] Unit tests for image magic-byte detection; docs updated (ADMIN-GUIDE, ADMIN-PORTAL, ROADMAP, CHANGELOG).

**Verified**

- `npx tsc --noEmit` clean; `npm run build` 42 routes; `npm test` 33/33; `npm run lint` exit 0.

**Unverified (do not mark `[x]`)**

- [ ] Migrations `20260723/24/25` not applied; `STRIPE_*` keys and `admin-media` Storage bucket not configured here.
- [ ] No browser verification of role changes, uploads, checkout, or webhook delivery.
- [ ] Rate limiting + admin 2FA still open (security track not chosen this round).

---

## 2026-07-23 — Public ad rendering + admin polish + operator guide

**Completed**

- [x] Public render components: `AdSlot`, `AffiliateProductGrid`, `ManagedCarousel` (`components/ads/*`) + anon read layer `lib/ads/public.ts`. Fail soft; disclosures + `rel="sponsored nofollow"` enforced.
- [x] Tracking: `/api/ads/track` beacon + `supabase/migrations/20260724_ad_rendering.sql` (SECURITY DEFINER counters, granted to anon).
- [x] Owner live preview at `/admin/ads/preview` (mobile/desktop frames), linked from `/admin/ads`.
- [x] Admin polish: dark-theme SVG charts (`components/admin/Charts.tsx`) + real 7-day solve trend on overview; accessible confirm dialog (`ConfirmSubmit`) on test-run cleanup and campaign archive.
- [x] Operator how-to `docs/ADMIN-GUIDE.md` (Amazon affiliate links, ads, day-to-day); updated ADS-AFFILIATES/ROADMAP/CHANGELOG.

**Verified**

- `npx tsc --noEmit` clean; `npm run build` 39 routes; `npm test` 27/27; `npm run lint` exit 0.

**Unverified (do not mark `[x]`)**

- [ ] `20260724_ad_rendering.sql` not applied; components not yet placed on public pages (product decision); no browser verification.
- [ ] Affiliate activation toggle + carousel slide editor UI still to build; rate limiting + admin 2FA still open.

---

## 2026-07-23 — Admin dashboard platform (Phase 1–6 build)

**Checked**

- [x] Verified real `main` state (`cd43130`): auth/Cube ID, Cube Labs Mail, solvers; **no** admin system and **no** scramble/challenge-attempt tables on `main` (that work lives on `claude/home-page-html-rebuild-q7qomi`, not `main`).
- [x] Confirmed docs index referenced missing `SECURITY.md`, `AUTHENTICATION.md`, `ADS-AFFILIATES.md`, `CODING-STANDARDS.md`, `VISION.md`.
- [x] Read auth actions, `supabase-rest`, schema, and migrations to reuse the HTTP-only-cookie + service-action pattern.

**Completed**

- [x] Migration `supabase/migrations/20260723_admin_platform.sql`: `admin_members`, append-only `admin_audit_log`, `admin_security_events`, `site_settings`, `feature_flags`, `test_runs`, `ad_campaigns`, `ad_carousels`, `ad_carousel_slides`, `affiliate_products`, `moderation_reports`; additive gameplay columns on `solve_results`/`challenges`; RLS enabled deny-by-default with narrow public policies; `bootstrap_owner()`.
- [x] Server-only service layer `lib/admin/*`: service-role adapter (fails closed), permission matrix (owner-only enforced), `requireAdmin`/`requirePermission`/`authorizeAction`, redaction, audit + security-event writers, overview/users/security/settings/list services, pure campaign-selection + validation.
- [x] Protected `/admin` layout + shell (mobile drawer / desktop sidebar) + 12 pages: overview, users (+detail), ads, carousels/affiliates, test-lab, leaderboards, challenges, content, security, audit, settings, exports; `/admin-denied`; loading/error states.
- [x] Server actions with origin-check → permission → validate → operate → audit → revalidate for users, ads, test-lab, leaderboards, challenges, settings; owner-only audited CSV/JSON export route.
- [x] Restored/created docs: `SECURITY.md`, `AUTHENTICATION.md`, `ADS-AFFILIATES.md`, `CODING-STANDARDS.md`, `VISION.md`; ADR 0003; updated ARCHITECTURE, ROADMAP §6/§7, ADMIN-PORTAL, PROJECT-HEALTH, CHANGELOG, CURRENT_STATUS.
- [x] Test infra: Vitest + 27 unit tests (permissions, redaction, campaign selection, validation) — all pass. Made lint non-interactive (`.eslintrc.json`) — `npm run lint` exits 0.

**Verified commands**

- `npx tsc --noEmit` → clean.
- `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` → compiles, 38 routes, 12 admin routes dynamic (`ƒ`); existing public pages unchanged.
- `npm test` → 4 files, 27 tests passed.
- `npm run lint` → exit 0 (warnings only, all in pre-existing files).

**Blocked or unverified (do not mark `[x]`)**

- [ ] `20260723_admin_platform.sql` not yet applied in production; `SUPABASE_SERVICE_ROLE_KEY` not set here → live admin data unavailable (UI shows "Unavailable", not fake zeros).
- [ ] Owner bootstrap (`select public.bootstrap_owner('…')`) not run.
- [ ] No browser/mobile QA, no two-account authorization test, no live RLS advisor verification.
- [ ] Rate limiting on sensitive endpoints not implemented; Supabase leaked-password protection still a dashboard item.

**Next priorities**

1. Apply the migration, set the service-role key, bootstrap the owner, and browser-verify each role's access.
2. Run the RLS checklist in `docs/SECURITY.md` against the live DB.
3. Build public ad render components + impression/click tracking.

**Commits / deployments / rollback notes**

- Branch: `claude/cubelabs-admin-dashboard-4pe35q`.
- Deployment: local build + unit tests only; not deployed/verified in production.
- Rollback: revert this commit; the migration is additive — see its rollback block. Export real data before dropping any table.

## 2026-07-23 — Home-linked News, My Arcade, and Learn hubs

**Checked**

- [x] Confirmed the homepage already had Cube News and Play Games rails, but their View All controls were not real navigation.
- [x] Confirmed the top feature grid still used coming-soon taps for games/news-style areas.
- [x] Confirmed `/learn` was linked from the homepage/bottom nav but missing as a route in this checkout.

**Completed**

- [x] Added `/news` for Cube Labs site updates, cube news, review queue, videos, and owner notes.
- [x] Added `/my-arcade` for playable cube rooms and future owner game slots.
- [x] Added `/learn` as a lightweight route so existing learning links are no longer dead on this branch.
- [x] Updated the homepage feature grid to link My Arcade, Daily Challenge, Learn, and News.
- [x] Updated lower homepage rails so View All/card taps route into News, My Arcade, and Learn.

**Still not working or unverified**

- [ ] News is static/curated content until a CMS/admin content tool exists.
- [ ] My Arcade non-cube game cards are owner-game slots, not finished games.
- [ ] Learn has a landing route, but deeper lesson pages/content are still future work.
- [ ] Mobile browser QA and Vercel deployment are not recorded.

**Commits / deployments / rollback notes**

- Test: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes, 39 app routes.
- Rollback: remove `app/news`, `app/my-arcade`, `app/learn`, revert the homepage feature/rail link changes, and revert this documentation entry.

---

## 2026-07-22 — Social discovery and privacy queue

**Checked**

- [x] Confirmed the approved profile branch already had connected reads for profile, solves, achievements, friends, and challenges.
- [x] Confirmed users could not discover other users outside exact challenge recipient entry.
- [x] Confirmed account deletion/export was documented but not wired into settings.
- [x] Supabase CLI is not installed in this workspace, so the migration file was added manually.

**Completed**

- [x] Added smart player suggestions from public profiles, favorite puzzle, ranked scramble overlap, nearby solve times, tracked solve volume, and allowed location signals.
- [x] Added `/profile/friends` search and friend request actions: send, accept, decline, cancel/remove.
- [x] Added `/u/[slug]` public player profiles with Add Friend and Challenge shortcuts.
- [x] Added People To Challenge to `/profile`.
- [x] Added recipient prefill support to `/leaderboard/3x3/play`.
- [x] Added `supabase/migrations/20260722_social_discovery_privacy_requests.sql`.
- [x] Added Data Export and Close Account controls to `/profile/settings`.

**Still not working or unverified**

- [ ] The new migration must be applied in Supabase before export/closure queue rows and new profile account-status fields work in production.
- [ ] Actual export email delivery requires the Cube Labs Mail delivery worker/provider.
- [ ] Actual Supabase Auth user deletion requires a server-only admin/service-role privacy worker after export.
- [ ] Friend block/report and rate limits are not implemented yet.
- [ ] Two-account browser QA is not recorded.

**Commits / deployments / rollback notes**

- Test: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes.
- Rollback: revert the social discovery service changes, friend actions, `/u/[slug]`, settings privacy queue actions/UI, recipient prefill, migration file, and this documentation entry.

---

## 2026-07-22 — Profile approval wiring pass

**Checked**

- [x] Treated owner feedback as approval to move past the mock layout.
- [x] Re-read Supabase guidance because this pass touches account/profile data, challenges, and ranking reads.
- [x] Confirmed the profile branch was clean before wiring.

**Completed**

- [x] Added shared profile service `app/lib/profile-service.ts` for dashboard and subpage reads.
- [x] Rewired `/profile` to the shared service and replaced the global-rank preview hook with live eligible-row reads.
- [x] Replaced route shells for `/profile/settings`, `/profile/solves`, `/profile/collection`, `/profile/achievements`, and `/profile/friends` with connected mobile pages.
- [x] Added server action for profile settings saves through `profiles`.
- [x] Added challenge decline action on the dashboard and `/profile/challenges`.
- [x] Removed the obsolete placeholder profile component.

**Still not working or unverified**

- [ ] Live rank is not production-trusted until anti-cheat, browser proof, assisted/unassisted splits, and admin review exist.
- [ ] Cube collection add/edit/delete actions are not implemented.
- [ ] Friend accept/block/search flows are not implemented.
- [ ] Real mobile browser QA is not recorded.
- [ ] Production/Vercel deployment is not confirmed.

**Commits / deployments / rollback notes**

- Test: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes, 36 app routes.
- Rollback: revert the shared profile service, profile subpage replacements, profile/challenge actions, dashboard wiring, and this documentation entry.

---

## 2026-07-22 — Mobile profile layout branch

**Checked**

- [x] Reviewed the profile mockup, homepage shell, mobile leaderboard prototype, Learn rebuild notes, architecture rules, AI instructions, and social/multiplayer profile requirements.
- [x] Created review branch `gpt/mobile-profile-page-20260722` from latest documented pushed head `33ff6ef`.
- [x] Confirmed the local source snapshot had a broken `.git` worktree pointer, so branch source was staged in a clean local work folder for this task.

**Completed**

- [x] Rebuilt `/profile` as a mobile-first Cube ID dashboard matching the provided layout direction.
- [x] Preserved existing Supabase reads for profile, solves, stats, cube collection, achievements, challenges, and friendships, with preview fallback data for empty accounts during layout approval.
- [x] Added route shells for `/profile/settings`, `/profile/solves`, `/profile/collection`, `/profile/achievements`, and `/profile/friends`.
- [x] Kept global rank as preview data until the real leaderboard service is built.

**Still not working or unverified**

- [ ] Profile subroutes are not full connected feature pages yet.
- [ ] Production leaderboard/global-rank service is not wired.
- [ ] Real mobile browser QA is not recorded.
- [ ] Production/Vercel deployment is not confirmed.

**Commits / deployments / rollback notes**

- Test: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes, 36 app routes.
- Rollback: revert the new profile dashboard, `ProfilePlaceholderPage`, new profile subroutes, and this documentation entry.

---

## 2026-07-22 — Site health and context-rot review

**Checked**

- [x] Confirmed the latest documented build result remains `npm run build` passing with 31 app routes.
- [x] Reviewed route wiring for missing linked pages.
- [x] Compared the roadmap/status wording against the live Supabase scramble and solver-memory work.
- [x] Documented context-rot reductions from the session in a checkpoint.

**Completed**

- [x] Added `docs/checkpoints/2026-07-22-site-health-context-rot-review.md`.
- [x] Indexed the new checkpoint from `docs/checkpoints/README.md`.
- [x] Updated roadmap status for solver memory and scramble ranking so the docs say database/API exists while UI/browser proof remains pending.

**Still not working or unverified**

- [ ] `/learn`, `/profile/settings`, `/profile/solves`, `/profile/collection`, `/profile/achievements`, and `/leaderboard/player/[rank]` need real routes or disabled links.
- [ ] `/leaderboard` still needs live data from `scramble_attempts`.
- [ ] Two-account challenge send/receive/submit remains unverified.
- [ ] Solver memory UI controls are not wired to `/api/solver-memory`.
- [ ] `npm run lint` is not a usable non-interactive check yet.

**Next priorities**

1. Add route placeholders or real pages for missing clickable links.
2. Build the live read-only scramble leaderboard service.
3. Browser-test the two-account challenge flow and record Supabase row evidence.

---

## 2026-07-22 — Supabase scramble ranking and solver memory applied

**Checked**

- [x] Verified Supabase project access: `Cubelabs3d` is active and queryable.
- [x] Inspected live `challenges`, `challenge_attempts`, and `solve_results` columns before changing schema.
- [x] Ran Supabase security/performance advisors after the migration.

**Completed**

- [x] Applied live Supabase schema for `scrambles`, `scramble_attempts`, and `solver_memories`.
- [x] Added explicit top-level test/admin tracking fields to `solve_results` and `challenge_attempts`.
- [x] Added leaderboard eligibility fields so manual/admin override rows can be excluded from public ranking.
- [x] Added internal scramble stat refresh trigger for play count, best time, and best move count.
- [x] Added repo migration: `supabase/migrations/20260722_tracked_scrambles_solver_memory.sql`.
- [x] Updated solve/challenge APIs so saved results create/reuse scramble rows and write rankable attempts.
- [x] Added `/api/solver-memory` for signed-in saved cube-state history.

**In progress**

- [~] Solver memory has database/API support; individual solver pages still need auto-save and restore controls.
- [~] Paid memory is marked structurally with `memory_tier`, but billing-aware limits are not wired yet.

**Blocked or unverified**

- [ ] Two-account browser test for challenge send/receive/submit is still needed.
- [ ] Vercel deployment status is not verified.
- [ ] Supabase Auth leaked-password protection remains disabled in dashboard settings.

**Commits / deployments / rollback notes**

- Test: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes, 31 app routes.
- Live DB: schema applied through the Supabase connector.
- Rollback: revert the migration/schema additions and API/service changes from this entry; preserve data first if real user attempts exist.

---

## 2026-07-22 — Chosen scrambles, admin overrides, and solver memory requirements

**Checked**

- [x] Re-read the Supabase safety guidance because the requested work touches challenge records, future ranking tables, and paid/logged-in saved state.
- [x] Supabase current-doc fetch remained blocked, so no unverified production schema/RLS changes were added.

**Completed**

- [x] Added chosen-scramble loading to the tracked 3x3 challenge panel.
- [x] Save/send now uses the scramble currently loaded on the cube, including a player-chosen scramble.
- [x] Added collapsed admin/test overrides for reported moves, undo uses, touch moves, button moves, and solved status.
- [x] Replay metadata now keeps actual metrics, reported metrics, manual override flags, and test-data flags.
- [x] Changed `/play/3x3` to the focus layout so the cube takes most of the screen and controls stay collapsible.
- [x] Added a planned Solver Memory card on `/solve` for logged-in and paid-user saved solver history.
- [x] Updated roadmap/social/cube-engine/architecture/ADR/checkpoint docs for scramble databases, ranked scramble attempts, and solver memory.

**In progress**

- [~] Superseded later on 2026-07-22: scramble library/ranking was planned at this checkpoint; `scrambles` and `scramble_attempts` were added in the later Supabase entry, while validation and live leaderboard filtering remain pending.
- [~] Superseded later on 2026-07-22: solver memory was planned at this checkpoint; `solver_memories` and `/api/solver-memory` were added in the later Supabase entry, while paid retention rules, privacy/export/delete, and solver UI remain pending.

**Blocked or unverified**

- [ ] Superseded later on 2026-07-22: the production migration and live schema for scramble library and solver memory were added in the later Supabase entry.
- [ ] No real mobile browser QA recorded.
- [ ] End-to-end Supabase save/send/accept still needs two-account testing.

**Next priorities**

1. Deploy and mobile-test `/play/3x3` and `/leaderboard/3x3/play`.
2. Superseded later on 2026-07-22: scramble and solver-memory migrations were designed and applied; next work is browser proof, live leaderboard reads, and solver UI wiring.

**Commits / deployments / rollback notes**

- Test: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes, 30 app routes.
- Deployment: not confirmed until this follow-up is pushed and Vercel reports Ready.

---

## 2026-07-22 — Tracked 3x3 leaderboard challenge prototype

**Checked**

- [x] Read the documentation index, constitution, architecture, AI instructions, social/multiplayer plan, changelog, and ADR 0001 before coding.
- [x] Confirmed the active worktree is `claude/home-page-html-rebuild-q7qomi`.
- [x] Confirmed the existing `challenges` table can support sender/recipient challenge rows, but does not yet have explicit top-level test-data or recipient-time columns.

**Completed**

- [x] Added `/leaderboard/3x3/play` as the mobile-first playable 3x3 leaderboard challenge.
- [x] Added `/play/3x3` so the shared bottom nav Play route no longer dead-ends.
- [x] Added `/challenge/[id]` for sent challenge attempts and `/profile/challenges` as a basic inbox.
- [x] Added challenge API routes and a provider-isolated challenge service.
- [x] Extended `app/NxNCubeGame.tsx` with 3x3 challenge tracking: official scramble loading, elapsed time, move count, touch/button move counts, undo count, replay metadata, save result, send-to-account, and manual test/admin time override.
- [x] Wired homepage Daily Challenge "Start Challenge" and the leaderboard CTA to `/leaderboard/3x3/play`.

**In progress**

- [~] This is a coded, build-verified challenge prototype, not a production-trusted competition system.
- [~] Manual time overrides are marked inside solve `replay_data`; public ranking still needs explicit schema columns, filtering, validation, and admin review.

**Blocked or unverified**

- [ ] Live Vercel deployment is not confirmed.
- [ ] Real mobile browser QA is not recorded.
- [ ] End-to-end Supabase challenge send/receive is not verified against production data.
- [ ] Production use requires `20260722_cube_id_platform.sql` to be run because it creates the `challenges` table.

**Next priorities**

1. Browser-test `/leaderboard/3x3/play` on mobile.
2. Sign in with two accounts and verify save/send/accept/submit against Supabase.
3. Add explicit challenge/solve tracking columns for test data, assistance flags, recipient time, and validation status.
4. Build the real `getLeaderboard()` service only after test-data exclusion and anti-cheat review exist.

**Commits / deployments / rollback notes**

- Branch/worktree: `claude/home-page-html-rebuild-q7qomi`.
- Commit: not created in this session.
- Deployment: local build verified only.
- Test: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes, 30 app routes.
- Known issues: no anti-cheat, no server-side cube-state validation, exact recipient lookup only, and no production leaderboard ranking service.
- Rollback: remove the new challenge routes/API/service/shared constants and revert the NxN cube, homepage, leaderboard, and documentation edits from this entry.

---

## 2026-07-22 — Leaderboard mobile prototype

**Checked**

- [x] Identified Vercel screenshot branch as `claude/home-page-html-rebuild-q7qomi` (`388fa85`), not `bbuxsbsmd`.
- [x] Read the deployed branch documentation set before correcting the implementation target.
- [x] Confirmed docs require mobile-first design, shared components, provider-isolated data, test-data exclusion, and changelog/daily-log updates.

**Completed**

- [x] Added `/leaderboard` mobile visual prototype matching the owner reference.
- [x] Added shared `AppBottomNav` for Next app routes.
- [x] Added `leaderboard-preview` data module with explicit preview/test-data markers.
- [x] Wired the homepage Daily Challenge "View Leaderboard" action to `/leaderboard`.
- [x] Updated roadmap/social/changelog documentation without marking production leaderboards complete.

**In progress**

- [~] Production leaderboards remain architecture/planning work: real `getLeaderboard()` service, database ranking snapshots, assisted/unassisted categories, test-data filtering, suspicious-result review, and admin moderation are still needed.

**Blocked or unverified**

- [ ] Real mobile browser QA is not recorded yet.
- [ ] Live deployment is not confirmed yet.

**Next priorities**

1. Wire `/leaderboard` from the appropriate app navigation once the owner approves the page direction.
2. Replace preview data with a service-layer leaderboard backed by solve results and ranking snapshots.
3. Add admin leaderboard moderation/test-data controls before public rankings are trusted.

**Commits / deployments / rollback notes**

- Branch/worktree: `claude/home-page-html-rebuild-q7qomi` at `388fa85`.
- Commit: recorded in branch history for this change set.
- Deployment: local build verified; live Vercel deployment not confirmed yet.
- Test: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes, 26 app routes.
- Known issues: preview/test data only; no production ranking service.
- Rollback: remove `app/leaderboard/`, `components/AppBottomNav.tsx`, `lib/leaderboard-preview.ts`, and this documentation entry.

---

## 2026-07-22 — Promote to `main` + doc refresh

### Completed

- [x] Promoted `claude/working-status-mumm9x` to `main` (fast-forward `80037f1..76f244d`).
- [x] Refreshed docs to post-merge reality: `CURRENT_STATUS.md`, `ROADMAP.md`, `PROJECT-HEALTH.md`, `CHANGELOG.md`.
- [x] Added a **Status & tracking rules** section (ROADMAP) and a live **branch registry** (CURRENT_STATUS).

### Status changes logged

- 3×3 manual color entry: `[?]` → `[~]` (merged `components/ManualSolver.tsx`; fixtures pending).
- NxN timer/solved-state/scramble history: `[~]` → `[x]` (merged `app/NxNCubeGame.tsx`).
- Arbitrary-state 4×4 solver: `[~]` (now merged `lib/cube4-solver.ts`; fixtures pending).
- Interim 5×5 solver: `[~]` (merged `lib/cube5-*.ts`; deterministic path still WIP).
- Password reset / Cube ID dashboard / Cube Labs Mail: `[~]` (merged; migration + verify pending).
- Homepage-matched `/auth`: `[x]` (merged, build-verified).

### Blocked / owner action

- [ ] Run both `20260722_*.sql` migrations in production, then verify `/profile` + `/profile/mail`.
- [ ] Verify password-reset + SES delivery end-to-end; write the runbook.
- [ ] Delete the six merged branches — deletion is policy-blocked (403) in the agent session.

### Next priorities

1. Confirm migrations + browser-verify Cube ID and Mail.
2. Add solver correctness fixtures before any solver goes `[x]`.
3. Decide on porting the RootB homepage/playback/social work.

---

## 2026-07-22 — Branch audit and merge-candidate assembly

### Checked

- [x] Enumerated all 11 branches and classified each by root.
- [x] **Found two unrelated Git histories** (roots `01445ce` vs `e28a424`); the RootB line shares no merge base with `main`.
- [x] Confirmed via Vercel that `main` is the live production deploy and that `claude/new-session-euaf6s` + `gpt/cube-id-platform` are the actively-deployed preview branches.
- [x] Confirmed the two active branches touch disjoint files (no conflicts).

### Completed

- [x] Assembled merge candidate on `claude/working-status-mumm9x` = `main` + `gpt/cube-id-platform` + `claude/new-session-euaf6s`.
- [x] `npm install` + `npm run build` pass (25 routes, types valid).
- [x] Updated `CHANGELOG.md`, `CURRENT_STATUS.md`, and `ROADMAP.md` to record the merge and the two-history split.

### Blocked / needs owner

- [ ] Promote candidate to `main` — gated on running both `supabase/migrations/20260722_*.sql` and a preview review.
- [ ] Decide fate of the RootB line (homepage hero, animated solver playback, social challenges) — manual port only.
- [ ] Resolve competing auth-page designs: `gpt/cube-id-platform` gateway vs. `gpt/current-site-state` redesign.

### Next priorities

1. Owner runs migrations + reviews preview, then fast-forward `main` to the candidate.
2. Delete merged-out branches (`supabase-auth-foundation`, `test-cube-engine`).
3. Decide RootB port scope.

---

## 2026-07-22 — Branch documentation recovery

### Checked

- [x] Compared known active and historical branches against `main`.
- [x] Found two unique social/multiplayer checklists on `feature/social-challenges-foundation`.
- [x] Found additional NxN tracked-state notes on `claude/cube-engine-centering-zb2e9m`.
- [x] Found a password-reset Vercel preview trigger on `gpt/cube-id-platform`.
- [x] Confirmed `supabase-auth-foundation`, `drive-homepage-import`, and `test-cube-engine` had no Markdown changes ahead of `main`.
- [x] Confirmed branch-only implementation must not be marked shipped solely because its documentation was recovered.

### Completed

- [x] Added `docs/SOCIAL-AND-MULTIPLAYER.md` by consolidating both branch social checklists.
- [x] Added `docs/CUBE-ENGINE.md` and classified the recovered NxN material as branch-only pending code verification.
- [x] Added `docs/PROJECT-HEALTH.md`.
- [x] Archived the password-reset preview trigger under `docs/checkpoints/`.
- [x] Updated the documentation index and master roadmap.

### In progress or unverified

- [~] Social challenge prototype exists on a stale/diverged branch and needs safe reconciliation with current `main`.
- [~] NxN timer, solved-state, and scramble-history parity is described with branch code but is not verified canonical.
- [?] General-purpose arbitrary-input 3×3 solver status.
- [~] 4×4 reduction/edge-pairing solver status.
- [~] 5×5 solver status.
- [~] Password reset and AWS SES production reliability.

### Next priorities

1. Inspect current 3×3 solver implementation and fixtures.
2. Compare current `main` with the 4×4/5×5 solver branches and packages.
3. Decide whether to manually port the branch-only NxN tracked-state changes.
4. Rebase or selectively port the social prototype after defining the versioned puzzle-state contract.
5. Verify password reset and SES, then complete the auth operations runbook.

### Commits and rollback

- Branch: `main`
- Change type: documentation-only recovery and classification
- Runtime deployment impact: none
- Rollback: revert the documentation recovery commits; not recommended because they preserve unique branch knowledge.

---

## 2026-07-22 — Documentation control foundation

### Checked today

- [x] Confirmed `drunkducker/cubelabs3d` is accessible and `main` is the default branch.
- [x] Reviewed recent repository commits.
- [x] Confirmed permanent documentation governance was added.
- [x] Confirmed `docs/README.md` exists and links to a canonical roadmap.
- [x] Confirmed `docs/ROADMAP.md`, `docs/CURRENT_STATUS.md`, and a permanent daily log were initially missing.
- [x] Confirmed `docs/CHANGELOG.md` identified checkpoint consolidation as unfinished.

### Added today

- [x] `docs/CURRENT_STATUS.md`
- [x] `docs/ROADMAP.md`
- [x] `docs/DAILY-LOG.md`
- [x] Historical checkpoint archive index
- [x] Documentation index links
- [x] Changelog entry for consolidation

### Verified project progress

- [x] GitHub, Vercel, domain, mobile-first site, homepage, and documentation foundation
- [x] Supabase authentication and profile foundation
- [x] Sign In route wiring
- [x] Playable cube platform foundation and larger NxN work
- [x] High-DPI mobile canvas correction
- [x] Playable Pyraminx with solver and interaction improvements
- [~] Password reset and AWS SES production verification
- [?] General-purpose 3×3 arbitrary-input solver completion
- [~] 4×4 solver and edge-pairing completion
- [~] 5×5 solver completion
- [ ] Camera scanner
- [ ] Production social systems, leaderboards, admin portal, and monetization

---

## Daily entry template

### YYYY-MM-DD

**Checked**

- [ ] Repository and branch state
- [ ] Builds and tests
- [ ] Deployment status
- [ ] Current roadmap items
- [ ] Documentation/changelog alignment

**Completed**

- [ ] Item

**In progress**

- [ ] Item

**Blocked or unverified**

- [ ] Item — reason

**Next priorities**

1. Priority

**Commits / deployments / rollback notes**

- Commit:
- Deployment:
- Known issues:
- Rollback:
