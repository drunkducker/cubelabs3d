# Cube Labs 3D Changelog

This file records meaningful product, architecture, security, database, deployment, and documentation changes. Small mechanical edits may remain in Git history.

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