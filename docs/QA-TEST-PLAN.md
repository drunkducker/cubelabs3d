# Cube Labs 3D — Functional QA Test Plan

**Created:** 2026-07-27
**Purpose:** A repeatable checklist to validate that every user-facing area of the site functions. Use it for release verification and to work down the "browser/device verification" gate in `CURRENT_STATUS.md` and `ROADMAP.md`. Supports **AC-010 — cross-device release checklist**.

## How to use

- Run a section, mark each case `[x]` pass / `[!]` fail (link the bug) / `[-]` blocked.
- Record results and the environment (preview URL or production, browser, device) in `DAILY-LOG.md` or a dated checkpoint.
- A release is "browser-verified" only when P0 and P1 cases pass on at least one mobile and one desktop browser.

## Legend

- **Type** — `[A]` automatable now (Playwright/vitest, no prod secrets); `[M]` manual browser check; `[P]` production-gated (needs applied Supabase migrations, service-role/Stripe keys, email, or the live deploy).
- **Priority** — `P0` launch blocker, `P1` core experience, `P2` polish/edge.

## Test environments

- **Local/dev preview** — `npm run dev`; anonymous + guest flows and all rendering. No real auth/email/billing unless env is configured.
- **Vercel preview** — build parity; still gated on Supabase/Stripe/email configuration.
- **Production** — the only place migrations, RLS, email, billing, and admin bootstrap can be fully verified.
- **Devices** — at minimum one iOS Safari, one Android Chrome, one desktop Chrome/Firefox/Safari, plus high-DPI and reduced-motion.

---

## 1. Global / cross-cutting

- [ ] `G-01` `[A]` `P0` App builds and every route returns 200 (no 500) for an anonymous visitor: crawl the public route list.
- [ ] `G-02` `[A]` `P1` No uncaught console errors or unhandled promise rejections on first paint of each public page.
- [ ] `G-03` `[M]` `P0` Global security headers/CSP from `next.config.mjs` are present on responses and do not block first-party scripts, styles, images, or fonts.
- [ ] `G-04` `[M]` `P1` Responsive layout holds at 320px, 375px, 768px, 1280px — no horizontal body scroll; the mobile app-shell max width (460px) is respected on profile/social routes.
- [ ] `G-05` `[M]` `P1` Footer renders on the homepage with working links for Company, Legal, Safety, and Transparency groups; `#` placeholders are visibly inert.
- [ ] `G-06` `[A]` `P1` Every in-app `<Link>` target resolves (no 404) — internal link audit across nav, footer, profile, and solver pages.
- [ ] `G-07` `[M]` `P2` Light/dark rendering is legible (site is dark-committed; confirm no unreadable low-contrast text).
- [ ] `G-08` `[M]` `P2` A deliberately unknown route (e.g. `/does-not-exist`) shows a usable not-found page.
- [ ] `G-09` `[M]` `P1` Bottom nav (`AppBottomNav`) and site header (`SiteHeader`) navigate correctly and highlight the active section.

## 2. Homepage & hubs

- [ ] `H-01` `[M]` `P0` Homepage hero/interactive cube renders and is interactive; no layout shift on load. **Do not change homepage layout** — verify it matches the approved design.
- [ ] `H-02` `[M]` `P1` Content carousels/rails scroll and their dots (`CarouselDots`) track position.
- [ ] `H-03` `[M]` `P1` Homepage entry points navigate into `/news`, `/my-arcade`, `/learn`, `/solve`, `/leaderboard`, and `/auth`.
- [ ] `H-04` `[M]` `P1` `/news`, `/my-arcade`, `/learn` render their hub content and back-links home.
- [ ] `H-05` `[M]` `P1` "Continue as Guest" sets guest mode and the Sign In CTA routes to `/auth`.
- [ ] `H-06` `[M]` `P2` `/solve` lists all puzzles and each card links to the correct solver route.

## 3. Cookie consent & privacy controls

