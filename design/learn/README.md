# Learn Page — HTML rebuild

A faithful, self-contained HTML/CSS/JS rebuild of the **Learn** page mockup
(`LEARN. PRACTICE. MASTER.`). Built the same way as the earlier homepage HTML
pass — plain markup that matches the sample pixel-for-pixel before any React
port — so it can later be moved into the Next.js app (`app/learn/`) 1:1.

## Files
- `index.html` — page structure (header, hero, search, topic grid, featured
  tutorials, popular algorithms, progress/affiliate/premium sidebar, bottom nav).
- `styles.css` — all styling. Brand tokens mirror `app/globals.css` so the port
  reads from the same palette.
- `script.js` — generates every cube visual as inline SVG (isometric topic
  cubes, tutorial thumbnails, product cube) plus the flat OLL/PLL face grids, so
  the page ships with **zero image assets**.

The hero cube is a pure-CSS 3D Rubik's cube (six `.cube-face` panels on a
`preserve-3d` stage) that tumbles continuously behind the headline via the
`spin3d` keyframes; a left-to-right scrim keeps the copy readable over it.

The header **brand mark is the same 3D cube** shrunk to logo size
(`.logo-cube` / `.lc-face`): a slow idle `logospin` that speeds up on hover,
replacing the old flat polygon icon. Both cubes honor `prefers-reduced-motion`
by holding a static angled pose.
- `preview.png` — rendered reference screenshot.

## Preview locally
Open `index.html` in any browser — it needs no build step or server.

## How it's served in the app
The app serves this page at **`/learn`**:
- `node design/learn/build-embed.mjs` inlines `styles.css` + `script.js` into a
  single self-contained `public/learn.html` (byte-faithful to the prototype).
- `next.config.mjs` rewrites `/learn` → `/learn.html`.
- Re-run the build step after editing any of the three source files here.

**Navigation wired:** Home's "Learn" tile → `/learn`; this page's "Getting
Started" tile → `/cube-notation`; bottom-nav Home → `/`, Solvers → `/solve`,
Profile → `/profile`.

## Notes
- Fully responsive: 2-column desktop → stacked sidebar → single column on phones.
- Respects `prefers-reduced-motion`.
- The **affiliate strip is a real product carousel** (`.aff-carousel`): native
  scroll-snap for swipe, JS auto-advance every 2.8s that pauses on hover / focus
  / touch, dot indicators that track position, and each card is its own link.
  Auto-advance is disabled under `prefers-reduced-motion` (still swipeable).
- Other cards, tags, buttons and the bottom nav are wired for look only (no
  routing); product links point at `#` — real routing/links come with the
  React port.
