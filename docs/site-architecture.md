# Cube Lab 3D — Site Architecture & Page-by-Page Design
**Mobile-first build spec** | Companion to the Launch + Growth Plan (July 2026)

---

## 0. Design principles before the pages

- **Thumb-first layout.** Every primary control sits in the bottom 60% of the screen, reachable one-handed. Nav and branding stay thin at the top.
- **Portrait as default, landscape as upgrade.** The cube must be fully playable in portrait; landscape unlocks a wider camera and side panel on tablets.
- **No login wall.** Every page is playable instantly. Accounts are an *upgrade*, never a gate.
- **One clear action per screen.** Solvers, guides, and play pages each have a single obvious next tap.
- **Performance budget:** LCP < 2.5s, INP < 200ms, CLS < 0.1 on a mid-range Android — this constrains every layout decision below (lazy-load anything below the fold, defer 3D asset loading until interaction).

### 0.1 Required code-documentation standard

**This requirement applies to every current and future source file.** The project must be written so that a new developer—or the owner learning the codebase—can understand what each meaningful part does without having to reverse-engineer it.

- **File header notes:** Every source file begins with a plain-language overview covering its purpose, where it is used, its important dependencies, the data it owns or receives, and any side effects it can cause.
- **Components, classes, hooks, and functions:** Every component, class, custom hook, and function receives a detailed JSDoc/TSDoc comment explaining its responsibility, inputs, outputs, state changes, failure cases, and important performance or security considerations. Exported items should also include a short usage example when that improves understanding.
- **Parameters, return values, and errors:** Document every parameter and return value, including units and valid ranges where relevant—for example milliseconds, cube coordinates, layer indexes, swipe distance, and rotation direction. State which errors may be thrown, returned, logged, or shown to the player.
- **State and data flow:** Add nearby notes for important state variables, refs, contexts, stores, database records, browser-storage keys, and network payloads. Explain who writes each value, who reads it, and what causes it to change.
- **3D and puzzle logic:** Use especially detailed notes for coordinate systems, face/layer selection, move notation, rotation matrices or quaternions, animation timing, gesture-to-move translation, scramble generation, undo/redo history, solver integration, solved-state detection, and server-side solve verification. Include invariants and small examples where useful.
- **Interaction logic:** Explain how touch, mouse, keyboard, camera controls, haptics, timers, accessibility modes, and responsive layouts interact—particularly where the code prevents gesture conflicts or accidental resets.
- **Async, storage, and server logic:** Explain request lifecycles, authentication boundaries, validation, rate limiting, cache behavior, optimistic updates, retries, offline sync, loading states, and user-visible error handling.
- **CSS and visual code:** Organize styles into clearly labeled sections. Document design tokens, layout rules, major selectors, breakpoints, animations, reduced-motion behavior, stacking layers, touch-target sizing, and accessibility-related color choices.
- **Configuration and formats that do not allow comments:** JSON and other comment-free files must stay valid. Explain every non-obvious field in the nearest README or a matching `*.notes.md` file instead of inserting invalid comments.
- **Explain both _what_ and _why_:** Notes should describe behavior, intent, assumptions, tradeoffs, edge cases, and connections to other files—not merely repeat the syntax in different words.
- **Keep notes accurate:** Any code change must update its related notes in the same commit. Outdated comments count as a defect and must be corrected before a feature is considered complete.
- **Definition of done:** A feature is not finished until its code notes, examples, and any related architecture documentation have been added or updated and a reviewer can follow the full behavior from entry point to result.

The notes should be intentionally thorough, but the implementation must remain readable: document every meaningful block and decision while grouping routine, repeated syntax under a clear section explanation instead of burying the code beneath redundant line-by-line comments.

---

## 1. Site map