- [ ] `C-01` `[M]` `P0` First visit with no stored decision shows the consent banner; nonessential storage is not written yet.
- [ ] `C-02` `[A]` `P0` "Accept all" records consent, hides the banner, and does not reappear on reload (cookie `cl_consent` + localStorage present, correct version).
- [ ] `C-03` `[A]` `P0` "Reject nonessential" records a decision with all optional categories off.
- [ ] `C-04` `[M]` `P1` "Customize" and `/cookies/settings` open the per-category modal; toggling preferences/analytics/advertising and "Save choices" persists exactly those.
- [ ] `C-05` `[A]` `P1` Ad tracking beacons (`components/ads/tracking.tsx`) do **not** fire until advertising consent is granted; they fire after opt-in.
- [ ] `C-06` `[M]` `P1` With a GPC-enabled browser/extension, the banner shows the GPC notice and advertising is pre-set to off.
- [ ] `C-07` `[M]` `P1` `/cookies/settings` shows current choices and the first-party cookie inventory table; footer "Cookie Settings" link reaches it.
- [ ] `C-08` `[M]` `P2` Bumping `CONSENT_VERSION` re-shows the banner (re-consent path).
- [ ] `C-09` `[M]` `P2` Escape key and backdrop click close the settings modal; closing without deciding re-shows the banner.

## 4. Authentication & session

- [ ] `A-01` `[M]` `P0` `/auth` matches the homepage style; Sign In and Create Account paths are reachable.
- [ ] `A-02` `[P]` `P0` Create account with a new email succeeds and establishes a session (`cubelabs_access_token` / `cubelabs_refresh_token` cookies set, httpOnly).
- [ ] `A-03` `[P]` `P0` Sign in with valid credentials succeeds; invalid credentials show a clear error and no session.
- [ ] `A-04` `[P]` `P0` `/auth/reset` sends a password-reset email; the emailed link lets the user set a new password and sign in.
- [ ] `A-05` `[P]` `P1` Password field (`PasswordField`) show/hide works; weak/mismatch validation messaging is correct.
- [ ] `A-06` `[M]` `P1` OAuth provider buttons (`/auth/provider/[provider]`) behave correctly — either complete real OAuth or clearly indicate "not yet enabled" without dead ends.
- [ ] `A-07` `[P]` `P0` Session expiry/refresh: an expired access token silently refreshes or redirects to sign-in with a clear message.
- [ ] `A-08` `[M]` `P0` Signing out clears auth cookies and protected pages redirect to `/auth`.
- [ ] `A-09` `[M]` `P1` Guest visiting an account-only feature (saved scrambles, friends, challenges) gets a clear sign-in prompt, not an error.

## 5. Cube ID / profile

- [ ] `PR-01` `[P]` `P0` `/profile` dashboard loads for a signed-in user with stats, recent solves, and navigation to sub-pages.
- [ ] `PR-02` `[P]` `P1` `/profile/settings` edits display name, handle/slug, bio, favorite puzzle, and privacy/visibility toggles; saves persist and validation rejects duplicate handles.
- [ ] `PR-03` `[P]` `P1` `/profile/solves` lists solve history with correct puzzle/time/DNF formatting.
- [ ] `PR-04` `[P]` `P1` `/profile/collection` lists cubes; `/profile/achievements` shows unlocked achievements.
- [ ] `PR-05` `[P]` `P1` `/profile/mail` (Cube Labs Mail) lists messages/templates and opens an item.
- [ ] `PR-06` `[P]` `P1` `/profile/challenges` shows sent/received challenges with correct status.
- [ ] `PR-07` `[P]` `P0` Public profile `/u/[slug]` resolves by slug/handle/username; respects `profile_visibility` and activity/collection privacy flags for a non-owner viewer.
- [ ] `PR-08` `[M]` `P1` Viewing own `/u/[slug]` shows "Edit Profile"; viewing another shows Add Friend / relationship status + Challenge + Safety actions.
- [ ] `PR-09` `[P]` `P1` Privacy queues: data-export and account-closure requests can be submitted from the relevant flow and are recorded (`account_data_requests`).

## 6. Puzzle engines & solvers

For **each** solver — `/solver/2x2`, `/solver/3x3`, `/solver/4x4`, `/solver/5x5`, `/solver/pyraminx`, `/solver/kilominx` — and the play routes `/play/3x3`, `/play/4x4`, `/play/10x10`, `/leaderboard/3x3/play`:

