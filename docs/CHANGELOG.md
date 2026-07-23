# Cube Labs 3D Changelog

This file records meaningful product, architecture, security, database, deployment, and documentation changes. Small mechanical edits may remain in Git history.

## 2026-07-23 — Merge admin/profile work into main

- Branches merged: `claude/cubelabs-admin-dashboard-4pe35q`, `origin/gpt/mobile-profile-page-20260722`, and local `gpt/mobile-profile-page-20260722` follow-up commits.
- Added to main promotion: admin platform, ads/affiliates/media/billing, tracked 3x3 challenge flow, scramble/solver-memory schema/API, connected mobile profile/social discovery/privacy queue, public `/u/[slug]`, and homepage-linked `/news`, `/my-arcade`, `/learn`.
- Security hardening: bumped Next.js and `eslint-config-next` from `14.2.15` to `14.2.35`; added global security headers and CSP in `next.config.mjs`.
- Merge note: `/learn` now uses the app route; the standalone HTML rebuild remains reachable at `/learn/standalone`.
- Remaining gates: run all dated Supabase migrations, configure service-role/Stripe/media bucket, bootstrap owner admin, and browser/RLS-test before marking admin/profile/social/billing as `[x]`.

## 2026-07-23 — Roles editor, media library, premium billing, operator UX

- Branch: `claude/cubelabs-admin-dashboard-4pe35q`.
- **Migration** `20260725_media_and_billing.sql`: `media_assets`, `premium_plans` (seeded), `premium_subscriptions`; RLS deny-by-default with public read only for active plans and self-read for own subscription.
- **Roles editor** (`/admin/roles`, owner-only): assign roles by email, deactivate, capability reference; audited; refuses to remove the last active Owner.
- **Sortable DataTable** (`components/admin/DataTable.tsx`) with client filter + mobile card fallback; used on roles and billing.
- **Operator UX:** header **notification bell** (unresolved security events + open reports), **⌘K command palette** (jump to sections / user search), and an **onboarding checklist** on the overview driven by real readiness signals.
- **Media library** (`/admin/media` + `/api/admin/media`): image upload validated by **magic bytes** (not extension), 5 MB cap, stored in a private `admin-media` Storage bucket via the service role, metadata tracked in `media_assets`; audited. Signed-URL preview endpoint. Pure detector extracted to `lib/admin/image-detect.ts` and unit-tested.
- **Premium billing** (`/admin/billing`, `lib/admin/billing.ts`): plans + subscriptions views; Stripe **checkout** route (`/api/billing/checkout`, no SDK) and **webhook** route (`/api/billing/webhook`) that verifies the Stripe signature via HMAC-SHA256 + timing-safe compare and syncs entitlement to auth metadata. Fails closed without `STRIPE_*` keys.
- Testing: `tsc` clean; `npm run build` 42 routes; `npm test` **33/33** (adds image-detection tests); lint exit 0. Not deployed; migrations not applied; Stripe/Storage not configured here; not browser-verified.

## 2026-07-23 — Public ad/affiliate rendering + admin dashboard polish

- Branch: `claude/cubelabs-admin-dashboard-4pe35q`.
- **Public rendering (closes the display gap):** `components/ads/AdSlot`, `AffiliateProductCard`/`AffiliateProductGrid`, `ManagedCarousel` render live managed content on any page via the anon key (RLS exposes only active/in-window rows); fail soft to null. `lib/ads/public.ts` is the read layer. Affiliate links use `rel="sponsored nofollow"` and always show a disclosure.
- **Tracking:** `/api/ads/track` records impressions/clicks with `navigator.sendBeacon` → narrow SECURITY DEFINER RPCs (`bump_ad_impression`/`bump_ad_click`/`bump_affiliate_click`, `supabase/migrations/20260724_ad_rendering.sql`) that increment one counter on a live row and grant no other access.
- **Owner preview:** `/admin/ads/preview` renders the real components per placement in mobile + desktop frames (linked from `/admin/ads`).
- **Admin UI polish:** dependency-free dark-theme SVG charts (`components/admin/Charts.tsx` — Bar/Donut/Sparkline) on the overview with a real 7-day production-solve trend; accessible native-`<dialog>` confirm control (`ConfirmSubmit`) on destructive one-click actions (test-run cleanup, campaign archive). Chose hand-built charts over Tremor to avoid conflicting with the dark design system (Constitution §visual-frameworks).
- **Docs:** added `ADMIN-GUIDE.md` (operator how-to: Amazon affiliate links, ads, day-to-day); updated `ADS-AFFILIATES.md`, `ROADMAP.md` §7, `ADMIN-GUIDE.md` gaps.
- Testing: `tsc --noEmit` clean; `npm run build` passes (39 routes; adds `/admin/ads/preview`, `/api/ads/track`); `npm test` 27/27; lint exit 0. Not deployed; migrations not applied; not browser-verified.

