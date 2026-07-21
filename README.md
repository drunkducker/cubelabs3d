# Cube Lab 3D

Cube Lab 3D is a mobile-first online twisty-puzzle site. The current release has
a fast puzzle catalog at `/` and a fully interactive, solvable 3×3 cube at
`/play/3x3`.

Live demo: [cube-lab-3d.drunkducker.chatgpt.site](https://cube-lab-3d.drunkducker.chatgpt.site)

Project documents:

- [Site architecture and code-documentation standard](docs/site-architecture.md)
- [Launch and growth plan](docs/launch-growth-plan.md)
- [GitHub upload instructions](GITHUB-UPLOAD.md)

## What works now

- Browse a responsive catalog of planned cube sizes and shape puzzles.
- Open the 3×3 without an account or installation.
- Rotate the camera by dragging empty space.
- Turn a layer by swiping a colored tile.
- Use accessible face buttons for precise clockwise/counterclockwise turns.
- Scramble, undo, automatically reverse the complete move history, and reset.
- Start a timer on the first player move and store a device-local personal best.
- Fall back to a CSS cube when WebGL cannot be created.

The cards for 2×2, 4×4, 9×9, 20×20, Pyraminx, Megaminx, and Skewb are honest
roadmap previews; they are not presented as playable before their engines exist.

## Route map

| Route | Current responsibility |
| --- | --- |
| `/` | Catalog, 3×3 entry point, Daily Challenge preview, local best, roadmap |
| `/play/3x3` | Complete Three.js puzzle engine and play controls |

Future routes should follow the architecture pattern (`/play/<puzzle>`,
`/solver/<puzzle>`, `/daily`, `/guides/<slug>`, and `/gear/<slug>`) only when
their corresponding features are real and testable.

## Source map and data flow

| File | Why it exists |
| --- | --- |
| `app/page.tsx` | Lightweight server entry point for the catalog route. |
| `app/HomeCatalog.tsx` | Client-side catalog, countdown, puzzle data, and local-best read. |
| `app/play/3x3/page.tsx` | Stable route metadata and entry point for the game. |
| `app/CubeGame.tsx` | Three.js scene, puzzle model, gestures, moves, timer, and play interface. |
| `app/SiteBrand.tsx` | Shared code-native wordmark. |
| `app/layout.tsx` | Shared HTML document, metadata, fonts, and global stylesheet. |
| `app/globals.css` | Commented design system for catalog, cube game, and responsive states. |

The only gameplay value persisted by this release is
`cube-lab-best-3x3-ms` in browser `localStorage`. The Play page writes the key
after a manual solved state; the catalog reads it to show a personal best. No
account data or personal information is collected by this feature.

## Code-documentation rule

Every project-owned source file must explain its purpose, inputs, outputs,
state, side effects, edge cases, and important design decisions. Three.js math,
gesture interpretation, solved-state logic, storage, security boundaries, and
performance tradeoffs require especially detailed comments. A feature is not
complete until its explanatory notes change with its implementation.

Routine repeated syntax should be grouped under one accurate section note. This
keeps the code teachable without allowing redundant comments to hide the logic.
Formats that do not permit comments—such as `package.json` and `tsconfig.json`—
are explained in the configuration reference below.

## Configuration reference

- `package.json` pins the Node version, project scripts, Three.js, React, Vinext,
  and the Sites-compatible build dependencies. Do not add a package when the
  platform or browser already provides the needed capability.
- `package-lock.json` is generated from `package.json` and guarantees repeatable
  dependency versions. It should be changed by the package manager, not by hand.
- `tsconfig.json` defines TypeScript/JSX compilation and path handling.
- `next.config.ts` contains framework-level settings for the Next-compatible app.
- `vite.config.ts` keeps the Sites/Vinext development and production pipeline.
- `.openai/hosting.example.json` documents the Sites configuration shape without
  publishing the live deployment identifier. Copy it to `.openai/hosting.json`
  locally and use only the project value supplied by the hosting platform.
- `postcss.config.mjs` enables the CSS processing used by the global stylesheet.
- `eslint.config.mjs` defines static code-quality checks.
- `drizzle.config.ts`, `db/`, and `examples/d1/` are the starter's dormant
  database path. The current release does not require server persistence.
- `worker/index.ts`, `build/`, and `scripts/` implement the Sites-compatible
  build and runtime wrapper. Product code should not duplicate those jobs.
- `tests/rendered-html.test.mjs` verifies that the built worker renders valid
  HTML with the platform's development-preview metadata.

## Local development

Prerequisites: Node.js `>=22.13.0`, Linux, `flock`, `curl`, and GNU `timeout`.

```bash
npm run dev
```

Useful verification scripts:

```bash
npm run lint
npm run build
npm test
```

The lifecycle checkout normally installs and validates dependencies. The build
script creates the deployable worker and validates its required artifacts.

## Implementation order

1. Keep the catalog and current 3×3 reliable on touch, mouse, and keyboard.
2. Extract reusable puzzle-engine boundaries while adding 2×2 and 4×4.
3. Add a real Daily Challenge with shared, server-verifiable scrambles.
4. Add solver pages and educational content for search traffic.
5. Add accounts only for sync, public rankings, and multiplayer challenges.
6. Add clearly disclosed affiliate gear pages after content traffic exists.

This order protects the core play loop from being buried under unfinished social
or monetization features.
