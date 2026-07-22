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
- `script.js` — generates every cube visual as inline SVG (isometric topic/hero
  cubes, tutorial thumbnails, product cube) plus the flat OLL/PLL face grids, so
  the page ships with **zero image assets**.
- `preview.png` — rendered reference screenshot.

## Preview locally
Open `index.html` in any browser — it needs no build step or server.

## Notes
- Fully responsive: 2-column desktop → stacked sidebar → single column on phones.
- Respects `prefers-reduced-motion`.
- Cards, tags, buttons and the bottom nav are wired for look only (no routing);
  routing/links come during the React port.