## 2026-07-23 — Admin dashboard platform (coded, build-verified)

- Branch: `claude/cubelabs-admin-dashboard-4pe35q`.
- Added a protected, mobile-first `/admin` platform with a separate admin layout and 12 areas: overview, users (+detail), ads, carousels/affiliates, test-lab, leaderboards, challenges, content, security, audit, settings/flags, exports.
- Security model (ADR 0003, `docs/SECURITY.md`): server-side `requireAdmin`/`requirePermission`/`authorizeAction`; authorization stored in `admin_members` (not profiles/metadata); centralized permission matrix with an enforced owner-only set; service-role key server-only (`SUPABASE_SERVICE_ROLE_KEY`), used only after auth passes, fails closed; append-only redacted audit log; origin checks + safe-URL/size validation; typed-phrase + reason on destructive actions.
- Database: additive idempotent migration `supabase/migrations/20260723_admin_platform.sql` — 11 new tables (all RLS-enabled, deny-by-default with narrow public read policies), additive gameplay columns preserving originals, `bootstrap_owner()`.
- Managed advertising is database-driven (no deploy to change content); drafts/expired never render; all sponsored/affiliate content disclosed. Test data is isolated (`is_test`, `test_run_id`, `leaderboard_eligible=false`) and excluded from public rankings.
- Docs: created `SECURITY.md`, `AUTHENTICATION.md`, `ADS-AFFILIATES.md`, `CODING-STANDARDS.md`, `VISION.md` (index no longer points to missing files); ADR 0003; updated ARCHITECTURE, ROADMAP, ADMIN-PORTAL, PROJECT-HEALTH, CURRENT_STATUS, DAILY-LOG.
- Tooling: added Vitest with 27 passing unit tests; made `next lint` non-interactive (`.eslintrc.json`) so it is CI-safe.
- Testing: `tsc --noEmit` clean; `npm run build` passes (38 routes); `npm test` 27/27; `npm run lint` exit 0. **Not** deployed, browser-tested, or production-verified; migration not yet applied and service-role key not set.

## 2026-07-23 — Add homepage-linked News, My Arcade, and Learn hubs

- Branch: `gpt/mobile-profile-page-20260722`.
- Purpose: make the homepage branch into owner-controlled site areas instead of dead "coming soon" cards.
- Added: `/news` as a mobile-first Cube Labs News hub for site updates, cube news, review queue, video queue, and owner notes.
- Added: `/my-arcade` as an owner arcade hub for live cube play modes and future original games.
- Added: `/learn` as a lightweight learning hub so existing homepage and bottom-nav Learn links no longer 404 on this branch.
- Updated: homepage feature cards now link to My Arcade, Daily Challenge, Learn, and News.
- Updated: lower homepage rails now link their View All controls and cards into `/news`, `/my-arcade`, and `/learn`.
- Testing: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes (39 app routes).
- Known issues: News content is curated/static for now; My Arcade owner-game cards are future slots; deeper Learn lessons still need the full content system.

## 2026-07-22 — Add social discovery and privacy request queue

- Branch: `gpt/mobile-profile-page-20260722`.
- Purpose: fix the gap where users had friend rows but no practical way to find or challenge other players from the profile area.
- Added: solve/time-based player suggestions in `app/lib/profile-service.ts`, using public profiles, favorite puzzle, ranked scramble overlap, nearby best times, tracked solve volume, and allowed location signals.
- Added: `/profile/friends` search by Cube Tag, username, public slug, or display name, plus suggestion cards with Add, Challenge, and View actions.
- Added: friend request server actions for send, accept, decline, cancel/remove, all through the existing `friendships` table.
- Added: public player route `/u/[slug]` for privacy-aware profile viewing and challenge shortcuts.
- Updated: `/profile` now includes a People To Challenge section.
- Updated: `/leaderboard/3x3/play` accepts a `recipient` query param and pre-fills the existing send-challenge form.
- Added migration: `supabase/migrations/20260722_social_discovery_privacy_requests.sql` for profile account-status fields, `account_data_requests`, social-discovery indexes, privacy mail templates, public-profile search RLS, and tighter friendship RLS.
- Updated: `/profile/settings` now includes Data Export and Close Account controls. Export and closure are queued; close-account also makes the profile private immediately.
- Testing: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes.
- Known issues: production export email delivery and final auth-user deletion still need a server-only privacy worker/service-role process; this pass queues the request and hides public data but does not pretend the account has been fully deleted.