```
/                          Home / Catalog
/play/[puzzle]             Play (3x3, 2x2, 4x4, 9x9, 20x20, pyraminx, megaminx, skewb)
/solver/[puzzle]           Step-by-step solver
/daily                     Daily Challenge
/guides/[slug]             Learn / patterns / beginner guides
/gear/[slug]               Buying guides (affiliate)
/leaderboard               Global + friends leaderboard
/profile/[username]        Public player profile
/account                   Settings, stats, Pro status
/challenge/[code]          Shared challenge/race link
/about  /privacy  /terms  /contact  /affiliate-disclosure
```

---

## 2. Home / Catalog — `/`

**Purpose:** Get a visitor's thumb on a cube within 3 seconds.

**Mobile layout (top to bottom):**
1. **Header bar (56px):** Logo mark (left), hamburger menu (right). No search bar yet — added once catalog > 8 puzzles.
2. **Hero tile:** Large tappable card — "Play 3x3 Now" with a live, lightly rotating 3D cube rendered in CSS/WebGL as background. One tap drops straight into `/play/3x3`, no interstitial.
3. **Daily Challenge strip:** Horizontal card showing today's scramble seed, a countdown to reset, and current streak if the visitor has one stored locally. Tap → `/daily`.
4. **Puzzle grid:** 2-column card grid (scrolls vertically), each card = puzzle thumbnail + name + difficulty dot + "Beta" tag where relevant. Order: 3x3, 2x2, 4x4, 9x9, 20x20 (beta), then shape-mods as they ship.
5. **"How you're doing" strip:** Personal best time (local storage even without account) — only shows after first solve, to avoid clutter for new users.
6. **Footer nav (collapsed accordion on mobile):** About, Privacy, Terms, Contact, Affiliate Disclosure, social icons.

**Controls:** Tap-only. No hover states — every interactive element needs a visible pressed state (scale 0.97 + shadow drop) since mobile has no hover.

**Fun add-ons:** Cube background subtly reacts to device tilt (gyroscope) — a small delight that costs little and signals "this is a real 3D toy."

---

## 3. Play page — `/play/[puzzle]`

This is the core screen. Everything else exists to funnel people here.

**Layout, portrait:**
- **Top bar (48px):** Back arrow, puzzle name + size selector (dropdown chip: "3x3 ▾"), timer (top right, large monospace digits).
- **3D viewport:** Fills remaining space above the control dock — roughly 55–65% of screen height. Canvas renders at a capped internal resolution and upscales, to protect frame rate on low-end phones.
- **Control dock (bottom, fixed, ~35% of height):**
  - Row 1: Scramble, Undo, Redo, Reset — 4 icon buttons.
  - Row 2: Camera controls — orbit drag zone is the viewport itself (one-finger drag = rotate view); pinch = zoom. A small "recenter camera" button sits bottom-right of the viewport.
  - Row 3 (contextual): Move-count and elapsed time; a "Solve for me" button that routes to the solver in playback mode.
