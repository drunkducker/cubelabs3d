# Cube Labs 3D — Daily Check-In Log

Use this file for concise daily project check-ins. The newest entry goes first. Do not mark work complete without repository evidence.

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