## 2026-07-22 — Wire approved mobile profile routes

- Branch: `gpt/mobile-profile-page-20260722`.
- Purpose: owner approved the mobile profile layout, so the branch moved from review-safe shells to connected profile pages.
- Added: `app/lib/profile-service.ts` as the shared data layer for profile identity, solves, stats, cube collection, achievements, challenges, friendships, settings, notifications, and rank summary reads.
- Added: server actions for profile settings saves and challenge decline.
- Updated: `/profile` now uses the shared profile service and reads global rank from live eligible rows, preferring `scramble_attempts` and falling back to eligible `solve_results`.
- Updated: `/profile/settings`, `/profile/solves`, `/profile/collection`, `/profile/achievements`, and `/profile/friends` are connected mobile pages instead of placeholders.
- Updated: `/profile/challenges` now exposes a decline action while keeping challenge opening as the accept path.
- Removed: obsolete `components/ProfilePlaceholderPage.tsx`.
- Testing: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes (36 app routes).
- Known issues: public rank is still not production-trusted until anti-cheat, browser proof, assisted/unassisted categories, admin review, and ranking snapshots exist; cube collection and friend management write actions are still future work.

## 2026-07-22 — Add mobile profile dashboard layout

- Branch: `gpt/mobile-profile-page-20260722`.
- Purpose: rebuild `/profile` from the owner-provided mobile mockup while preserving the latest homepage, leaderboard, learn, and challenge work.
- Updated: `/profile` now uses the compact Cube Labs app shell with branded header, profile hero, stat tiles, quick-action tabs, recent solves, favorite cubes, achievements, challenge invite, and a centered Play bottom nav.
- Added: placeholder routes for `/profile/settings`, `/profile/solves`, `/profile/collection`, `/profile/achievements`, and `/profile/friends` so profile dashboard links no longer 404 during layout review.
- Data status: `/profile` still reads the existing Supabase profile, solve, stats, collection, achievements, challenges, and friendship rows where available. Empty accounts use preview fallback rows for layout approval. Global rank remains a preview hook until the production leaderboard service exists.
- Testing: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes (36 app routes).
- Deployment status: branch created for review; production deployment and real mobile QA are not confirmed.
- Known issues: settings, solve history, collection, achievements, and friends pages are route shells only; final actions should be wired through app services after the profile layout is approved.
- Rollback: revert the profile page replacement, remove `components/ProfilePlaceholderPage.tsx`, remove the new profile subroutes, and revert these documentation entries.

## 2026-07-22 — Add tracked scramble database and solver memory

- Branch: `claude/home-page-html-rebuild-q7qomi`.
- Purpose: promote chosen scrambles, challenge attempts, admin/test tracking, and solver memory from documented future work into the live Supabase schema and server APIs.
- Added migration: `supabase/migrations/20260722_tracked_scrambles_solver_memory.sql`.
- Added live tables: `scrambles`, `scramble_attempts`, and `solver_memories`.
- Updated live tables: `solve_results`, `challenges`, and `challenge_attempts` now have explicit scramble IDs, leaderboard eligibility, test-data flags, manual override flags, actual/reported tracking metrics, and assistance flags.
- Added API: `/api/solver-memory` for signed-in solver-state save/load.
- Updated API/service: solve saves and challenge attempts now create/reuse scramble rows and write rankable `scramble_attempts` records instead of relying only on `replay_data`.
- Security: RLS is enabled on new tables; solver memories are owner-only; public leaderboard reads are limited to `leaderboard_eligible` attempts; the old public executable profile trigger warning was fixed by revoking direct API execute.
- Supabase advisors: security advisor now only reports leaked password protection disabled in Auth settings; performance advisor mostly reports expected unused-index notices on this new/low-data project.
- Testing: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes (31 app routes).
- Remaining work: wire individual solver pages to auto-save through `/api/solver-memory`, add billing-aware paid memory limits, and browser-test two-account challenge submission end to end.

## 2026-07-22 — Refine tracked 3x3 challenge controls

