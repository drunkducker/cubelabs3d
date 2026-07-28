# Cube Labs 3D

Cube Labs 3D is a mobile-first twisty-puzzle platform built with Next.js,
TypeScript, Tailwind CSS, and Three.js. It includes playable puzzles and
solvers, Cube ID accounts, saved puzzle memory, friend challenges,
leaderboards, learning/news/arcade hubs, and a protected administration
platform.

## Current repository state

Last reconciled: **2026-07-27**

- Canonical production branch: `main` at `c5f7b58`.
- Active puzzle review: draft [PR #9](https://github.com/drunkducker/cubelabs3d/pull/9),
  `feature/skewb-puzzle` at `c3b5502`.
- PR #9 is nine commits ahead of `main`, mergeable, and has a successful
  Vercel preview status. It is not part of production `main`.
- The Skewb review build has a 14-piece renderer, direct layer dragging,
  eight stable corner pivots, a verified state-based solver, and visible
  Save Start, Share Link, Save Result, and Send to Friend actions.
- The branch verification gate is 64 Vitest tests, clean TypeScript, lint
  passing with existing warnings only, and a successful production build.
- Phone interaction, native share/clipboard behavior, signed-in persistence,
  and a two-account friend challenge still require final hosted testing.
- `NEXT_PUBLIC_COMING_SOON=1` switches the production homepage to the branded
  coming-soon experience without removing the full application routes.

The authoritative live status, release gates, and next priorities are in
[`docs/CURRENT_STATUS.md`](./docs/CURRENT_STATUS.md). Historical handoffs must
not override that file.

## Stack

- Next.js 14 App Router and TypeScript
- Tailwind CSS v3
- Three.js, React Three Fiber, and Drei
- Supabase Auth/PostgreSQL/Storage behind application-service boundaries
- Vitest for engine, security, validation, and action-contract tests
- Vercel for production and pull-request previews

## Getting started

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

A green build does not replace browser, mobile-device, database/RLS, or
two-account verification where those are required.

## Project map

- `app/` — App Router pages, puzzle experiences, APIs, and server actions
- `components/` — shared UI, puzzle actions, rendering, and admin components
- `lib/` — renderer-independent puzzle engines and application services
- `tests/` — Vitest regression and contract tests
- `supabase/migrations/` — reproducible database changes
- `docs/` — consolidated project source of truth, roadmap, references, decisions,
  and searchable history
- `design/` — preserved design prototypes and source assets

## Engine-first feature dependency rule

Features that explain, teach, replay, analyze, save, or share a puzzle must be
consumers of the canonical puzzle system, not parallel implementations of it.
The required dependency direction is:

```text
canonical puzzle engine + canonical renderer geometry
                    ↓
shared feature adapter
                    ↓
lesson, solver, replay, challenge, or analysis UI
```

The puzzle engine owns state, legal moves, notation, parsing, inverses, solved
status, and geometry-derived relationships. The renderer owns visible pieces,
picking, layer selection, animation, and mapping exact engine state onto the
model. Feature adapters may add presentation metadata and orchestration, but
must reference those existing contracts rather than copying geometry, labels,
move tables, or puzzle rules.

For Learn specifically, the adapter adds teaching names, explanations, lesson
order, highlights, and accessibility text over the existing notation,
solver-engine, and renderer contracts. See
[`design/learn/README.md`](./design/learn/README.md) for the concrete Learn flow
and migration target, and [`docs/CUBE-ENGINE.md`](./docs/CUBE-ENGINE.md) for the
canonical puzzle-engine boundaries.

## Required documentation workflow

Before meaningful work, use the routing index in
[`docs/README.md`](./docs/README.md), then read
[`docs/GOVERNANCE.md`](./docs/GOVERNANCE.md),
[`docs/CURRENT_STATUS.md`](./docs/CURRENT_STATUS.md), and the one canonical
reference for the affected system.

After implementation, update that reference, current status or roadmap when
their facts changed, and append one evidence entry to
[`docs/HISTORY.md`](./docs/HISTORY.md). Record branch, commit/PR, tests,
deployment, known issues, migration impact, and rollback information.

Detailed puzzle-engine, renderer, camera, and solver handoff notes are
consolidated in [`docs/CUBE-ENGINE.md`](./docs/CUBE-ENGINE.md).