- [ ] `E-01` `[M]` `P0` 3D puzzle renders correctly (all faces/pieces, correct colors, no z-fighting) on desktop and mobile.
- [ ] `E-02` `[M]` `P0` Touch/swipe turns a layer in the expected direction; face buttons perform the labeled move.
- [ ] `E-03` `[M]` `P0` Scramble produces a valid scrambled state and shows scramble notation/history.
- [ ] `E-04` `[M]` `P0` Solve/solver playback animates to a solved state and the solution is valid for the shown scramble.
- [ ] `E-05` `[M]` `P1` Timer starts/stops correctly; solved-state detection stops the timer and records the time.
- [ ] `E-06` `[M]` `P1` Undo reverts the last move; Reset returns to solved and clears history/timer.
- [ ] `E-07` `[M]` `P1` Zoom/orbit, high-DPI, and viewport/orientation changes keep the puzzle centered and performant.
- [ ] `E-08` `[M]` `P1` Manual color entry (3×3, 4×4, and 5×5 where supported) accepts a valid state, rejects invalid/duplicate stickers, and solves it; no freeze.
- [ ] `E-09` `[A]` `P1` Interim 5×5 solver returns a solution for representative states and does not hang the UI (worker/`solver4.worker.ts` path stays responsive).
- [ ] `E-10` `[M]` `P2` Rapid repeated scramble/solve/reset does not leak memory or degrade frame rate over a few minutes on a mid/low-end phone.
- [ ] `E-11` `[A]` `P1` Kilominx engine invariants remain green (`tests/kilominx-engine.test.ts`) and the on-page solver matches engine output.

## 7. Saved scrambles / solver memory