- Branch: `claude/home-page-html-rebuild-q7qomi`.
- Purpose: support player-chosen scrambles, make 3x3 play mode more cube-first, and document admin testing plus future scramble/solver-memory systems.
- Added: chosen-scramble input on the tracked 3x3 challenge panel. Save/send now uses the scramble currently loaded on the cube.
- Added: collapsed admin/test tracking overrides for reported moves, undo uses, touch moves, button moves, and solved status. Replay metadata preserves both actual and reported metrics and marks override records as test data.
- Updated: `/play/3x3` now uses the focus layout so the cube takes most of the screen and controls remain collapsible.
- Updated: `/solve` now shows planned Solver Memory for logged-in and paid users, without marking the database-backed system complete.
- Documentation: updated roadmap, social/multiplayer, cube-engine, architecture, ADR 0002, and the next-steps checkpoint with scramble library/ranking and solver-memory requirements.
- Data status: no new production migration was added. Future work still needs explicit `scrambles`, `scramble_attempts`, and solver-memory tables plus server-side authorization and retention rules.
- Testing: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes (30 app routes).
- Deployment status: local code/docs update only until pushed and deployed.

## 2026-07-22 — Add tracked 3x3 leaderboard challenge prototype

- Branch: `claude/home-page-html-rebuild-q7qomi`.
- Time: 2026-07-22 20:26 EDT.
- Purpose: make the leaderboard lead into a playable tracked 3x3 attempt that can save a result and send the same scramble to another Cube Labs account.
- Added: `/leaderboard/3x3/play`, `/play/3x3`, `/challenge/[id]`, `/profile/challenges`, `app/api/challenges`, `app/api/challenges/[id]/attempt`, `app/lib/challenge-service.ts`, and shared daily challenge constants.
- Updated: `app/NxNCubeGame.tsx` now has 3x3 challenge mode with official scramble loading, elapsed time, move count, touch/button move tracking, undo count, replay metadata, manual test/admin complete-time override, save result, and send-to-account controls.
- Wiring: homepage Daily Challenge "Start Challenge" and the leaderboard CTA now route to `/leaderboard/3x3/play`; `/play/3x3` now exists for the shared bottom nav.
- Data status: solve results are saved through the existing `solve_results` table. Sent challenges use the existing `challenges` table from `20260722_cube_id_platform.sql`. Manual time overrides are marked in `replay_data` as `is_test_data` / `manual_time_override`; a future migration should add explicit top-level test/assistance columns before public ranking.
- Testing: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes (30 app routes).
- Deployment status: coded and build-verified locally; live Vercel deployment and real mobile QA are not confirmed.
- Known issues: no production anti-cheat, no server-side cube-state validation, no real friend picker, no public leaderboard ranking service, exact-recipient lookup only, and production use requires the existing Cube ID/challenges migration to be run.
- Rollback: remove the new challenge routes/API/service/shared constants, revert `app/NxNCubeGame.tsx`, `components/EcosystemSections.tsx`, and `app/leaderboard/page.tsx`, then remove this documentation entry.

## 2026-07-22 — Add mobile leaderboard visual prototype

- Branch: `claude/home-page-html-rebuild-q7qomi` preview/deployment worktree at `388fa85`.
- Purpose: build the first mobile-first `/leaderboard` page from the owner-provided reference without changing the approved homepage.
- Added: `app/leaderboard/page.tsx`, reusable `components/AppBottomNav.tsx`, and `lib/leaderboard-preview.ts`.
- Follow-up wiring: homepage Daily Challenge "View Leaderboard" now links to `/leaderboard`.
- Data status: leaderboard rows are explicitly marked preview/test data. Production ranking still needs a provider-isolated `getLeaderboard()` service, server-side validation, assisted/unassisted flags, suspicious-result review, and test-data exclusion.
- Documentation: updated roadmap/social planning and daily log to classify this as a prototype only.
- Testing: `HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build` passes (26 app routes, including `/leaderboard`).
- Deployment status: coded and build-verified locally; live Vercel deployment must be confirmed after the branch updates.
- Known issues: no live Supabase leaderboard service, no admin moderation workflow, no real mobile browser QA recorded.
- Rollback: remove the three added leaderboard/navigation/data files and revert the documentation entries.

## 2026-07-22 — Add reachable "Forgot your password?" entry on `/auth`

