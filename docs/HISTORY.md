# Cube Labs 3D Project History

**Consolidated:** 2026-07-27

This is the append-only evidence trail. It combines the former changelog,
daily log, dated handoffs, checkpoints, and deployment triggers. Do not read it
end-to-end for routine work: start with `CURRENT_STATUS.md`, then search this
file by date, feature, branch, PR, commit, or former source filename.

New meaningful work gets one evidence entry here containing date, branch,
commit or working-tree state, purpose, affected systems, tests, deployment,
known issues, migration impact, and rollback notes. Create no separate daily
log, changelog, checkpoint, transfer, or deploy-trigger Markdown file.

## 2026-07-28 — Reconcile the move-count-optimized Kilominx solver and actually wire it into the app

- **Author:** Claude, requested by the project owner.
- **Branch:** `claude/kilominx-solver-3d-page-wbyyay` — merged `origin/agent/optimize-kilominx-solver` (merge `b25f26f`, bringing commits `b9a238e` optimizer, `73d7a40`/`9ce2e8c`/`faf727d` CI) and then fixed the wiring.
- **Working-tree state:** on the feature branch; landing on `main` pending owner confirmation (see the note at the end).
- **Purpose:** bring the move-count-optimized Kilominx planner in and make the solver/play UI actually use it, so solutions (and the new 3D playback) are shorter.
- **What the optimize branch added:** `lib/kilominx-solver-optimized-impl.js` (a greedy max-corners-fixed 3-cycle permutation phase + boundary-cost-aware orientation, replacing the legacy target-by-target placement), `lib/kilominx-solver-optimized.ts` (typed `solve` wrapper), `lib/kilominx-engine-public.ts` (public app entrypoint: `export * from "./kilominx-engine"` plus the optimized `solve`), a regression + move-count test, and a CI workflow (`.github/workflows/ci.yml`, Node 24: docs:check → tsc → test → build). The engine itself (`lib/kilominx-engine.ts`) is unchanged and stays the source of truth for geometry, moves, validation, and verification.
- **Wiring bug found and fixed (ADR 0007):** the reconcile relied on a tsconfig path alias `@/lib/kilominx-engine` → `./lib/kilominx-engine-public.ts`. Next.js did **not** honor it because the mapping value carried a `.ts` extension, so the production bundle still contained the **legacy** solver (verified by grepping `.next/static`: legacy error strings present, optimized absent). Dropping the extension (`→ ./lib/kilominx-engine-public`) fixed resolution; the rebuilt bundle now contains the optimized solver's strings and tree-shakes the unused legacy `solve()`. Vitest resolves `@` to the repo root (its own alias, ignoring tsconfig paths), so unit tests still import the legacy `solve` via the relative path and the optimized `solve` explicitly — the comparison test stays valid.
- **Efficiency:** measured over a 60-scramble seeded corpus, optimized total **32752** vs legacy **40316** moves — **~18.8% fewer** (the optimize branch's own test asserts ≥15%). In-browser random scrambles now solve in ~530–710 moves (avg ~610) versus the legacy ~570–785. This is below the ~25% target; two safe further passes (a wider boundary-cost window; merging same-face turns across commuting antipodal turns) only reached ~19.3%, so they were dropped as not worth the added surface. Reaching ~25% needs a reduction-primitive rewrite, which was not attempted directly against production.
- **Affected systems:** the Kilominx `solve()` the app calls (solver page and play game, both resolving `@/lib/kilominx-engine` → public → optimized). No engine, route, schema, or config change beyond the tsconfig path value.
- **Tests:** `npm run docs:check` OK; `npx tsc --noEmit` exit 0; `npm test` **80/80** (adds the 3 optimized-solver tests); `npm run build` succeeds and the bundle grep confirms the optimized solver is the one shipped. Browser: verified solutions, correct 3D playback, no console errors.
- **Deployment:** none yet — landing on `main` awaits owner confirmation given the ~19% (vs 25%) result and that a direct-to-`main` push targets the Vercel production source.
- **Known issues:** ~19% not 25%; solver still not move-optimal; no real-device QA.
- **Migration impact:** none.
- **Rollback:** revert the merge and the tsconfig path value; the engine and all other puzzles are untouched.

## 2026-07-28 — Kilominx solver gains a dedicated 3D playback, collapsible moves, and swipe-to-turn

- **Author:** Claude, requested by the project owner.
- **Branch:** `claude/kilominx-solver-3d-page-wbyyay`, commits `1e6b2c5` (3D playback), `bf12187` (collapsible move list), `d09f969` (swipe-to-turn). Branch-only; not merged to `main`, no PR, not browser/mobile-verified on a real device.
- **Working-tree state:** pushed to `origin/claude/kilominx-solver-3d-page-wbyyay`.
- **Purpose:** close the follow-up recorded in ADR 0005 and the prior Kilominx history entry — the solver played its solution back on the flat pentagon net, not a 3D puzzle. Bring `/solver/kilominx` to the same layout the 4×4 solver uses (net + dedicated 3D solution playback), make the long (non-optimal) move list collapsible, and make the 3D cube swipe-to-turn like the play page.
- **Code change:**
  - `components/KilominxSolverCube3D.tsx` (new): a facelet-driven 3D dodecahedron playback component — the corners-only analogue of `components/NxNSolverCube3D.tsx`. Geometry starts solved and every kite sticker is coloured from the cube's actual facelet snapshot (`stateToFacelets`); solution moves (move indices) then physically spin the five corners of each turned face, so the faces resolve to solid colour as playback reaches the end. Move selection tracks a `logicalState` seeded at `solved()` and advanced with `applyMoveIndex`, so the 3D view and the flat net show the same state at every step. Single-step changes animate; slider jumps rebuild instantly. Reuses the play page's exact geometry and CCW kite ordering (`FACE_CORNERS_CCW`) so colouring is aligned by construction.
  - `components/KilominxSolver.tsx`: added the "KILOMINX SOLUTION PLAYBACK" section (mirrors `FourSolver`), animation-gated stepper controls, twist-paced autoplay (advances only after each on-cube turn settles), a collapsible verified-move list (clamped to two lines with a "Show all N"/"Collapse" toggle), and a "Lock rotation" toggle.
  - **Rotation lock + swipe-to-turn:** "Lock rotation" freezes only the camera (orbit + zoom); swipe-to-turn stays on, so a locked view can still be turned from a fixed angle (the Skewb's Rotate-View lock applied to a playback cube). Swiping a sticker turns that face; dragging empty space orbits unless locked. A manual swipe desyncs the cube from the solution step and sets a dirty flag; the next stepper/playback change rebuilds to that step exactly, so the verified solution and the flat net stay authoritative. Recorded as ADR 0006.
  - `app/solver/kilominx/page.tsx`: added the inline `UniversalPuzzleActions placement="inline" puzzleType="kilominx"` Save & Friend Play panel, closing a cookie-cutter gap — the 4×4/5×5/3×3/2×2 solver pages already mount the inline panel, while the Kilominx solver had only the global floating instance from `app/layout.tsx`.
- **Affected systems:** `/solver/kilominx` UI and its new 3D playback component only. No engine change (`lib/kilominx-engine.ts` untouched), no route change, no schema/config change. `app/KilominxGame.tsx` (the `/play/kilominx` game) is untouched.
- **Tests:** `npm run build` passes (`/solver/kilominx` static, the 3D component dynamically imported `ssr:false`); `npm test` **77/77** (engine unchanged); `npm run lint` exit 0 (pre-existing warnings only, none in the new/changed files); `tsc --noEmit` clean; `npm run docs:check` OK. Browser (Playwright, 460 px): scramble → solve → play advances the 3D cube in sync with the net; the lock toggle freezes the camera; a swipe turns a face both unlocked and locked (instrumented hit/turn counters confirmed); after a manual swipe desyncs the cube, scrubbing the progress slider to the end rebuilds to a fully solved cube (solid faces) — confirming both the resync and the end-to-end solve.
- **Deployment:** none — branch-only, no PR.
- **Known issues:** the solver is correct but not move-optimal (solutions can run 700+ moves; 785 and 569 observed in testing) — playback length is a pre-existing engine property, not addressed here. No real-device QA. `touch-action` stays `none` on the playback canvas so swipes register, so the page does not scroll over the cube on touch even when rotation is locked (same as the play pages).
- **Migration impact:** none.
- **Rollback:** delete the branch or revert its three commits; nothing shared depends on the new component and no engine file changed.

## 2026-07-27 — Kilominx manual-entry solver on a flat pentagon net

- **Author:** Claude, requested by the project owner.
- **Branch:** `claude/manual-solver-input-jja9t0`, commits `b4e5dae` (feature) and `515aef6` (docs); reconciled onto the moving `main` twice, then merged to `main` as `bbbb7b5`. This history entry replaces the earlier changelog/daily-log/ADR-file edits that pre-dated the documentation consolidation.
- **Working-tree state:** merged to `main` at `bbbb7b5` on 2026-07-27; not yet browser/mobile-verified.
- **Purpose:** give the Kilominx the same "Enter My Cube" manual solver the 3×3/4×4/5×5 already have, so a player can type in their own physical puzzle instead of only scrambling one on screen.
- **Code change:**
  - `lib/kilominx-engine.ts`: added a facelet (sticker-colour) representation — `FACE_CORNERS_CCW`, `stateToFacelets`, `faceletsToState`, `permutationParity`, `isSolvableKiloState`, `FACELET_COUNT` — all derived from the existing dodecahedron geometry. Reconstruction matches each corner's colour triple to a piece+twist and rejects impossible cubes (odd permutation or twist-sum ≢ 0 mod 3) before `solve()` runs.
  - `lib/kilominx-net-layout.ts` (new): the standard two-flower net, each petal unfolded about its shared edge from the real geometry; every one of the 60 kites tagged `(face, kite, corner-slot)`.
  - `components/KilominxSolver.tsx` (new): scramble + manual modes, a 60-sticker paint net, verified solution with a move stepper, and net-based step playback. A Kilominx has no fixed centres, so entry is relative to the standard colour scheme — each face shows a numbered reference-colour anchor.
  - Route split (ADR 0005): `/solver/kilominx` now renders the solver; the playable 3D game moved verbatim to the new `/play/kilominx` (`app/KilominxGame.tsx` unchanged). `/solve` copy updated. Challenge routing already pointed at `/solver/kilominx` and stays consistent.
- **Reconciliation note:** `main` advanced 27 commits during the session (Skewb, learn-model engine, watchable Kilominx solve, and the documentation consolidation). The merge took `main`'s improved `app/KilominxGame.tsx` (so `/play/kilominx` inherits the watchable solve) and `main`'s Skewb `/solve` entry; the branch's original `docs/CHANGELOG.md`, `docs/DAILY-LOG.md`, and `docs/decisions/0004-*.md` edits were dropped in favour of this entry and ADR 0005 under the new 13-file structure.
- **Affected systems:** Kilominx engine, new net-layout module and solver component, `/solver/kilominx` and `/play/kilominx` routes, `/solve` hub copy.
- **Tests:** `npm run build` passes (adds `/play/kilominx`); `npm test` **77/77** after the second reconcile (adds 8 Kilominx facelet tests: 100-scramble state↔facelet round-trip, legality rejection, reconstruct-then-solve); `npm run docs:check` OK; `npm run lint` exit 0 (pre-existing warnings only).
- **Deployment:** merged to `main` (the Vercel production source) at `bbbb7b5`; hosted/mobile verification still open.
- **Known issues:** no mobile/browser verification; manual entry assumes the standard colour scheme (documented in-UI, since a Kilominx has no fixed centres); solution playback is on the flat net rather than a dedicated 3D view (a `KilominxSolverCube3D` extraction is a possible follow-up).
- **Migration impact:** none (no schema or configuration change).
- **Rollback:** revert commits on the branch, or simply do not merge it; no changes to shared engine files that other puzzles depend on.

## 2026-07-27 — Reconcile Skewb branch and documentation into `main`

- **Author:** Claude, requested by the project owner.
- **Branch:** integrated on `integration/skewb-docs`, merged to `main` as `4123239`.
- **Parents:** `f97ddd8` (prior `main`) and `453f039` (PR #9 `feature/skewb-puzzle` head), so both histories are preserved.
- **Purpose:** bring the Skewb puzzle (draft PR #9) onto `main` and unify the two competing documentation states into one canonical set without losing context.
- **Code change:** merged PR #9's Skewb engine/renderer/route, shared attempt contract, and extended Save & Friend Play panel. Because `main` added no application code after PR #9's base (`c5f7b58`), the feature applied without code conflicts.
- **Documentation reconciliation:** adopted PR #9's 13-file routed structure. Preserved the three 2026-07-27 engineering documents that PR #9 predated by folding them into their owning canonical files as source-labeled sections — `SOFTWARE-ENGINEERING-BEST-PRACTICES.md` and the expanded `CODING-STANDARDS.md` into `GOVERNANCE.md`, and the `DEPENDENCY-GRAPHS.md` handbook into `ARCHITECTURE.md`. Links inside the folded snapshots were flattened to plain text. The retired-source count enforced by `docs:check` rose from 35 to 37.
- **Superseded:** the earlier accuracy-only stewardship commit `ff3babe` on `claude/cubelabs3d-architecture-4444ve`; its corrections are subsumed by PR #9's structure plus this reconciliation, so that branch was not merged.
- **Verification:** `npm run docs:check` OK (13 routed files, 37 source sections, no broken links); `tsc --noEmit` clean; `npm test` all passing; `npm run lint` exit 0 (existing warnings only); `npm run build` succeeds with `/solver/skewb` prerendered.
- **Deployment:** merged to `main`, which is the Vercel production source; hosted/mobile Skewb verification and the standing Supabase migration/configuration/RLS gates remain open.
- **Known issue / rollback:** to roll back, revert the merge commit `4123239` on `main`; all retired sources remain recoverable from Git history.

## 2026-07-27 — Consolidate the documentation system

- **Author:** Codex, requested by the project owner.
- **Branch:** `feature/skewb-puzzle`.
- **Starting local head:** `2c6a6be` (`docs: reconcile project notes after
  skewb`).
- **Working-tree state:** consolidation prepared locally; not pushed or
  deployed at the time of this entry.
- **Purpose:** reduce routine context load without discarding project history
  or stable task/decision identifiers.
- **Documentation change:** reduced 45 project-owned Markdown files to 13
  routed files. Thirty-five retired files are retained under source-labeled
  sections in their canonical destinations. Exact pre-consolidation files
  remain recoverable from Git.
- **Routing change:** `docs/README.md` now requires governance, current status,
  and one task-specific reference. `HISTORY.md` is searched only when earlier
  evidence is needed.
- **Workflow change:** one history entry replaces separate changelog, daily
  log, checkpoint, transfer, deploy-trigger, and continuation-prompt files.
  ADR 0004 records the structural decision.
- **Code/reference change:** comments and admin status text now point to the
  consolidated engine, architecture, and history documents.
- **Enforcement:** `npm run docs:check` verifies the 13-file routed set, 35
  paired source markers, and all local Markdown links.
- **Verification:** documentation check passed; 64/64 Vitest tests passed;
  standalone TypeScript passed after the completed Next.js build; lint passed
  with the repository's existing warnings only; production build passed; and
  `git diff --check` passed.
- **Known issue:** the consolidated reference and history files are longer.
  Contributors should follow the routing index and search by subject, date,
  branch, PR, commit, or former source filename instead of reading all files.
- **Migration impact:** none.
- **Deployment:** none; documentation and local reference-text changes only.
- **Rollback:** revert the consolidation commit. Git retains every retired
  file at `2c6a6be`.

---

## Former changelog

> Consolidated from `docs/CHANGELOG.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/CHANGELOG.md -->
# Cube Labs 3D Changelog

This file records meaningful product, architecture, security, database, deployment, and documentation changes. Small mechanical edits may remain in Git history.

## 2026-07-27 — Rebuild Skewb interaction and add verified result sending

- Author: OpenAI Codex working with the project owner.
- Branch and review: `feature/skewb-puzzle`, draft PR #9.
- Commits: local verified commit `15faac9`; published GitHub head `c3b5502`.
  The PR records that the published Git tree exactly matches the local verified
  tree even though the connector assigned a different commit SHA.
- Purpose: make Skewb look, move, solve, save, and send like the established
  3×3, 4×4, and Kilominx experiences instead of a separate sticker demo.
- Replaced the stationary box/decal presentation with fourteen rigid moving
  bodies: eight corners and six centers. Every legal turn moves four corners
  and three centers with their black plastic borders.
- Replaced the four-fixed-half gesture model with all eight physical corner
  pivots. Any colored corner or center sticker can start a turn, and the
  selected seven-piece layer follows the pointer before completing or
  canceling the 120° motion.
- Added explicit Turn Pieces and Rotate View modes and changed normal manual
  pace from 280 ms to the shared 460 ms Cube Labs feel.
- Added a real Three.js transform regression that runs the tutorial sequence
  `R' F R F'` twice and checks stable seven-piece membership after every move.
- Kept the exact state-based solver and marked Auto-solve attempts assisted so
  they cannot be recorded as legitimate results.
- Added `lib/puzzle-attempt.ts` and action-contract tests. The inline actions
  now visibly expose Save Start, Share Link, Save Result, and Send to Friend.
  Completed manual solves include elapsed time, move count, undo/touch/button
  metrics, and move history; sent friend challenges attach the saved sender
  result. Unsolved exact starts remain sendable.
- Verification: 64/64 Vitest tests across nine files; `tsc --noEmit` clean;
  lint exits 0 with existing unrelated warnings only; production build passes
  and prerenders `/solver/skewb`.
- Deployment: GitHub/Vercel preview status is successful for `c3b5502`. The PR
  remains draft and unmerged; production `main` remains `c5f7b58`.
- Known issues/gates: hosted real-phone turn direction and orientation,
  native share/clipboard behavior, signed-in memory/result saving, and a
  two-account friend challenge are not yet recorded.
- Migration impact: none.
- Rollback: revert PR #9's Skewb renderer/engine/action/test commits; no schema
  rollback is needed.

## 2026-07-27 — Reconcile the complete Markdown documentation set

- Author: OpenAI Codex working with the project owner.
- Branch: `feature/skewb-puzzle`; this documentation follow-up is committed
  locally and remains unpublished until explicitly pushed.
- Purpose: repair the documentation gap left by the Skewb implementation and
  make future sessions read current notes before coding.
- Read all 44 pre-existing tracked `.md` files, including root README/handoffs,
  permanent docs, ADRs, dated checkpoints, and deploy-trigger records.
- Updated current README, engine/perspective notes, documentation workflow,
  architecture, status, health, roadmap/checklist, social, admin, and change-log
  records; added a dedicated Skewb PR #9 checkpoint.
- Preserved dated checkpoints, deploy triggers, and accepted ADR history rather
  than rewriting them as current truth. Added historical/supersession notices
  where a root handoff could misdirect a new session.
- Verification source: GitHub reports PR #9 open/draft/mergeable at `c3b5502`,
  nine commits ahead and zero behind `main`; Vercel status is successful.
- Runtime/deployment impact: documentation only; no application or migration
  change.
- Rollback: revert only the documentation reconciliation commit after it
  exists; doing so would restore known stale/conflicting notes and is not
  recommended.

## 2026-07-26 — Make Skewb playable, state-solvable, and shareable

- Author: OpenAI Codex working with the project owner.
- Branch: `feature/skewb-puzzle`.
- Purpose: finish the interaction, solver, and save/share gaps left after the first Skewb renderer and state-engine repair.
- Added sticker raycasting and screen-space swipe resolution to `app/SkewbGame.tsx`; corner-sticker drags now select a legal `U/R/L/B` axis and direction, highlight the moving layer, and execute the same verified engine move used by buttons.
- Replaced history reversal with a renderer-independent bidirectional state search in `lib/skewb-engine.ts`. It solves the actual current state, prunes redundant same-axis turns, and verifies every returned sequence against the engine before playback.
- Added an explicit solver panel and solution notation to `/solver/skewb`; manual corner buttons remain available in a collapsed fallback section.
- Embedded Save & Share inside the Skewb page and suppressed its old floating duplicate. Load, Save, and Share are now separate actions; Share uses the device share sheet when available and otherwise copies a playable scramble URL.
- Added query-load timing protection so shared and saved scrambles reach the Skewb listener after hydration.
- Verification: 55/55 tests pass, including arbitrary-state and varied long-scramble solver coverage; TypeScript is clean; lint exits 0 with pre-existing warnings only; production build succeeds and prerenders `/solver/skewb`.
- Deployment status: feature branch update pending hosted preview/browser verification and merge.
- Rollback: revert this entry's Skewb game, engine, shared actions, tests, and solver metadata changes; no migration or provider change is involved.

## 2026-07-26 — Repair Skewb engine and shared puzzle actions

- Author: OpenAI Codex working with the project owner.
- Branch: `feature/skewb-puzzle`.
- Purpose: replace the isolated, history-based Skewb behavior with a renderer-independent state engine and connect Skewb to the existing Save & Friend Play system.
- Added `lib/skewb-engine.ts`: exact discrete 120° body-diagonal transforms for eight corners and six centers, canonical `U/R/L/B` parsing, random scrambles, inverse sequences, and solved-state checks.
- Updated `app/SkewbGame.tsx`: Three.js now renders the engine state; scramble resets before applying a new sequence; scramble moves no longer count as player moves; undo, reset, reverse solve, timer, and shared saved/challenge scramble loading use one state model.
- Updated `components/UniversalPuzzleActions.tsx`: registered `/solver/skewb`, automatically dispatches URL-provided scrambles to native engines, and centers the fixed panel within the 460px application shell instead of the browser's right edge.
- Added `tests/skewb-engine.test.ts` with move-order, inverse, parser, deterministic-state, and random scramble round-trip coverage.
- Verification: `npm test` passes 52/52; `npx tsc --noEmit` is clean; `npm run lint` exits 0 with pre-existing warnings only; `npm run build` succeeds and prerenders `/solver/skewb`.
- Deployment status: coded and verified locally on the feature branch; not merged, deployed, or browser/mobile verified.
- Known issue: pointer/swipe-to-turn is not implemented for Skewb; turns use the existing buttons while drag rotates the camera.
- Rollback: revert the Skewb game/engine/tests and restore the shared action route/position changes; no database migration is involved.

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
<!-- END CONSOLIDATED SOURCE: docs/CHANGELOG.md -->

---

## Former daily check-in log

> Consolidated from `docs/DAILY-LOG.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/DAILY-LOG.md -->
# Cube Labs 3D — Daily Check-In Log

Use this file for concise daily project check-ins. The newest entry goes first. Do not mark work complete without repository evidence.

## 2026-07-27 — Final Skewb PR #9 state and full documentation audit

**Checked**

- [x] Read all 44 pre-existing tracked Markdown files, including root notes,
      permanent docs, ADRs, checkpoints, and deploy triggers.
- [x] Verified canonical GitHub `main` head `c5f7b58`.
- [x] Verified draft PR #9 is open and mergeable at remote head `c3b5502`,
      nine commits ahead and zero behind `main`.
- [x] Confirmed the PR records that remote `c3b5502` has the same Git tree as
      local verified commit `15faac9`.
- [x] Verified Vercel reports success for `c3b5502`.
- [x] Compared Skewb behavior and test coverage with 3×3, 4×4, and Kilominx
      save/send expectations.

**Completed**

- [x] Rebuilt the Skewb renderer around eight corner bodies and six center
      bodies; each turn moves four corners and three centers.
- [x] Exposed all eight physical corner pivots so layer selection remains stable
      after repeated move sequences.
- [x] Added continuous selected-layer drag, explicit Turn Pieces/Rotate View
      modes, and the shared 460 ms normal pace.
- [x] Added a renderer-transform regression using `R' F R F'` twice.
- [x] Added completed-attempt tracking for time, moves, undo, touch/button
      counts, move history, and solver assistance.
- [x] Added visible Save Start, Share Link, Save Result, and Send to Friend
      actions; completed friend challenges attach the saved sender result.
- [x] Blocked auto-solved attempts from legitimate result saving while
      preserving exact unsolved-start sending.
- [x] Reconciled current README, engine/perspective notes, status, health,
      roadmap, master checklist, social/admin references, change log, and
      documentation workflow.
- [x] Added `checkpoints/2026-07-27-skewb-pr9.md`.

**Verified**

- `npm test` → 9 files and 64 tests passed for local `15faac9`.
- `npx tsc --noEmit` → clean.
- `npm run lint` → exit 0; existing unrelated warnings only.
- `npm run build` → successful; `/solver/skewb` prerendered.
- GitHub/Vercel status for published `c3b5502` → success.

**Blocked or unverified**

- [ ] Real-phone repeated turn direction, device orientation, Rotate View, and
      final drag feel.
- [ ] Native share-sheet and clipboard fallback.
- [ ] Signed-in Save Start and Save Result against production data.
- [ ] Two-account Send/Open/Submit and Supabase row/RLS verification.
- [ ] Owner approval and merge of draft PR #9 into production `main`.
- [ ] This documentation reconciliation is committed locally but not published.

**Next priorities**

1. Run the hosted phone and two-account checks above.
2. Fix any evidence-backed regression without changing the approved shared
   interaction contract.
3. Merge PR #9 only after owner approval.
4. Immediately replace branch-only notes with the merge commit and production
   deployment evidence.

**Commits / deployments / rollback notes**

- Local implementation commit: `15faac9`.
- Published implementation head: `c3b5502` (same verified tree).
- Documentation commit: this documentation-only follow-up; record its remote
  SHA after publishing.
- Deployment: successful Vercel preview; not production.
- Migration: none.
- Rollback: revert the PR #9 Skewb changes or the future documentation commit
  independently.

---

## 2026-07-26 — Skewb swipe, verified solver, and inline share

**Completed**

- [x] Added raycasted corner-sticker swipes with layer preview and 120° turns.
- [x] Added a state-based bidirectional Skewb solver that verifies its own output.
- [x] Added visible solver status and solution notation to `/solver/skewb`.
- [x] Moved Skewb Save & Share into the page and removed its floating duplicate.
- [x] Split the ambiguous Load / copy action into Load, Save, and Share.
- [x] Added native share-sheet support with a copied playable-link fallback.
- [x] Added arbitrary-state and varied long-scramble solver regression tests.

**Verified**

- `npm test` → 7 files and 55 tests passed.
- `npx tsc --noEmit` → clean.
- `npm run lint` → exit 0; only pre-existing warnings.
- `npm run build` → successful; `/solver/skewb` prerendered.

**Unverified**

- [ ] Hosted mobile/desktop pointer interaction and native share-sheet behavior.
- [ ] Signed-in memory save and two-account friend challenge.
- [ ] Feature branch merge to production `main`.

**Branch / rollback**

- Branch: `feature/skewb-puzzle`.
- No migration or provider change.
- Rollback by reverting the Skewb interaction/solver/share follow-up files.

---

## 2026-07-26 — Skewb engine and Save/Friend repair

**Completed**

- [x] Added a renderer-independent Skewb state engine with exact 120° corner-axis moves.
- [x] Rewired scramble, solved detection, undo, reset, reverse solve, move count, and timer to the logical engine.
- [x] Added native loading for saved and challenge Skewb scrambles.
- [x] Registered `/solver/skewb` in the shared Save & Friend Play system.
- [x] Centered the shared fixed action panel inside the Cube Labs application shell.
- [x] Added six Skewb engine regression tests.

**Verified**

- `npm test` → 7 files and 52 tests passed.
- `npx tsc --noEmit` → clean.
- `npm run lint` → exit 0; only pre-existing warnings.
- `npm run build` → successful; `/solver/skewb` prerendered.

**Unverified**

- [ ] Feature branch is not merged or deployed.
- [ ] Real mobile and desktop browser interaction, saved-memory account flow, and two-account friend challenge remain to be tested.
- [ ] Skewb currently uses buttons for turns; touch drag rotates the camera and sticker swipe turns are future work.

**Branch / rollback**

- Branch: `feature/skewb-puzzle`.
- No migration or provider change.
- Rollback by reverting the Skewb engine/game/tests and shared action registration/position changes.

---

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
<!-- END CONSOLIDATED SOURCE: docs/DAILY-LOG.md -->

---

## Leaderboard transfer handoff

> Consolidated from `LEADERBOARD_TRANSFER_2026-07-22.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: LEADERBOARD_TRANSFER_2026-07-22.md -->
# Cube Labs 3D Leaderboard Transfer Handoff

> **Historical handoff, reviewed 2026-07-27.** This preserves the state of the
> July 22 leaderboard prototype. Several routes and shared challenge systems
> described as future work were implemented later. Current truth lives in
> [`docs/CURRENT_STATUS.md`](./CURRENT_STATUS.md),
> [`docs/SOCIAL-AND-MULTIPLAYER.md`](./SOCIAL-AND-MULTIPLAYER.md), and
> [`docs/ROADMAP.md`](./ROADMAP.md).

Generated: 2026-07-22 20:09 EDT
Repository: `drunkducker/cubelabs3d`
Working branch: `claude/home-page-html-rebuild-q7qomi`

## Purpose

This handoff explains the mobile-first leaderboard prototype work so another AI
or developer can continue without re-reading the full chat.

The owner wanted the leaderboard reference screen attached to the current
deployed preview branch, then reachable from the homepage Daily Challenge.

## Branch And Commit State

Current remote branch head after the homepage wiring:

`6f4e86a8417ede68367bdbf95b4f5ffbdea70d81`

Relevant commits:

- `6f4e86a` - `Wire daily challenge to leaderboard`
- `39b3433` - `Add mobile leaderboard prototype`
- `388fa85` - `Wire Learn page into the app at /learn`

The original shell `git push` failed because the container did not have GitHub
HTTPS credentials. The branch was published through the connected GitHub app
using GitHub blob/tree/commit/ref APIs.

## What Was Built

### New route

`/leaderboard`

Primary file:

- `app/leaderboard/page.tsx`

This page is a mobile-first visual prototype based on the provided reference:

- Cube Lab 3D app-style header
- trophy/cube hero panel
- puzzle tabs for `3x3`, `2x2`, `4x4`, `5x5`, `6x6`, `7x7`, and `NxN`
- global/friends/country/month/all-time filter row
- top-three podium
- ranked list with "You" row
- user stats strip
- "Start Solving" CTA
- bottom app navigation

### Shared navigation component

Added:

- `components/AppBottomNav.tsx`

This is intended to become the shared bottom navigation for Next app routes.
Right now it is used by the leaderboard page. The embedded static Learn page
still has its own built-in nav from the HTML prototype.

### Preview data module

Added:

- `lib/leaderboard-preview.ts`

This keeps fake ranking data out of the page component and marks preview rows
with `isPreviewData: true`.

Important: this is not the final leaderboard service. Production needs a real
application service such as `getLeaderboard()` that filters test data and reads
verified solve results/ranking snapshots.

### Homepage attachment

Changed:

- `components/EcosystemSections.tsx`

The homepage Daily Challenge "View Leaderboard" control was changed from a
look-only button to a real Next `Link`:

```tsx
<Link href="/leaderboard" className="text-xs font-semibold text-yellow-300">
  View Leaderboard >
</Link>
```

So the user path is now:

Homepage -> Daily Challenge -> View Leaderboard -> `/leaderboard`

## Documentation Updated

Updated files:

- `docs/CHANGELOG.md`
- `docs/CURRENT_STATUS.md`
- `docs/DAILY-LOG.md`
- `docs/PROJECT-HEALTH.md`
- `docs/ROADMAP.md`
- `docs/SOCIAL-AND-MULTIPLAYER.md`

The docs classify the leaderboard as a visual prototype only. They do not mark
production leaderboards complete.

## Verification

Build command used:

```bash
HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build
```

Result:

- Build passed.
- Next generated 26 app routes.
- `/leaderboard` appears in the route list.

Live Vercel status was not confirmed from the shell. After Vercel finishes the
deployment for branch `claude/home-page-html-rebuild-q7qomi`, open the homepage
preview and tap Daily Challenge -> View Leaderboard.

Direct route pattern:

```text
<latest Vercel preview URL for claude/home-page-html-rebuild-q7qomi>/leaderboard
```

Likely preview URL pattern:

```text
https://cubelabs3d-git-claude-home-page-html-rebuild-q7qomi-agents-of-chaos.vercel.app/leaderboard
```

## Important Project Rules From Docs

Before continuing leaderboard work, read:

1. `docs/README.md`
2. `docs/CONSTITUTION.md`
3. `docs/ARCHITECTURE.md`
4. `docs/AI-INSTRUCTIONS.md`
5. `docs/SOCIAL-AND-MULTIPLAYER.md`
6. recent entries in `docs/CHANGELOG.md`

Rules that matter most here:

- Mobile first.
- Do not redesign the approved homepage unless explicitly asked.
- Do not hard-code production leaderboard results.
- Test/admin-generated records must be marked as test data and excluded from
  public rankings by default.
- Visual pages should use Cube Labs application services, not direct Supabase
  calls.
- Production leaderboards need server-side validation and auditability.
- Meaningful code changes require docs and changelog updates.

## Current Limitations

This work is not a production leaderboard yet.

Still preview-only:

- leaderboard rows
- podium players
- user rank/stats
- notification count
- search/menu controls
- Daily Challenge scramble/time numbers

Still look-only or incomplete:

- "Start Challenge" button on the homepage Daily Challenge
- friends/country/month/all-time filters
- puzzle tab switching
- player detail links under `/leaderboard/player/...`
- real solve ranking data
- suspicious-result detection
- admin leaderboard moderation
- real mobile browser QA record

## Next Recommended Steps

1. Confirm the Vercel deployment for commit `6f4e86a` is Ready.
2. Open the preview on mobile and verify:
   - homepage Daily Challenge link works;
   - `/leaderboard` renders without clipping;
   - horizontal cube tabs and stats strip scroll correctly;
   - bottom nav does not cover content.
3. If the owner approves the visual direction, build the real data layer:
   - `getLeaderboard()`;
   - ranking snapshots or solve-result aggregation;
   - assisted/unassisted categories;
   - daily/monthly/all-time filters;
   - test-data exclusion.
4. Add admin moderation before trusting public rankings:
   - impossible-time flags;
   - entry review/removal;
   - audit logs;
   - test-user exclusion.
5. Consider making `AppBottomNav` shared across additional Next routes after
   checking each page layout.

## Safe Continuation Prompt

Use this prompt for another AI/developer:

```text
Continue Cube Labs 3D from branch claude/home-page-html-rebuild-q7qomi.
Read docs/README.md, docs/CONSTITUTION.md, docs/ARCHITECTURE.md,
docs/AI-INSTRUCTIONS.md, and docs/SOCIAL-AND-MULTIPLAYER.md first.

The mobile leaderboard visual prototype is at app/leaderboard/page.tsx.
Preview/test leaderboard data is isolated in lib/leaderboard-preview.ts.
The homepage Daily Challenge "View Leaderboard" link is wired in
components/EcosystemSections.tsx.

Latest implementation commit before this handoff:
6f4e86a8417ede68367bdbf95b4f5ffbdea70d81.

Do not mark production leaderboards complete. Replace preview data with a
provider-isolated getLeaderboard() service, exclude test data, separate assisted
and unassisted solves, add server-side validation, and update the docs/changelog
for any meaningful change.
```
<!-- END CONSOLIDATED SOURCE: LEADERBOARD_TRANSFER_2026-07-22.md -->

---

## Former checkpoint index and archive rules

> Consolidated from `docs/checkpoints/README.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/README.md -->
# Historical Checkpoints

This directory is for dated project snapshots and handoff records.

Checkpoint files preserve what was believed, planned, or completed at a particular time. They are historical evidence, not the current source of truth. Current status belongs in [`../CURRENT_STATUS.md`](./CURRENT_STATUS.md), and the active checklist belongs in [`../ROADMAP.md`](./ROADMAP.md).

## Known historical records to preserve

- `2026-07-27-skewb-pr9.md` — current branch handoff for draft PR #9: exact
  local/remote commits, fourteen-piece renderer, stable eight-pivot gestures,
  verified state solver, result save/send contract, 64-test evidence, Vercel
  status, and pre-merge hosted checks.
- `2026-07-23-news-arcade-home-links.md` — homepage-linked News, My Arcade, and Learn route pass with remaining content/admin wiring.
- `2026-07-22-3x3-scrambles-solver-memory-handoff.md` — current handoff for tracked 3x3 play, chosen scrambles, Supabase scramble ranking, solver memory, and remaining verification work.
- `2026-07-22-mobile-profile-layout.md` — profile dashboard layout branch checkpoint, approved-layout wiring pass, connected profile subroutes, and remaining production QA items.
- `2026-07-22-social-discovery-privacy.md` — profile social discovery, public player profiles, friend actions, challenge prefill, and export/close-account queue handoff.
- `2026-07-22-site-health-context-rot-review.md` — health review documenting clickable route gaps, preview-data risks, Supabase proof steps, context-rot reductions, and the highest-value next fixes.
- `2026-07-22-tracked-3x3-challenge-next-steps.md` — tracked 3x3 leaderboard challenge prototype handoff and production gap list.
- `cubelabs3d-project-status.md` — July 20, 2026 early project and business checkpoint; now substantially outdated.
- `PROJECT_STATUS_2026-07-21_0246.md` — July 21, 2026 at 02:46 checkpoint.
- `CURRENT-SITE-STATE-2026-07-22.md` — July 22, 2026 branch, auth, and production-baseline checkpoint.

When these files are added to the repository, place copies in this directory using clear dated names, for example:

- `2026-07-20-project-status.md`
- `2026-07-21-0246-project-status.md`
- `2026-07-22-0131-current-site-state.md`

## Archive rules

1. Never silently delete historical checkpoints that contain unique decisions, fixes, branch details, or lessons learned.
2. Fold lasting rules and current facts into permanent documents.
3. Mark superseded information clearly.
4. Do not use a checkpoint to override `CURRENT_STATUS.md`, `ROADMAP.md`, architecture documents, ADRs, or the changelog.
5. New daily work belongs in `DAILY-LOG.md`; create a separate checkpoint only for a meaningful release, handoff, migration, or recovery point.
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/README.md -->

---

## Checkpoint — 2026-07-27 Skewb PR #9

> Consolidated from `docs/checkpoints/2026-07-27-skewb-pr9.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-27-skewb-pr9.md -->
# Skewb PR #9 Handoff — 2026-07-27

## Scope and status

- Repository: `drunkducker/cubelabs3d`
- Canonical production branch: `main`
- Canonical head at handoff: `c5f7b58845079a942b4385a1af479476bb2ffbb1`
- Review branch: `feature/skewb-puzzle`
- Pull request: [#9](https://github.com/drunkducker/cubelabs3d/pull/9)
- PR state: open, draft, mergeable
- PR head: `c3b5502b105aa29e74cea56231eb0f64f635b983`
- Local verified equivalent: `15faac9e09ffcbcc74ca5d16bb8b06dac3c98eb0`
- Relationship: the publishing connector recreated the local commit; the PR
  records that the remote and local Git trees are identical
- Compare state: nine commits ahead of `main`, zero behind
- Hosted status: Vercel success
- Production status: not merged and not on production `main`

This checkpoint supersedes the intermediate Skewb details in the July 26 daily
log for current handoff purposes. Those entries remain valid historical records
of earlier 52-, 55-, 56-, and 59-test stages.

## Final review implementation

### State and solver

- `lib/skewb-engine.ts` owns exact renderer-independent corner and center
  transforms, notation, parsing, inverses, scrambles, solved detection, and
  bidirectional state search.
- Solve starts from the actual current state, not only the move history.
- Every generated solution is verified before playback.
- Auto-solve marks the attempt assisted and blocks legitimate result saving.

### Renderer and movement

- `app/SkewbGame.tsx` renders fourteen rigid bodies: eight corners and six
  centers.
- Every legal 120° turn moves seven bodies: four corners and three centers.
- Black plastic borders travel with the selected pieces.
- All eight physical corner pivots are selectable after arbitrary sequences.
  This fixes the four-fixed-half model that became inconsistent after roughly
  three moves.
- Any colored corner or center sticker can begin a layer gesture.
- The selected layer follows the pointer continuously before release.
- Turn Pieces and Rotate View are separate modes.
- Normal manual turns use the shared Cube Labs 460 ms pace.
- WebGL initialization failure leaves controls/save/send messaging available
  instead of crashing the entire route.

### Save, share, results, and friends

The inline `UniversalPuzzleActions` instance receives native Skewb state and a
`PuzzleAttemptSnapshot`.

Visible actions:

- **Save Start** — persist the exact starting scramble in solver memory.
- **Share Link** — open the native share sheet or copy the playable link.
- **Save Result** — save a completed, unassisted timed attempt.
- **Send to Friend** — send the exact start and attach a saved sender result
  when the puzzle has been completed.

Tracked completed-attempt data:

- elapsed milliseconds;
- player move count;
- undo count;
- touch move count;
- button move count;
- move history;
- assistance flags.

Unsolved exact starts remain sendable. Changing the current scramble invalidates
the prior completed-result fingerprint so stale results are not attached.

## Verification evidence

- `npm test` — 9 files, 64 tests passed.
- `npx tsc --noEmit` — clean.
- `npm run lint` — exit 0 with existing unrelated warnings only.
- `npm run build` — successful; `/solver/skewb` prerendered.
- `tests/skewb-engine.test.ts` — move/state/parser/solver invariants.
- `tests/skewb-renderer.test.ts` — geometry and accumulated Three.js transform
  checks, including `R' F R F'` twice.
- `tests/puzzle-attempt.test.ts` — completed-result envelope, metric history,
  friend-result attachment, unsolved start sending, and auto-solve blocking.
- GitHub combined status for `c3b5502` — Vercel success.

## Required hosted checks before merge

1. On a real phone, run more than ten mixed layer turns and confirm selection
   never changes unexpectedly after the third or fourth move.
2. Rotate the device and repeat turns in both orientations.
3. Verify Turn Pieces and Rotate View do not compete.
4. Confirm the 460 ms pace and direct layer preview feel consistent with 3×3,
   4×4, and Kilominx.
5. Exercise native share and clipboard fallback.
6. Sign in and verify Save Start and Save Result.
7. Use two accounts to send, open, play, and submit a Skewb challenge.
8. Confirm expected rows and ownership/RLS behavior in `solver_memories`,
   `scrambles`, `solve_results`, `scramble_attempts`, `challenges`, and
   `challenge_attempts`.
9. Confirm auto-solved attempts remain ineligible for legitimate result saving.
10. Obtain owner approval, merge PR #9, verify the production deployment, and
    update every branch-only status reference with the merge commit.

## Known limitations

- Preview-build success is not real-phone gesture proof.
- Unit tests do not prove native share availability or clipboard permission.
- Payload tests do not prove production Supabase migration/RLS configuration.
- The PR is draft and must not be described as shipped.

## Rollback

No migration was added. Revert PR #9's Skewb renderer, engine, shared attempt
contract, action UI, and tests. `main` remains unchanged until the PR is merged.
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-27-skewb-pr9.md -->

---

## Checkpoint — 2026-07-26 all-puzzle memory and friend play

> Consolidated from `docs/checkpoints/2026-07-26-all-puzzle-memory-friend-play.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-26-all-puzzle-memory-friend-play.md -->
# All-Puzzle Memory and Friend Play Rollout

**Date:** 2026-07-26
**Repository:** `drunkducker/cubelabs3d`
**Branch merged:** `gpt/all-puzzle-memory-friend-play-20260726`
**PR:** #6
**Merge commit:** `7ce293b2cf81c2c4fd730c2adb527178ab48a2de`

## What changed

Cube Labs now exposes a shared **Save & Friend Play** panel across supported puzzle and solver routes:

- 3×3
- 4×4
- 5×5
- supported NxN routes
- Pyraminx
- Kilominx

The panel:

- detects the current puzzle type from the route;
- reads the visible scramble where available;
- accepts a manually entered start state when a puzzle does not expose one in the page markup;
- saves signed-in puzzle memory through `/api/solver-memory`;
- lists prior puzzle memories for the active `puzzle_type`;
- sends the exact puzzle type and scramble to a friend through `/api/challenges`;
- gives signed-out visitors a clear sign-in path;
- copies and dispatches the selected scramble using the shared `cube-labs:load-scramble` browser event;
- supports generic challenge-attempt submission for non-3×3 puzzle routes.

`/challenge/[id]` is now puzzle-aware. The existing embedded tracked 3×3 runner remains in place. Other puzzle types open their matching solver route with the private challenge ID and exact official scramble carried in the query string.

## Verification

- GitHub PR #6 was mergeable.
- Vercel preview build for branch head `3ba5149` completed successfully.
- No production browser/two-account verification was performed in this session.

## Remaining verification and hardening

- Test save/list/load for every puzzle while signed in.
- Test guest sign-in prompts.
- Run two-account send/open/submit flows for every puzzle type.
- Confirm database rows in `solver_memories`, `scrambles`, `challenges`, `solve_results`, `scramble_attempts`, and `challenge_attempts`.
- Add engine-native listeners for `cube-labs:load-scramble` anywhere automatic replay is not yet supported. Until then, the shared panel copies and visibly preserves the exact scramble so it can be applied manually.
- Add puzzle-specific notation validators before treating arbitrary user-entered notation as fully trusted.

## Rollback

Revert merge commit `7ce293b2cf81c2c4fd730c2adb527178ab48a2de`. The change adds UI and routing only; it does not add or remove database tables.
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-26-all-puzzle-memory-friend-play.md -->

---

## Checkpoint — 2026-07-26 Kilominx merge

> Consolidated from `docs/checkpoints/2026-07-26-kilominx-merge.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-26-kilominx-merge.md -->
# Kilominx Merge Checkpoint — 2026-07-26

## Summary

The RootA branch `claude/puzzle-gen-twisting-69clo3` was reviewed against `main`, opened as PR #4, and merged into the canonical branch.

- Feature head: `8e45978c73b9bc7294592ab59a50e864c0f4e195`
- Merge commit: `51950a047bb363a1e922fb099d869ea923205da4`
- Pull request: #4 — Merge Kilominx puzzle and saved scrambles

## Added to `main`

- `app/KilominxGame.tsx` — interactive Three.js Kilominx with swipe turns, face buttons, scramble, timer, undo, reset, and animated solver playback.
- `lib/kilominx-engine.ts` — dodecahedron-derived geometry, move tables, state representation, parser, random scrambles, and reduction solver.
- `app/solver/kilominx/page.tsx` — public solver route.
- `app/solve/page.tsx` — Kilominx entry in the Solve hub.
- `tests/kilominx-engine.test.ts` — geometry, order-5/inverse/twist invariants, scramble round trips, and 50 random-scramble solution verifications.
- `components/SavedScrambles.tsx` — reusable solver-memory save/load panel.
- Kilominx save/load integration through `/api/solver-memory`.

## Verification status

### Repository evidence

- The feature branch includes dedicated automated Kilominx tests.
- The solver verifies generated solutions against the same engine state model.
- PR #4 merged cleanly into `main`.

### Still unverified

- No GitHub Actions workflow run was returned for merge commit `51950a0`.
- The merged `main` deployment has not yet been recorded as browser-tested.
- Mobile rendering, touch/swipe behavior, rotation/orientation changes, timer, undo, reset, and playback still need production-device verification.
- Saved scramble persistence needs signed-in production testing against Supabase.
- Guest behavior should be checked to ensure it shows a sign-in prompt rather than an error.

## Project-health impact

- **Puzzle breadth:** improved — Kilominx is now a first-class interactive solver.
- **Solver confidence:** improved — Kilominx has a dedicated regression suite and random-state verification evidence.
- **Solver Memory adoption:** improved — the reusable save/load UI is now used by one live solver.
- **Release risk:** moderately increased until mobile/browser and production persistence testing are recorded.
- **Architecture risk:** low — the branch shares RootA history and merged normally; no RootB manual port was involved.

## Documentation reconciliation

Updated on `main` after the merge:

- `docs/CURRENT_STATUS.md`
- `docs/ROADMAP.md`
- this dated checkpoint

The canonical documents now identify `main` as current at and after merge commit `51950a0`, record the merged Kilominx feature, and retain production/browser verification as open work rather than marking it fully complete.

## Next actions

1. Confirm the Vercel deployment for the merge and documentation commits.
2. Test `/solver/kilominx` on Android/iOS-sized mobile viewports and desktop.
3. Test all interaction controls and solve playback.
4. Test signed-in scramble save/load and guest sign-in behavior.
5. Reuse `SavedScrambles` on compatible 3×3/4×4/5×5/Pyraminx solver pages after puzzle-specific load behavior is verified.
6. Keep the Kilominx branch until production verification and a final diff check, then delete it.

## Rollback

Revert merge commit `51950a047bb363a1e922fb099d869ea923205da4` to remove the Kilominx feature set. The saved-scramble component uses the existing solver-memory API and does not introduce a new migration in this merge.
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-26-kilominx-merge.md -->

---

## Checkpoint — 2026-07-23 News, Arcade, and home links

> Consolidated from `docs/checkpoints/2026-07-23-news-arcade-home-links.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-23-news-arcade-home-links.md -->
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
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-23-news-arcade-home-links.md -->

---

## Checkpoint — 2026-07-22 3×3 challenges and solver memory

> Consolidated from `docs/checkpoints/2026-07-22-3x3-scrambles-solver-memory-handoff.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-3x3-scrambles-solver-memory-handoff.md -->
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
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-3x3-scrambles-solver-memory-handoff.md -->

---

## Checkpoint — 2026-07-22 mobile profile layout

> Consolidated from `docs/checkpoints/2026-07-22-mobile-profile-layout.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-mobile-profile-layout.md -->
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
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-mobile-profile-layout.md -->

---

## Checkpoint — 2026-07-22 password reset preview

> Consolidated from `docs/checkpoints/2026-07-22-password-reset-preview.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-password-reset-preview.md -->
# Password Reset Preview Deployment Checkpoint

**Timestamp:** 2026-07-22 03:36 America/New_York
**Source branch:** `gpt/cube-id-platform`
**Historical status:** preserved checkpoint; not a current deployment instruction.

## Purpose

A fresh Vercel preview deployment was triggered to include the password-reset flow and password-visibility controls.

## Recovery note

This checkpoint was recovered from:

`docs/deploy-triggers/password-reset-preview-20260722-0336.md`

The source file was branch-specific and only seven lines long. It is preserved here as deployment history. Current authentication status and operating instructions belong in `docs/AUTHENTICATION.md` and `docs/CURRENT_STATUS.md`.
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-password-reset-preview.md -->

---

## Checkpoint — 2026-07-22 site health and context rot

> Consolidated from `docs/checkpoints/2026-07-22-site-health-context-rot-review.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-site-health-context-rot-review.md -->
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
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-site-health-context-rot-review.md -->

---

## Checkpoint — 2026-07-22 social discovery and privacy

> Consolidated from `docs/checkpoints/2026-07-22-social-discovery-privacy.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-social-discovery-privacy.md -->
# Cube Labs 3D — Social Discovery and Privacy Queue

**Date:** 2026-07-22
**Branch:** `gpt/mobile-profile-page-20260722`
**Status:** build-verified locally; production migration and browser QA still required

## What changed

- Added smart people suggestions to `app/lib/profile-service.ts`.
- Added `/profile/friends` search for public Cube Tags, usernames, slugs, and display names.
- Added friend actions: send request, accept incoming request, decline incoming request, cancel/remove friendship.
- Added `/u/[slug]` public player profile pages.
- Added People To Challenge on `/profile`.
- Added `recipient` query-param prefill to `/leaderboard/3x3/play`.
- Added Data Export and Close Account controls to `/profile/settings`.
- Added migration `supabase/migrations/20260722_social_discovery_privacy_requests.sql`.

## Suggestion inputs

Suggestions are intentionally Cube Labs-specific rather than contact scraping:

- public profile visibility;
- favorite puzzle match;
- ranked scramble overlap;
- nearby best solve time;
- tracked solve volume;
- country match only when the current user allows location display.

Accepted, pending, and existing friendship rows are excluded from the suggestion list.

## Privacy and deletion flow

The settings danger zone now queues account requests in `account_data_requests`.

- `Email My Data Export` queues an `export` request and marks `privacy_export_requested_at`.
- `Close Account` requires typing `DELETE MY CUBE ID`, queues `close_account` with `export_before_delete = true`, switches the profile to private, hides location/collection/activity, and marks `account_closure_requested_at`.

Important boundary: this does not fully delete the Supabase Auth user yet. Final email delivery and deletion/de-identification need a server-only privacy worker with admin/service-role access.

## Migration notes

Run after:

- `20260722_cube_id_platform.sql`
- `20260722_cube_labs_mail_foundation.sql`
- `20260722_tracked_scrambles_solver_memory.sql`

The migration adds:

- `profiles.account_status`
- `profiles.privacy_export_requested_at`
- `profiles.account_closure_requested_at`
- `account_data_requests`
- privacy mail templates
- social-discovery indexes
- public-profile read/search RLS
- tighter friendship RLS policies

The Supabase CLI was not installed in this workspace, so this migration was created manually rather than through `supabase migration new`.

## Verification

Local build passed:

```bash
HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build
```

Build output includes the new dynamic route:

- `/u/[slug]`

## Still needed

- Apply the migration in Supabase.
- Browser-test with two signed-in accounts:
  - search public user;
  - send request;
  - accept request;
  - challenge from suggestion/friend card;
  - view `/u/[slug]`;
  - queue export;
  - queue close account.
- Add friend block/report.
- Add rate limits for search, friend requests, challenge creation, and privacy requests.
- Build the privacy worker that generates the export, emails it, then deletes or de-identifies data and deletes the Supabase Auth user.
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-social-discovery-privacy.md -->

---

## Checkpoint — 2026-07-22 tracked 3×3 next steps

> Consolidated from `docs/checkpoints/2026-07-22-tracked-3x3-challenge-next-steps.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-tracked-3x3-challenge-next-steps.md -->
# Tracked 3x3 Leaderboard Challenge — Next Steps

Date: 2026-07-22
Branch: `claude/home-page-html-rebuild-q7qomi`
Status: coded prototype, build verified, not production-trusted competition yet

## What works now

- `/leaderboard/3x3/play` launches the mobile playable 3x3 daily challenge.
- `/play/3x3` exists for the shared Play navigation.
- The homepage Daily Challenge button and leaderboard CTA open the tracked 3x3 flow.
- The 3x3 cube records elapsed time, move count, touch moves, button moves, undo uses, scramble, and replay metadata.
- The owner/test complete-time box can force a finish time for QA.
- Players can load a chosen 3x3 scramble, then save or send that exact scramble.
- Admin/test controls can override reported moves, undo uses, touch moves, button moves, and solved status for QA.
- Manual complete-time entries are marked in `replay_data` as `is_test_data` and `manual_time_override`.
- Manual tracking overrides are marked in `replay_data` as reported metrics plus actual metrics.
- A signed-in user can save a solve result through `/api/solves`.
- A signed-in user can send a challenge to another exact Cube Labs account match through `/api/challenges`.
- `/challenge/[id]` opens the sent scramble for the sender or recipient.
- `/profile/challenges` shows a basic signed-in challenge inbox.

## What must be added before public rankings

- Add explicit database columns for `is_test_data`, `manual_time_override`, assistance flags, validation status, sender move count, recipient move count, and recipient time.
- Add a `scrambles` / `scramble_attempts` database design so player-created scrambles can be saved once, reused, ranked, and attached to challenges.
- Add a versioned, renderer-independent puzzle-state contract instead of relying only on scramble text.
- Validate the official start state server-side when a challenge begins.
- Validate submitted results server-side before they become ranking candidates.
- Separate assisted and unassisted results.
- Exclude admin/test/manual override records from public leaderboards by default.
- Add suspicious-result detection and owner/admin review.
- Add audit logs for leaderboard corrections, manual overrides, challenge deletion, and admin test results.
- Build the real `getLeaderboard()` service using verified solve rows or ranking snapshots.
- Rank scrambles separately from players: attempts, completion rate, best time, average time, fewest moves, assisted/unassisted, and suspected-test data exclusion.

## What must be added for sending challenges

- Replace exact text recipient lookup with a real friend/account picker.
- Handle duplicate display names safely.
- Add friend requests, blocking, reporting, and privacy controls.
- Add rate limits for challenge creation and invites.
- Add copy-link, native share, QR, email, and text-message sends.
- Add guest challenge attempts only after public share-token access rules are designed.
- Add expiration, delete/decline, rematch, and abuse controls.
- Show sender and recipient comparison cards after both attempts are complete.

## What must be added for solver memory

- Add a `solver_snapshots` or `saved_cube_states` table for logged-in users.
- Store puzzle type, state schema version, facelets or renderer-independent state, scramble, generated solution, current playback step, notes, and created/updated time.
- Define paid-user retention rules: free users may get limited recent memory; paid users get deeper history, cross-device sync, and named folders.
- Add privacy/export/delete support because saved cube states are user data.
- Add solver-page UI for "resume last cube," "recent solver states," and "save this solve setup."
- Add an application service such as `getSolverMemory()` and `saveSolverSnapshot()` rather than direct Supabase calls from solver components.

## What must be tested next

1. Deploy the branch and open `/leaderboard/3x3/play` on a phone.
2. Tap homepage Daily Challenge -> Start Challenge and confirm it reaches the same route.
3. Load the official scramble and confirm the cube starts a timed tracked attempt.
4. Solve normally and save a result while signed in.
5. Enter a manual complete time and confirm it saves as test/admin metadata.
6. Load a chosen scramble and confirm the sent challenge uses that exact scramble.
7. Enter admin/test move and undo overrides and confirm replay metadata stores both actual and reported metrics.
8. Use two accounts to send and accept a challenge.
9. Confirm `/profile/challenges` shows sent and received challenge rows.
10. Confirm `/challenge/[id]` rejects accounts that are not the sender or recipient.
11. Confirm production has run `supabase/migrations/20260722_cube_id_platform.sql`; the `challenges` table depends on it.
12. Re-run `npm run build` after any schema/API follow-up.

## Code-comment note

The challenge service and cube replay metadata now include explanatory comments for:

- why UI code calls API routes instead of Supabase directly;
- why recipient lookup is exact-match only in this prototype;
- why manual times are test/admin metadata;
- why private challenge pages are sender/recipient only;
- why recipient result summaries need explicit schema columns before production comparison cards.
- why chosen scrambles, ranked scramble libraries, and solver memory need explicit database tables before they become production features.
<!-- END CONSOLIDATED SOURCE: docs/checkpoints/2026-07-22-tracked-3x3-challenge-next-steps.md -->

---

## Deployment record — GPT current site state

> Consolidated from `docs/deploy-triggers/gpt-current-site-state.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/deploy-triggers/gpt-current-site-state.md -->
# GPT Current Site State

Created to trigger a Vercel preview deployment for the `gpt/current-site-state` branch.

Timestamp: 2026-07-22 06:27 America/New_York

This file does not change app layout or runtime behavior.
<!-- END CONSOLIDATED SOURCE: docs/deploy-triggers/gpt-current-site-state.md -->

---

## Deployment record — password reset live

> Consolidated from `docs/deploy-triggers/password-reset-live-20260722.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/deploy-triggers/password-reset-live-20260722.md -->
# Deploy trigger — password reset live

**Date:** 2026-07-22
**Target commit for production:** `0753f57` (and its parent `e25edba`)

Purpose: force a fresh Vercel production build. The previous production
deployment was `a3f41c8` (docs refresh), which is two commits behind `main`
and therefore missing the password-reset work:

- `e25edba` — fix password-reset / signup email links to use the real site origin
- `0753f57` — add the reachable "Forgot your password?" entry point on `/auth`

After this deploy is **Ready**, `cubelabs3d.vercel.app/auth` should show the
"Forgot your password?" disclosure under the Sign In button.
<!-- END CONSOLIDATED SOURCE: docs/deploy-triggers/password-reset-live-20260722.md -->

---

## Deployment record — password reset preview

> Consolidated from `docs/deploy-triggers/password-reset-preview-20260722-0336.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/deploy-triggers/password-reset-preview-20260722-0336.md -->
# Password Reset Preview Deployment Trigger

Branch: `gpt/cube-id-platform`

Purpose: trigger a fresh Vercel preview deployment containing the password reset flow and password visibility controls.

Timestamp: 2026-07-22 03:36 America/New_York
<!-- END CONSOLIDATED SOURCE: docs/deploy-triggers/password-reset-preview-20260722-0336.md -->
