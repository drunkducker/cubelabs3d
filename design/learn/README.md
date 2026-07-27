# Learn Page — engine-first teaching architecture

The canonical **`/learn`** route is the Next.js page under `app/learn/`. The original standalone HTML/CSS/JS mockup is preserved at **`/learn/standalone`** as a visual reference only.

## Permanent dependency flow

Learn is a teaching layer over the real puzzle systems. It must not define a second version of puzzle geometry, legal moves, notation, state, or animation.

```text
canonical puzzle engine + canonical renderer geometry
                    ↓
shared notation / teaching adapter
                    ↓
lesson definitions and algorithm sequencing
                    ↓
Learn UI, highlighting, explanations, and practice controls
```

The ownership rule is:

- Puzzle engines own exact state, legal moves, parsing, move labels, inverses, solved-state behavior, and geometry-derived relationships.
- Puzzle renderers own visual construction, picking, layer selection, animation, camera behavior, and mapping engine state onto visible pieces.
- The shared Learn adapter may translate engine concepts into teaching metadata such as display names, beginner explanations, highlighted regions, lesson order, and accessibility text.
- Lesson components may select moves, request highlights, execute real engine moves, and present explanations. They must not recreate puzzle rules or hand-draw an unrelated model.

When the engine or renderer changes, Learn should inherit the change through the adapter. A puzzle shape, face map, label, or algorithm step must never need to be corrected independently in both the solver and Learn.

## Existing sources to build from

- `components/NotationCube.tsx` — current labeled, touchable cube-notation interaction pattern.
- `components/NotationNet.tsx` and `lib/cube-net-layout.ts` — canonical flat cube-net layout.
- `app/NxNCubeGame.tsx` — NxN renderer and move interaction for 3×3, 4×4, and larger cubes.
- `lib/skewb-engine.ts` with `app/SkewbGame.tsx` — exact Skewb state, axes, layers, notation, and renderer.
- `lib/pyraminx-engine.ts` with `app/PyraminxGame.tsx` — geometry-derived Pyraminx state, move tables, labels, and renderer.
- `lib/kilominx-engine.ts` with `app/KilominxGame.tsx` — geometry-derived Kilominx faces, moves, labels, state, and renderer.

## Canonical Learn implementation

- `app/learn/page.tsx` — production Learn hub.
- `components/LearnModelExplorer.tsx` — temporary Learn presentation component; it should become a consumer of engine-backed adapters and existing renderers.
- `lib/learn-model-engine.ts` — temporary duplicated model data. It is not a permanent puzzle engine and should be replaced by a thin adapter registry over the canonical engines and renderers.
- `tests/learn-model-engine.test.ts` — temporary coverage that should migrate toward adapter contract tests proving every lesson move parses, executes, highlights the correct engine-owned region, and round-trips through the real puzzle engine.

## Adapter contract target

Each supported puzzle adapter should expose only teaching-facing references to canonical behavior, for example:

- puzzle identifier and renderer teaching mode;
- canonical move parser and formatter;
- legal move or axis identifiers from the real engine;
- engine-owned region or piece identifiers for highlighting;
- optional flat-reference projection derived from renderer geometry;
- a method to apply a lesson move to real puzzle state;
- beginner-facing names and explanations layered on top of those identifiers.

The adapter must reference existing constants and functions rather than copying their values. Tests should fail when a lesson refers to a move, face, axis, layer, or region that the canonical puzzle system does not recognize.

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

The standalone generator and its SVG geometry are not sources of truth for production Learn behavior.

## Interaction and accessibility

- Puzzle selection uses native buttons and exposes pressed state.
- Labels do not depend on color alone; notation and plain-language names remain visible.
- The active lesson step highlights the actual engine-owned move region and repeats the move in text.
- Reduced-motion users receive state changes without forced animation.
- Touch behavior, camera controls, and animation timing should reuse the corresponding puzzle renderer rather than introducing Learn-only interaction rules.