- Branch: `claude/working-status-mumm9x`.
- Gap: the working reset-request form lived only on `/auth/email`, but the live homepage-matched `/auth` page had no link to it, so password reset was effectively unreachable in production.
- Fix: added a native `<details>` "Forgot your password?" disclosure in the `/auth` sign-in card that posts to the existing `requestPasswordReset` action (no client JS). Redirected the reset action's own success/error messages back to `/auth` so the flow stays on the clean page.
- Testing: `npm run build` passes (25 routes). Email delivery + Supabase redirect allowlist still required for full end-to-end success.

## 2026-07-22 — Fix password-reset / signup email link origin

- Branch: `claude/working-status-mumm9x`.
- Bug: `app/auth/actions.ts` pinned Supabase `redirect_to` links (password reset and signup confirmation) to a preview branch URL (`cubelabs3d-git-gpt-cube-id-platform-…vercel.app`) — not production, and about to be deleted with that branch. Reset/confirm links would have pointed at a dead host.
- Fix: added `getSiteOrigin()` — prefers `NEXT_PUBLIC_SITE_URL`, then the real request origin (`x-forwarded-host`/`host`), then a production fallback. Both `redirect_to` links now use it.
- Also: `app/auth/reset/page.tsx` now reads `NEXT_PUBLIC_SUPABASE_*` (with fallbacks) instead of hard-coded values; documented `NEXT_PUBLIC_SITE_URL` in `.env.example`.
- Required config: list each site origin in Supabase Auth → URL Configuration → Redirect URLs. Email delivery (SES/Supabase SMTP) still needs end-to-end verification before password reset is marked `[x]`.
- Testing: `npm run build` passes (25 routes). Not yet browser-verified end-to-end.

## 2026-07-22 — Promote merge to `main` and add status-tracking rules

- Branch: `claude/working-status-mumm9x` → `main` by fast-forward (`80037f1..76f244d`, no force, no history rewrite).
- Shipped to production baseline: Cube ID dashboard, password reset, Cube Labs Mail, homepage-matched `/auth` sign-in, arbitrary-state 4×4 solver, interim 5×5 solver, 3×3 manual entry, and NxN timer/scramble history.
- Documentation: rewrote `CURRENT_STATUS.md` (post-merge state + live **branch registry**), added a **Status & tracking rules** section to `ROADMAP.md`, and updated `PROJECT-HEALTH.md` ratings/risks. Flipped merged roadmap items to `[~]`/`[x]` with named evidence.
- New tracking rules (summary): `main` is the only source of truth; every `[x]` names its evidence; migrations gate the checkbox; build ≠ verified; log every status change; keep the branch registry current; never `git merge` a RootB branch.
- Required deployment step (still open): run `supabase/migrations/20260722_cube_id_platform.sql` and `20260722_cube_labs_mail_foundation.sql` in production, then verify `/profile` and `/profile/mail`.
- Cleanup pending (owner): delete the six fully-merged branches — branch deletion is blocked in the agent session (policy 403).
- Rollback: `main` history is linear and intact; revert the merge commits if needed.

## 2026-07-22 — Assemble merge candidate for next `main`

- Branch: `claude/working-status-mumm9x` (merge candidate; not yet promoted to `main`).
- Base: current production `main` (`80037f1`), which is the live deploy at `cubelabs3d.vercel.app`.
- Merged `gpt/cube-id-platform`: Cube ID player dashboard, provider auth routes, working password-reset flow, password visibility field, and the Cube Labs Mail foundation (branded template renderer + activity page).
- Merged `claude/new-session-euaf6s`: 3×3 manual color entry with invalid-entry freeze fix, real arbitrary-state 4×4 solver, interim reduced-state 5×5 solver, and NxN timer / solved-state / scramble history.
- Merge quality: the two branches touch disjoint file sets, so both merged with zero conflicts.
- Testing: `npm install` and `npm run build` succeed — 25 routes compiled, type-check passed.
- Required deployment step: run both Supabase migrations before promoting — `supabase/migrations/20260722_cube_id_platform.sql` and `supabase/migrations/20260722_cube_labs_mail_foundation.sql`.
- Auth-page design decision: kept the homepage-matched single-page email Sign In / Create account page from `gpt/current-site-state` (Version B) as `/auth`, plus its `AccountHeader`, because it preserves the existing Sign In flow and works today. The `gpt/cube-id-platform` provider gateway (Version A) is parked — its `/auth/email` and `/auth/provider/*` routes remain in place, dormant, ready to become the front door once Google/Apple/GitHub OAuth is actually enabled in Supabase. Password reset, Cube ID dashboard, and Cube Labs Mail from cube-id-platform are all retained.
- Deliberately excluded: `claude/more-cubelabs-yuom1x` (tip is an incomplete WIP 5×5 rewrite), and the parallel RootB line (see repository-history note below).
- Rollback: `main` is untouched; discard this branch to abandon the candidate.

