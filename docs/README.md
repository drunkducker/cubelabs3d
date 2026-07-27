# Cube Labs 3D Documentation

This folder is the permanent source of truth for Cube Labs 3D.

The documentation was consolidated from 45 Markdown files to 13 on
2026-07-27. Retired filenames are recorded inside their destination documents,
and Git preserves their exact earlier versions. Do not recreate separate daily
logs, changelogs, checkpoints, transfer notes, or one-off continuation prompts.

## Read this first

For every meaningful task:

1. Read [`GOVERNANCE.md`](./GOVERNANCE.md).
2. Read [`CURRENT_STATUS.md`](./CURRENT_STATUS.md).
3. Read the one reference document that owns the affected system.
4. Search [`HISTORY.md`](./HISTORY.md) only when prior evidence is needed.
5. Check [`DECISIONS.md`](./DECISIONS.md) for relevant structural constraints.

Do not read all documentation on every turn. The index below is the routing
contract.

## Canonical documents

| Document | Owns | Read when |
| --- | --- | --- |
| [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) | Production and branch state, health, risks, release gates, immediate priorities | Every meaningful task |
| [`GOVERNANCE.md`](./GOVERNANCE.md) | Constitution, contributor workflow, coding standards, documentation rules, definition of done | Every meaningful task |
| [`ROADMAP.md`](./ROADMAP.md) | High-level roadmap and stable atomic checklist IDs | Planning or changing scope/status |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System boundaries, authentication, security, backup, migration | Platform, data, auth, or structural work |
| [`CUBE-ENGINE.md`](./CUBE-ENGINE.md) | Puzzle engines, rendering, gestures, camera, solver state, detailed 5×5 handoff | Puzzle or solver work |
| [`SOCIAL-AND-MULTIPLAYER.md`](./SOCIAL-AND-MULTIPLAYER.md) | Product vision, friends, challenges, leaderboards, multiplayer | Social/product work |
| [`ADMIN-PORTAL.md`](./ADMIN-PORTAL.md) | Admin architecture, operator guide, ads, affiliates, billing/media operations | Admin or managed-content work |
| [`DECISIONS.md`](./DECISIONS.md) | Append-only ADRs with stable numbers | Structural choices |
| [`HISTORY.md`](./HISTORY.md) | Changelog, daily evidence, checkpoints, handoffs, deploy records | Search by date/feature/branch/commit |

Repository-level files:

- [`../README.md`](../README.md) — project overview, stack, verification, and
  repository map.
- [`../ASSET-CREDITS-AND-LICENSES.md`](../ASSET-CREDITS-AND-LICENSES.md) —
  licensing and attribution.
- [`../design/learn/README.md`](../design/learn/README.md) — local Learn
  prototype instructions.

## Start-and-finish rule

Before editing:

1. verify the active branch, remote PR head, and deployment target;
2. inspect existing shared systems before adding a new one;
3. identify the canonical document that owns the change;
4. distinguish current evidence from historical claims.

Before reporting completion:

1. update the owning reference document;
2. update `CURRENT_STATUS.md` if branch, PR, deployment, health, or priorities
   changed;
3. update `ROADMAP.md` if a gate or checklist item changed;
4. append one evidence entry to `HISTORY.md` for meaningful work;
5. add a numbered entry to `DECISIONS.md` only for a structural decision;
6. record tests, browser/mobile/database verification, known issues, migration
   impact, deployment state, and rollback information.

When a publishing connector recreates a verified local commit, record both the
local and remote SHAs and whether their Git trees match. Never present a local
SHA as the hosted head when they differ.

## Status and history rules

- Current truth belongs in `CURRENT_STATUS.md` and the canonical topic file.
- Stable task IDs and release gates belong in `ROADMAP.md`.
- Historical entries in `HISTORY.md` remain accurate for the time they were
  written; add a superseding entry instead of rewriting them.
- Accepted decisions in `DECISIONS.md` change only when the decision changes.
- A feature is not complete merely because it is coded or deployed; use the
  evidence levels defined in `GOVERNANCE.md`.

When implementation and documentation disagree, resolve the conflict
immediately. Neither may remain silently outdated.
