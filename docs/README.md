# Cube Labs 3D Documentation

This folder is the permanent source of truth for Cube Labs 3D.

All contributors, including AI agents, must read this index, `CONSTITUTION.md`, `ARCHITECTURE.md`, and `AI-INSTRUCTIONS.md` before making structural or architectural changes.

**Full Markdown audit:** On 2026-07-27, all 44 pre-existing tracked Markdown
files were read against the repository, PR, test, and deployment evidence. A
new Skewb PR #9 checkpoint was then added. Current documents were reconciled;
dated checkpoints and deploy triggers were preserved as historical evidence.

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
- [ARCHITECTURE.md](./ARCHITECTURE.md) — application structure and system boundaries
- [CUBE-ENGINE.md](./CUBE-ENGINE.md) — puzzle-engine boundaries, recovered branch findings, and challenge-state target
- [SOCIAL-AND-MULTIPLAYER.md](./SOCIAL-AND-MULTIPLAYER.md) — consolidated challenges, friends, leaderboards, safety, and multiplayer plan
- [AI-INSTRUCTIONS.md](./AI-INSTRUCTIONS.md) — required workflow for AI contributors
- [CODING-STANDARDS.md](./CODING-STANDARDS.md) — implementation and commenting standards
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Cube ID, login, sessions, and recovery
- [ADMIN-PORTAL.md](./ADMIN-PORTAL.md) — administration, testing, security, and content controls
- [ADMIN-GUIDE.md](./ADMIN-GUIDE.md) — plain-language operator how-to (affiliate links, ads, day-to-day tasks)
- [ADS-AFFILIATES.md](./ADS-AFFILIATES.md) — managed ad slots, banners, carousels, and affiliate links
- [SECURITY.md](./SECURITY.md) — security requirements and review checklist
- [BACKUP-AND-MIGRATION.md](./BACKUP-AND-MIGRATION.md) — provider independence, exports, and Supabase migration
- [decisions](./decisions/) — architecture decision records

## Required documentation workflow

A feature is not complete until all applicable items are finished:

1. Code and database changes are implemented.
2. The relevant permanent document is updated.
3. `ROADMAP.md` reflects the verified status.
4. `DAILY-LOG.md` records what was checked, completed, blocked, and next.
5. `PROJECT-HEALTH.md` is updated when a major area changes readiness or risk.
6. `CHANGELOG.md` is updated for meaningful shipped changes.
7. A decision record is added when architecture, data ownership, security, public behavior, providers, or project structure changes.
8. Branch, commit, deployment, testing, known issues, and rollback notes are logged.
9. Any old checkpoint document is either preserved as history or folded into the permanent documentation without losing important information.

## Start-and-finish rule

Every implementation session must:

1. read the required documents and the relevant feature notes before editing;
2. name the permanent documents that will need an update;
3. verify the active branch, remote PR head, and deployment target;
4. update the notes before reporting the implementation complete;
5. update branch/PR, commit, tests, deployment, mobile/browser status, known
   issues, and rollback notes again after every push, deployment, or merge.

When a publishing connector recreates a verified local commit, record both the
local commit and the remote commit and state whether their Git trees match.
Never present a local commit SHA as the hosted branch head when they differ.

## Current versus historical Markdown

- `CURRENT_STATUS.md`, `ROADMAP.md`, `MASTER-CHECKLIST.md`,
  `PROJECT-HEALTH.md`, and the permanent feature documents describe current
  truth.
- `DAILY-LOG.md` and `CHANGELOG.md` are append-only evidence trails; newer
  entries supersede older intermediate states without deleting them.
- `checkpoints/`, `deploy-triggers/`, and dated root handoffs preserve the facts
  known at that time. They must carry a historical/supersession pointer when
  they could be mistaken for current instructions.
- Authoritative rules and accepted ADRs change only when the underlying
  decision changes, not merely to stamp a review date.

## Structure enforcement

The documented structure must be followed. Contributors may not create competing documentation systems, bypass the data layer, hard-code managed content, or reorganize major folders without approval and a recorded decision.

When implementation and documentation disagree, the conflict must be resolved immediately. Neither is allowed to remain silently outdated.