- **Turning input:** Swipe directly on a cube face to turn that layer — the direction of the swipe determines clockwise/counterclockwise. This replaces on-screen button grids (which don't scale to 9x9/20x20). A small settings toggle offers "button mode" for accessibility/precision on tiny puzzles.

**Landscape / tablet upgrade:** Viewport expands to fill 75% of width; a side panel appears with move history, timer, and a mini scramble-algorithm ticker.

**Controls summary:**
- One-finger drag on a face = turn that layer.
- One-finger drag on empty space = rotate camera.
- Two-finger pinch = zoom.
- Two-finger twist = whole-cube rotation (for photographing a solved cube, sharing, etc.).
- Double-tap = recenter/reset camera only (never resets puzzle state — that always requires the explicit Reset button, to prevent rage-quits from accidental taps).

**Extras on this page:**
- **Ghost race overlay:** semi-transparent second cube solving alongside yours at a friend's or your own best pace.
- **Result card generator:** on solve, auto-builds a shareable image (time, moves, streak, puzzle) with a "Share" sheet (native share API) and a "Try to beat me" link.
- **Haptic feedback** on layer snap (mobile vibration API), toggleable in settings.

**Fun add-ons:**
- Confetti + a short procedural chime on personal-best solves.
- Cosmetic skins (Pro feature) — sticker themes, cube body materials, trail effects on fast turns.
- "Blindfold mode" toggle for advanced players (cube hides colors after scramble).

---

## 4. Solver page — `/solver/[puzzle]`

**Purpose:** The SEO workhorse — people arrive here from search wanting a specific answer, not a game.

**Layout:**
1. **Intake block (top):** "Enter your cube" — either (a) a tap-to-color interface (grid of facelets you tap and assign a color) or (b) "Use my current play session" if they came from `/play`.
2. **Solve button:** Large, single, centered.
3. **Result:** Move list rendered as a horizontal scrollable strip of algebraic notation chips (e.g., R, U, R', U'), synced to a 3D playback cube above it. Tap any chip to jump the animation to that move.
4. **Playback controls:** Play/pause, step forward/back, speed slider (0.5x–3x).
5. **Below the fold (SEO content, lazy-loaded):** Plain-language explanation of the method used, a short FAQ block, and a link to the matching beginner guide.

**Controls:** Tap-to-color intake is the trickiest mobile interaction here — use a large facelet grid (min 44px touch targets) with a persistent color palette bar pinned above the keyboard-safe area.

**Extras:** "Scan your cube" camera-input option (phase 2+) using device camera + on-device color detection — big differentiator vs. competitors, flagged as a stretch goal given complexity/privacy review needed.

---

## 5. Daily Challenge — `/daily`

**Purpose:** The retention engine.

**Layout:**
1. **Countdown banner:** "New scramble in 6h 12m" pinned under the header.
2. **Streak flame icon** with current count, tap to see streak calendar (last 30 days, filled/empty dots).
3. **Big "Start Today's Scramble" button** — same play interface as `/play/3x3` but with the shared daily seed, timer auto-starting on first turn (not on tap, to keep times fair).
4. **Post-solve:** result card, leaderboard position for today ("You're #482 today"), and a ghost-race replay of the current #1 time.
5. **Leaderboard preview:** top 5 today + "See full leaderboard" link.

**Fun add-ons:** Streak milestones unlock cosmetic badges (7-day, 30-day, 100-day) shown on the public profile.

---

## 6. Guides & Gear — `/guides/[slug]`, `/gear/[slug]`

**Purpose:** Pure content pages for SEO and affiliate revenue; must load fast and read well on mobile.

**Layout:**
- Standard article layout: large title, short intro, table of contents (collapsible on mobile), body with inline diagrams (static SVG, not 3D — keep these light).
- Guides: embedded mini-solver widget for the specific pattern being taught, so readers can try it inline instead of leaving the page.
- Gear pages: product cards (image, name, price, one-line honest verdict, "See on Amazon" button with visible disclosure text directly under it) — never disguised as editorial content.

**Security/trust note for this page type:** All affiliate links open in a new tab with `rel="nofollow sponsored noopener"`; disclosure text is present above the fold, not buried in a footer.

---

## 7. Leaderboard — `/leaderboard`

**Layout:** Tabbed view (swipeable tabs): Today / This Week / All-Time / Friends. Each row: rank, avatar, username, time, move count. Infinite scroll, virtualized list so it stays smooth past a few thousand rows.

**Controls:** Puzzle-size filter as a horizontal chip row above the tabs.

---

## 8. Profile — `/profile/[username]`

**Layout:** Avatar + username header, stat tiles (best times per puzzle, total solves, current streak), badge case (earned cosmetics/milestones), recent activity feed. Public by default but with a privacy toggle in account settings to hide from search/leaderboards.

---

## 9. Account / Settings — `/account`

**Sections (accordion on mobile):**
- Profile (username, avatar, privacy toggle)
- Stats & data export
- Subscription / Pro status, restore purchase
- Controls (swipe sensitivity, haptics, button-mode toggle, colorblind palette)
- Notifications (daily challenge reminder — opt-in only)
- Danger zone: delete account, export-then-delete data flow (see Security section)

---

## 10. Shared challenge link — `/challenge/[code]`

**Purpose:** The viral loop landing page. Built for someone arriving cold from a text message or social post.

**Layout:** "Alex challenged you — beat 0:42.18 on the 3x3." Cube preview, single "Accept Challenge" button, no account needed to play; account prompt only appears *after* they finish, to save their result.

---

## 11. Legal pages — `/about /privacy /terms /contact /affiliate-disclosure`

Kept plain, static, fast-loading, no 3D assets. Privacy policy must plainly disclose: analytics provider, any ad network and its data use, what's stored locally (device) vs. account-linked, and children's-privacy stance (audience is 13+, no open chat, no behavioral ads targeted at minors).

---

## 12. Global navigation & mobile chrome

- **Bottom tab bar** (persistent across Play/Daily/Leaderboard/Profile) is likely better than a hamburger for a game — 4 icons max: Play, Daily, Leaderboard, Profile. Home/catalog reached via logo tap.
- **PWA install prompt:** custom, deferred banner (not the raw browser prompt) shown only after a visitor completes one solve — timing it to a moment of demonstrated value increases install rate.
- **Offline behavior:** service worker caches the shell and the current puzzle so a solve-in-progress survives a dropped connection; daily/leaderboard data syncs when back online.

---

## 13. Security

- **Client-trust boundary:** treat all move data, times, and scores from the client as *claims*, not facts. Validate scramble→solve sequences server-side before writing to any leaderboard (a client can't be trusted to self-report a legitimate time).
- **Rate limiting** on solve submissions, account creation, and challenge-link generation to blunt scripted abuse of the leaderboard.
- **Auth:** passwordless (magic link or OAuth) is a good fit here — removes password-storage risk entirely and matches the low-friction ethos of the product.
- **No open chat in v1** (per the growth plan's own guardrail) — this closes off the biggest child-safety and moderation liability early.
- **Data minimization:** guests get a fully-featured local-only experience (stats in `localStorage`/`IndexedDB`); an account is only needed to sync across devices or appear on leaderboards, so most visitors never hand over PII at all.
- **COPPA-aware posture:** even with a 13+ audience target, avoid collecting more than username + email; no real-name requirement, no location collection beyond what's needed for CDN routing.
- **Transport/asset integrity:** HTTPS everywhere, Subresource Integrity on any third-party script, and a strict Content-Security-Policy given this is a canvas/WebGL-heavy app (a common injection surface if third-party ad or affiliate scripts are added carelessly).
- **Dependency hygiene:** since the 3D engine and solver libraries are the attack surface most likely to have supply-chain issues, pin versions and review update diffs rather than auto-updating.

---

## 14. Fun add-ons roadmap (beyond the core loop)

- **Ghost races** against your own best, a friend, or the daily #1 (already load-bearing for retention — see growth plan).
- **Blindfold mode** for advanced players.
- **Cube skins/materials** as the cosmetic monetization surface — stickers, body colors, turn-trail effects, victory animations.
- **Photo mode:** two-finger twist to pose a solved cube, tap to export a clean image for sharing outside the app (distinct from the auto-generated result card — this one's just for showing off the cube itself).
- **Seasonal scrambles:** timed daily scrambles with a themed cosmetic reward (low-cost content that refreshes the home screen).
- **Colorblind-safe palette toggle** — both an accessibility feature and a nice touch that broadens the playable audience.

---

## 15. Compliance checklist

Not legal advice — have a lawyer review before launch, especially the payment and privacy items. This is the landscape to build toward.

**Accessibility**
- [ ] Target WCAG 2.1 AA across the site.
- [ ] Keyboard-navigable alternative to swipe/drag (the "button mode" toggle covers puzzle controls).
- [ ] Sufficient color contrast on text and UI chrome.
- [ ] Alt text on all images; screen-reader labels on icon-only buttons.
- [ ] Captions on any tutorial/demo video content.

**Privacy law**
- [ ] Privacy Policy disclosing what's collected (account email, local stats, analytics/ad vendor sharing) and retention periods.
- [ ] CCPA/CPRA: "Do Not Sell or Share My Info" mechanism if using behaviorally-targeted ad networks and thresholds are met.
- [ ] GDPR: lawful basis for processing, consent banner for non-essential trackers if serving EU/UK traffic, account data export/delete flow.
- [ ] COPPA: age gate at account creation, no targeted ads to flagged under-13 accounts.

**Cookies / tracking**
- [ ] Consent banner for non-essential cookies (analytics, ad pixels) for EU/UK/CA traffic.

**Affiliate & advertising (FTC)**
- [ ] Clear, conspicuous affiliate disclosure above the fold on gear pages — not footer-only.
- [ ] Disclosure of any free product received from puzzle makers.

**Payments**
- [ ] Auto-renewal disclosure and easy cancellation path if any offer is subscription-based rather than one-time (several state laws + FTC).

**User-generated content**
- [ ] DMCA takedown policy and designated contact.
- [ ] Light content-moderation policy for usernames/avatars.

**Terms of Service**
- [ ] No guarantee of leaderboard accuracy.
- [ ] Account termination clause for cheating/abuse.
- [ ] Limitation of liability appropriate for a free/freemium game.

---

## 16. Admin, content & tech stack

**Admin / control panel**
- Not needed for AI-generation features themselves (those are user-facing tools) — needed so you can manage the site without touching code.
- Use a **headless CMS** (Sanity, Strapi, or Payload — all have free tiers) for news posts, guide articles, and featuring/unfeaturing games on the catalog. This gets you a real admin UI for free instead of building one.
- Build a **small custom admin route** (`/admin`, gated behind your own auth) only for game-specific operations a CMS can't do: leaderboard moderation, banning accounts, reviewing flagged times, toggling cosmetic items on/off.

**News section**
- `/news` (or `/blog`), same content pattern as the Guides pages (Section 6) — pulled from the CMS, fast-loading, no 3D assets on this page type.

**A place for multiple games — architecture decision needed**
This is a real fork, not just a new page:
- **Option A — Umbrella site:** One site (`yoursite.com`) with a `/games` catalog; Cube Lab 3D is one card among several, each game living at its own path (`/games/cube-lab`, `/games/next-game`). Simplest to manage, one admin panel, one account system shared across all games.
- **Option B — Standalone + portfolio:** Cube Lab 3D stays its own site/brand; a separate portfolio site links out to each project as an independent product with its own domain, branding, and possibly separate accounts.
- Recommendation: start with **Option A** — it's less infrastructure, shared auth/leaderboard system pays off across games, and you can always spin a breakout game into its own domain later if one takes off.

**Tech stack — free to start, scales without a rewrite**
| Layer | Choice | Why |
|---|---|---|
| Frontend | React via **Next.js** | Handles the game UI, marketing pages, news, and SEO-friendly server rendering in one framework; your existing vanilla JS/canvas skills carry over directly for the game engine itself. |
| Backend | **Node.js** (built into Next.js API routes, or a separate Node service if it grows) | Same language as the frontend — no context-switching. |
| Database | **Postgres**, hosted free via **Supabase** or **Neon** | Free tier scales to real traffic before you'd ever need to migrate; Supabase bundles auth + storage too, covering the passwordless login from the compliance doc. |
| Hosting | **Vercel** or **Netlify** (free tier) | Pairs natively with Next.js; scales automatically. |
| CMS | **Sanity** or **Strapi** (free tier) | Gives you the news/content admin panel without custom-building one. |

This combination is close to an industry-default "free to start, scales to real numbers" setup, and none of it requires switching stacks as the site grows.

---

## Build-order note

This maps directly onto the growth plan's phases: Sections 2–4 (Home, Play, Solver) are the Phase 1–2 foundation; Section 5 (Daily) and the sharing/ghost-race extras are Phase 3; profile, leaderboard, and cosmetics round out Phase 3–4. Nothing here should be built out of that order — a beautiful profile page with no one playing yet is wasted effort.