- [ ] `SM-01` `[P]` `P0` Signed-in user saves a scramble from a solver (`SavedScrambles` → `/api/solver-memory`); it appears in the list and persists across reload.
- [ ] `SM-02` `[P]` `P1` Loading a saved scramble resets the engine and applies that scramble (native load listener — PF-008, currently partial).
- [ ] `SM-03` `[P]` `P1` Delete/manage a saved scramble; ownership is enforced (a user cannot read another user's memories).
- [ ] `SM-04` `[M]` `P1` Guest sees a sign-in prompt when attempting to save.
- [ ] `SM-05` `[P]` `P2` Free-tier memory limits behave as designed once billing-aware limits exist (currently pending).

## 8. Social: friends, challenges, leaderboard

- [ ] `S-01` `[P]` `P0` `/profile/friends` search finds public profiles by Cube Tag / username / slug; suggestions render for a populated account.
- [ ] `S-02` `[P]` `P0` Send / accept / decline / cancel / remove friend request updates both accounts and the correct `friendships` rows.
- [ ] `S-03` `[P]` `P0` Create a challenge to a friend; recipient sees it, opens the shared scramble, plays, submits, and both results/store rows are correct (`/api/challenges`, `/challenge/[id]`).
- [ ] `S-04` `[P]` `P1` Two-account end-to-end: friend + challenge + result recording verified with real rows.
- [ ] `S-05` `[P]` `P1` `/leaderboard` and `/leaderboard/3x3/play` show ranked, eligible, non-test attempts only; test/excluded rows never appear.
- [ ] `S-06` `[M]` `P2` Challenge share link/recipient handle prefill works from profile and friends "Challenge" buttons.

## 9. Safety: block & report

- [ ] `SF-01` `[P]` `P0` From `/u/[slug]`, Block records a `user_blocks` row and removes any existing friendship in both directions.
- [ ] `SF-02` `[P]` `P0` A blocked account no longer appears in the blocker's friend search or suggestions.
- [ ] `SF-03` `[P]` `P0` Report submits a `moderation_reports` row pinned to the reporter, `status=open`, `severity=normal`; it surfaces in the admin queue (notification bell / overview count).
- [ ] `SF-04` `[P]` `P1` `/profile/blocked` lists blocked accounts with details and Unblock; unblocking removes the row and restores visibility.
- [ ] `SF-05` `[M]` `P1` Block/report forms work without client JavaScript (progressive enhancement) and cannot target yourself.
- [ ] `SF-06` `[P]` `P0` RLS: a member cannot read another member's blocks, cannot read others' reports, and cannot create a report with escalated severity/status or a spoofed reporter_id (attempt a raw PostgREST call and confirm denial).
- [ ] `SF-07` `[A]` `P1` Safety validators stay green (`tests/safety.test.ts`): reason building, control-char stripping, length caps, UUID guard.

## 10. Policy & legal pages

- [ ] `L-01` `[A]` `P1` Each page renders with its heading and the launch-draft banner: `/privacy`, `/terms`, `/cookies`, `/cookies/settings`, `/data-rights`, `/affiliate-disclosure`, `/accessibility`, `/community-guidelines`, `/moderation`, `/security`, `/dmca`, `/cube-notation`.
- [ ] `L-02` `[A]` `P1` Cross-links resolve: Community Guidelines ↔ Moderation ↔ DMCA ↔ Security ↔ Data Rights ↔ Cookie Settings.
- [ ] `L-03` `[M]` `P1` Footer "Safety" group links reach the four new pages.
- [ ] `L-04` `[M]` `P2` Content is readable on mobile (prose width, tap targets, no overflow).

## 11. Ads & affiliates

- [ ] `AD-01` `[P]` `P1` `AdSlot` renders the highest-priority live campaign for a placement/device and renders nothing (no empty box) when none is live.
- [ ] `AD-02` `[P]` `P1` Affiliate cards and managed carousels render with the required sponsored/disclosure label.
- [ ] `AD-03` `[P]` `P1` Impression and click beacons hit `/api/ads/track` and increment counters — **only** after advertising consent (ties to C-05).
- [ ] `AD-04` `[M]` `P2` Sponsored links use `rel="sponsored nofollow noopener noreferrer"` and open safely.
- [ ] `AD-05` `[M]` `P1` For Premium/no-ads users, managed display ads are hidden while legal disclosures remain (once PW-001 exists).

## 12. Billing / subscriptions (Stripe)

- [ ] `B-01` `[P]` `P0` `/api/billing/checkout` creates a Checkout session with live keys; missing keys fail closed (no crash, no false entitlement).
- [ ] `B-02` `[P]` `P0` `/api/billing/webhook` verifies the Stripe signature (HMAC + timing-safe) and rejects tampered/invalid signatures.
- [ ] `B-03` `[P]` `P0` A completed subscription event grants entitlement; cancellation removes it; entitlement is driven by verified webhooks, not the success page.
- [ ] `B-04` `[P]` `P1` Duplicate and out-of-order webhook delivery does not double-apply (idempotency).
- [ ] `B-05` `[M]` `P1` Pricing/billing pages behave correctly once built (`/pricing`, `/profile/billing` — currently pending).

## 13. Admin portal

- [ ] `ADM-01` `[P]` `P0` `/admin` requires an admin session; non-admins are routed to `/admin-denied`; anonymous users cannot reach any `/admin/*` route.
- [ ] `ADM-02` `[P]` `P0` Role gating: Owner, Admin, Moderator, Analyst each see only permitted sections; denied actions are blocked server-side, not just hidden.
- [ ] `ADM-03` `[P]` `P0` Last-owner guard: the final active Owner cannot be demoted or deactivated (`/admin/roles`).
- [ ] `ADM-04` `[P]` `P1` Users: list, view `/admin/users/[id]`, suspend/restore with audit entries and correct scope.
- [ ] `ADM-05` `[P]` `P1` Moderation: reports from real users appear in `/admin/challenges`/queue; review actions (valid/flag/exclude/restore, time correction) preserve originals and write audit rows.
- [ ] `ADM-06` `[P]` `P1` Leaderboards: suspicious queue, exclude/restore, and audited time correction never overwrite the original value.
- [ ] `ADM-07` `[P]` `P1` Media: upload validates by magic bytes, enforces the size cap, stores to the private `admin-media` bucket, and serves signed previews; deletion works.
- [ ] `ADM-08` `[P]` `P1` Billing view shows plans/subscriptions and Stripe config status.
- [ ] `ADM-09` `[P]` `P1` Audit log is append-only, redacted, and filterable; Security center shows recent events and deployment checks.
- [ ] `ADM-10` `[P]` `P2` Ads, carousels, settings, exports, and test-lab pages load and their primary actions work.
- [ ] `ADM-11` `[A]` `P1` Admin permission and redaction logic stay green (`tests/permissions.test.ts`, `tests/redact.test.ts`).

## 14. API / backend & data integrity

- [ ] `API-01` `[P]` `P0` All dated Supabase migrations apply in order in production without skipped dependencies (`I-001`/`I-002`), including `20260727_user_blocks_and_reporting.sql`.
- [ ] `API-02` `[P]` `P0` RLS deny-by-default holds: anonymous and ordinary authenticated roles cannot read/write admin, billing, private media, other users' memories, blocks, or private challenge data.
- [ ] `API-03` `[P]` `P0` `/api/solves`, `/api/solver-memory`, `/api/challenges`, `/api/challenges/[id]/attempt` enforce auth and ownership; unauthenticated calls are rejected.
- [ ] `API-04` `[P]` `P1` `/api/admin/*` requires admin and is not reachable with an ordinary token.
- [ ] `API-05` `[A]` `P1` Campaign selection and media validation logic stay green (`tests/campaign-selection.test.ts`, `tests/media.test.ts`).
- [ ] `API-06` `[M]` `P1` Error responses never leak secrets, tokens, or stack traces to the client.

## 15. Accessibility (AC phase)

- [ ] `AX-01` `[M]` `P1` Keyboard-only: every interactive control is reachable and operable; visible focus rings; no keyboard traps (esp. cookie modal, forms, admin tables).
- [ ] `AX-02` `[M]` `P1` Screen reader: names/roles/states are announced; the cookie dialog, report/block forms, and nav landmarks are labeled.
- [ ] `AX-03` `[M]` `P1` Contrast meets WCAG AA for text, controls, focus, and status chips.
- [ ] `AX-04` `[M]` `P1` `prefers-reduced-motion` reduces/disables nonessential animation (hero, solver playback where practical).
- [ ] `AX-05` `[M]` `P2` Forms have associated labels, clear errors, and recovery; 200% zoom/reflow stays usable.
- [ ] `AX-06` `[M]` `P2` Puzzle interactions offer an accessible/equivalent control path where practical (button moves as an alternative to swipe).

## 16. Performance & cross-device (release gate)

- [ ] `PF-01` `[M]` `P1` Cold-load time and interactivity are acceptable on a mid/low-end Android over throttled network.
- [ ] `PF-02` `[M]` `P1` Solver pages hold a usable frame rate during animation on target devices; no runaway memory.
- [ ] `PF-03` `[M]` `P1` iOS Safari and iPad: layout, canvas/WebGL, touch, and form controls behave.
- [ ] `PF-04` `[M]` `P1` Desktop Chrome, Edge, Firefox, Safari: current versions render and function.
- [ ] `PF-05` `[M]` `P2` PWA install/offline/update behaves as designed once PWA work is verified.

## 17. Existing automated coverage (baseline)

Green as of 2026-07-27 — keep these passing and extend them:

- [ ] `T-01` `[A]` `npm test` → 63/63 across `campaign-selection`, `consent`, `kilominx-engine`, `media`, `permissions`, `redact`, `safety`, `validation`.
- [ ] `T-02` `[A]` **Gap:** no solver-correctness fixtures for 3×3/4×4/5×5/Pyraminx (Q-001/2/3/5). Add before relying on solver output.
- [ ] `T-03` `[A]` **Gap:** consent write/read round-trip and block/report server actions have no DOM/integration test (node env can't exercise cookies/PostgREST). Add a jsdom or Playwright layer.
- [ ] `T-04` `[A]` **Suggested:** a Playwright smoke suite that loads every public route, asserts 200 + no console errors, and exercises the cookie banner and a solver scramble/solve.

---

## Priority summary

- **P0 (must pass to launch):** G-01/03, C-01/02/03, A-02/03/04/07/08, PR-01/07, E-01/02/03/04, SM-01, S-01/02/03, SF-01/02/03/06, B-01/02/03, ADM-01/02/03, API-01/02/03.
- **Automatable now (no prod secrets):** G-01/02/06, C-02/03/05, E-09/11, SF-07, L-01/02, ADM-11, API-05, T-01/04 — a Playwright + vitest pass can cover these in CI today.
- **Production-gated:** everything marked `[P]` — needs applied migrations, service-role/Stripe keys, the private media bucket, email, and the owner bootstrap before it can be verified.
