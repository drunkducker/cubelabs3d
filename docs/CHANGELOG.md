# Cube Labs 3D Changelog

This file records meaningful product, architecture, security, database, deployment, and documentation changes. Small mechanical edits may remain in Git history.

## 2026-07-23 — Place ad / affiliate components on public pages

- Branch: `claude/cubelabs-admin-dashboard-4pe35q`.
- Placements (all render nothing when no live content exists — approved layouts are unchanged until an owner publishes):
  - Homepage `app/page.tsx`: `<ManagedCarousel placement="home_carousel" />` between `FeatureGrid` and `EcosystemSections`. Hero + header untouched.
  - `/solve` hub: `<AffiliateProductGrid placement="solver_product_carousel" />` above the "more coming" card.
  - `/solver/{2x2,3x3,4x4,5x5}`: `<AdSlot placement="solver_top_banner" />` between title and solver, and `<AffiliateProductGrid placement="solver_product_carousel" />` below the solver.
  - `/solver/pyraminx` deliberately skipped (full-screen game layout).
- `export const revalidate = 60` on each page so content refreshes without a deploy but public traffic doesn't hammer the anon Supabase reads. Homepage moves from static to dynamic — the trade-off is intentional.
- Docs: ROADMAP §7 items updated to reflect placement.
- Testing: `tsc --noEmit` clean; `npm run build` 43 routes; `npm test` 33/33; lint exit 0. Not deployed; nothing shows publicly until an owner publishes at `/admin/ads` or `/admin/carousels`.

## 2026-07-23 — Security hardening pass

- Branch: `claude/cubelabs-admin-dashboard-4pe35q`.
- **Dependency bump:** `next` 14.2.15 → **14.2.35** (patched-CVE line); `eslint-config-next` matched. `npm audit --audit-level=high` gate in CI.
- **Security response headers** (`next.config.mjs`): HSTS (2y + preload), `X-Frame-Options: DENY`, nosniff, strict Referrer-Policy, restrictive Permissions-Policy, DNS-prefetch off, `poweredByHeader: false`, and a **Content-Security-Policy in Report-Only** (default-src 'self', connect-src Supabase + api.stripe.com, frame-ancestors 'none', object-src 'none').
- **Rate limiting** (`supabase/migrations/20260726_rate_limiting.sql`): `rate_limits` table + `check_rate_limit` SECURITY DEFINER RPC + `lib/admin/rate-limit.ts`. Wired into sign-in (per-IP + per-email lockout), password reset, privileged admin actions, media upload, billing checkout, MFA verify, and the public ad-tracking beacon. Fails **open** on user-facing paths so a limiter outage cannot lock users out.
- **Admin 2FA (TOTP)** via Supabase MFA: `/admin/security/mfa` enrollment page + `MfaSetup` component + `/api/admin/mfa` (enroll/verify/unenroll, rate-limited, audited) + `lib/admin/mfa.ts`. Optional strict enforcement gated by `ADMIN_REQUIRE_MFA`: `requirePermission` demands aal2 while the MFA page itself uses `requireAdmin` so an aal1 admin can always complete enrollment. Security center surfaces MFA status.
- **CI security scanners** (`.github/workflows/`): Gitleaks (secret scan), OSV-Scanner (dependency CVEs), CodeQL (JS/TS SAST) on push, PR, and weekly. `ci.yml` runs typecheck / lint / unit tests / build / `npm audit`.
- **RLS assertion script** (`supabase/tests/rls_assertions.sql`): a wrapped-in-ROLLBACK SQL that runs the RLS checklist against `anon` and `authenticated`; every regression raises.
- Docs: SECURITY.md gains a "Hardening applied" section; ROADMAP §8 items move to `[~]`; DAILY-LOG entry.
- Testing: `tsc --noEmit` clean; `npm run build` **43 routes**; `npm test` 33/33; `npm run lint` exit 0. Not deployed; migrations not applied; MFA/CSP tightening pending production verification.

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