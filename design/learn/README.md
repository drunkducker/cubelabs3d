# Learn Page — labeled model system

The canonical **`/learn`** route is the Next.js page under `app/learn/`. The original standalone HTML/CSS/JS mockup is preserved at **`/learn/standalone`** as a visual reference.

## Canonical Learn implementation

- `app/learn/page.tsx` — the production Learn hub.
- `components/LearnModelExplorer.tsx` — interactive labeled-model and algorithm-step explorer.
- `lib/learn-model-engine.ts` — canonical puzzle label registry shared by future lessons.
- `tests/learn-model-engine.test.ts` — verifies registration, unique labels, and algorithm-to-face mappings.

The model engine currently defines labeled flat covers for:

- 3×3
- 4×4
- Skewb
- Pyraminx
- Kilominx

Each definition owns its visible geometry, notation label, human-readable face name, explanation, and starter-algorithm step mappings. Lesson components should reference this registry instead of recreating labels locally. This keeps labels attached to the same puzzle regions when algorithm explanations, highlighting, animation, and practice drills are added.

## Preserved standalone prototype

The self-contained prototype remains in this directory:

- `index.html` — page structure.
- `styles.css` — standalone styling.
- `script.js` — legacy inline SVG cube and algorithm-face generators.
- `preview.png` — rendered reference screenshot.

To rebuild the standalone artifact:

- Run `node design/learn/build-embed.mjs`.
- The build inlines `styles.css` and `script.js` into `public/learn.html`.
- `next.config.mjs` rewrites `/learn/standalone` to `/learn.html`.

The standalone generator is not the source of truth for new Learn behavior. New puzzle labels and algorithm mappings belong in `lib/learn-model-engine.ts` so the React Learn route and future lesson pages use one hierarchy.

## Interaction and accessibility

- Puzzle selection uses native buttons and exposes pressed state.
- The labeled SVG has an accessible puzzle-specific name.
- The active algorithm step highlights the mapped face and repeats the move in text.
- Labels do not depend on color alone; notation and face names remain visible.
- The implementation remains responsive and honors the site-wide visual tokens.
