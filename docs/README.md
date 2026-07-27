# Cube Labs 3D Documentation

This folder is the permanent source of truth for Cube Labs 3D.

All contributors, including AI agents, must read this index, `CONSTITUTION.md`, `ARCHITECTURE.md`, `DEPENDENCY-GRAPHS.md`, and `AI-INSTRUCTIONS.md` before making structural or architectural changes.

## Current project control

- [CURRENT_STATUS.md](./CURRENT_STATUS.md) — single current-state summary and active priorities
- [PROJECT-HEALTH.md](./PROJECT-HEALTH.md) — evidence-backed health dashboard, risks, and directional completion
- [ROADMAP.md](./ROADMAP.md) — canonical master checklist and release gates
- [DAILY-LOG.md](./DAILY-LOG.md) — daily verification, completed work, blockers, and next actions
- [CHANGELOG.md](./CHANGELOG.md) — meaningful shipped project changes
- [checkpoints](./checkpoints/) — preserved historical snapshots and handoff records

## Core documents

- [CONSTITUTION.md](./CONSTITUTION.md) — non-negotiable project rules
- [VISION.md](./VISION.md) — product purpose and long-term direction
- [ARCHITECTURE.md](./ARCHITECTURE.md) — authoritative application structure and system boundaries
- [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md) — cross-referenced visual dependency, data-flow, state-ownership, security, testing, and documentation maps
- [CUBE-ENGINE.md](./CUBE-ENGINE.md) — puzzle-engine boundaries, recovered branch findings, and challenge-state target
- [SOCIAL-AND-MULTIPLAYER.md](./SOCIAL-AND-MULTIPLAYER.md) — consolidated challenges, friends, leaderboards, safety, and multiplayer plan
- [AI-INSTRUCTIONS.md](./AI-INSTRUCTIONS.md) — required workflow for AI contributors
- [SOFTWARE-ENGINEERING-BEST-PRACTICES.md](./SOFTWARE-ENGINEERING-BEST-PRACTICES.md) — textbook software-engineering principles and TypeScript/React examples
- [CODING-STANDARDS.md](./CODING-STANDARDS.md) — Cube Labs implementation, hierarchy, consistency, proof, and commenting standards
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Cube ID, login, sessions, and recovery
- [ADMIN-PORTAL.md](./ADMIN-PORTAL.md) — administration, testing, security, and content controls
- [ADMIN-GUIDE.md](./ADMIN-GUIDE.md) — plain-language operator how-to (affiliate links, ads, day-to-day tasks)
- [ADS-AFFILIATES.md](./ADS-AFFILIATES.md) — managed ad slots, banners, carousels, and affiliate links
- [SECURITY.md](./SECURITY.md) — security requirements and review checklist
- [BACKUP-AND-MIGRATION.md](./BACKUP-AND-MIGRATION.md) — provider independence, exports, and Supabase migration
- [decisions](./decisions/) — architecture decision records

## How the documents depend on each other

```text
CONSTITUTION + VISION
        ↓
ARCHITECTURE + DEPENDENCY-GRAPHS
        ↓
SOFTWARE-ENGINEERING-BEST-PRACTICES + CODING-STANDARDS
        ↓
specialized feature documents and ADRs
        ↓
code, migrations, and tests
        ↓
CURRENT_STATUS + ROADMAP + PROJECT-HEALTH + DAILY-LOG + CHANGELOG
```

`DEPENDENCY-GRAPHS.md` is the visual map. Specialized documents remain authoritative for their subjects. `CURRENT_STATUS.md` remains authoritative for what is true now. Historical checkpoints and handoffs are evidence, not competing current architecture.

## Required documentation workflow

A feature is not complete until all applicable items are finished:

1. Code and database changes are implemented.
2. The relevant permanent document is updated.
3. `DEPENDENCY-GRAPHS.md` is updated when dependencies, data flow, state ownership, providers, engines, route families, or security boundaries change.
4. `ROADMAP.md` reflects the verified status.
5. `DAILY-LOG.md` records what was checked, completed, blocked, and next.
6. `PROJECT-HEALTH.md` is updated when a major area changes readiness or risk.
7. `CHANGELOG.md` is updated for meaningful shipped changes.
8. A decision record is added when architecture, data ownership, security, public behavior, providers, or project structure changes.
9. Branch, commit, deployment, testing, known issues, and rollback notes are logged.
10. Any old checkpoint document is either preserved as history or folded into the permanent documentation without losing important information.

## Structure enforcement

The documented structure must be followed. Contributors may not create competing documentation systems, bypass the data layer, hard-code managed content, or reorganize major folders without approval and a recorded decision.

When implementation and documentation disagree, the conflict must be resolved immediately. Neither is allowed to remain silently outdated. Generated dependency evidence describes what code currently does; the architecture and dependency handbook describe what the code is allowed to do. A mismatch is a defect to investigate.