### Repository history note (important)

The repository contains **two unrelated Git histories**. The current `main` and all recent `gpt/*`, `claude/*`, `supabase-auth-foundation`, and `test-cube-engine` branches descend from root `01445ce` (2026-07-21). A separate line — `drive-homepage-import`, `fix/cube-transform-stability`, and `feature/social-challenges-foundation` — descends from an unrelated root `e28a424` (2026-07-20) and shares **no merge base** with `main`. That parallel line is not deployed on Vercel; its interactive-hero, animated solver-playback, and social-challenge work would require a manual port rather than a `git merge` if ever wanted.

## 2026-07-22 — Branch documentation recovery and project health

- Author: OpenAI GPT working with the project owner
- Branch: `main`
- Purpose: recover unique documentation from stale or diverged branches without falsely marking branch-only code as shipped.
- Added: `SOCIAL-AND-MULTIPLAYER.md`, `CUBE-ENGINE.md`, `PROJECT-HEALTH.md`, and `checkpoints/2026-07-22-password-reset-preview.md`.
- Consolidated: the two overlapping social/multiplayer checklists from `feature/social-challenges-foundation` into one permanent plan.
- Recovered: NxN tracked-state design notes from `claude/cube-engine-centering-zb2e9m`; explicitly classified corresponding implementation as branch-only pending verification or selective porting.
- Preserved: password-reset preview deployment trigger from `gpt/cube-id-platform` as a historical checkpoint.
- Updated: documentation index, current status, roadmap, and daily check-in log.
- Testing: verified branch comparisons, source-document reads, and successful GitHub writes; no runtime application code changed.
- Deployment: documentation-only changes on `main`.
- Known follow-up: verify solver implementation states, decide whether to port NxN tracked-state code, and reconcile the social prototype only after defining a versioned puzzle-state contract.
- Rollback: revert these documentation commits; not recommended because the recovered branch knowledge would again be scattered and easy to lose.

## 2026-07-22 — Current-status and daily check-in system

- Author: OpenAI GPT working with the project owner
- Branch: `main`
- Purpose: replace scattered current-state assumptions with one verified status document, one canonical roadmap, and a repeatable daily check-in process.
- Added: `CURRENT_STATUS.md`, `ROADMAP.md`, `DAILY-LOG.md`, and `checkpoints/README.md`.
- Updated: documentation index and required documentation workflow.
- Checklist policy: roadmap items are checked only when repository evidence and required documentation support completion.
- Historical policy: old status files are preserved as checkpoints but cannot override current permanent documents.
- Testing: documentation paths and repository writes were verified through GitHub; no runtime application code changed.
- Deployment: documentation-only changes on `main`.
- Known follow-up: inspect current 3×3, 4×4, and 5×5 implementation and tests to replace unverified or partial roadmap statuses with exact evidence-backed results.
- Rollback: revert the documentation commits; not recommended because the new files resolve missing links and establish the requested daily project control system.

## 2026-07-22 — Documentation governance foundation

- Author: OpenAI GPT working with the project owner
- Branch: `main`
- Purpose: establish the permanent `/docs` source-of-truth structure and enforce correct documentation and change logging.
- Added: documentation index, project constitution, architecture rules, AI instructions, admin portal specification, and backup/migration strategy.
- Structural rule: contributors must follow the documented structure and log meaningful changes in the correct permanent documents.
- Testing: verified repository write access and successful GitHub commits for each new document.
- Deployment: documentation-only change; no runtime behavior changed.
- Known follow-up: add the remaining feature-specific documents and fold older checkpoint notes into permanent documents or an archive index.
- Rollback: revert the documentation commits; not recommended because these files define required project governance.

## Earlier project history summary

The repository history and existing checkpoint documents record earlier work including:

- mobile-first homepage and interactive hero cube;
- playable 3×3 and larger NxN cube work;
- solver and cube-rendering fixes;
- mobile viewport and high-DPI canvas fixes;
- Pyraminx implementation;
- Supabase database and authentication foundation;
- Cube ID profile and social platform foundation;
- early community, friendship, challenge, and leaderboard planning;
- Vercel branch deployments and environment configuration.

These entries will be expanded as older progress documents are reviewed and consolidated.
