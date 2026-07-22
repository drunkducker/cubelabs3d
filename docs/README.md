# Cube Labs 3D Documentation

This folder is the permanent source of truth for Cube Labs 3D.

All contributors, including AI agents, must read this index, `CONSTITUTION.md`, `ARCHITECTURE.md`, and `AI-INSTRUCTIONS.md` before making structural or architectural changes.

## Core documents

- [CONSTITUTION.md](./CONSTITUTION.md) — non-negotiable project rules
- [VISION.md](./VISION.md) — product purpose and long-term direction
- [ROADMAP.md](./ROADMAP.md) — current milestones and sequencing
- [ARCHITECTURE.md](./ARCHITECTURE.md) — application structure and system boundaries
- [AI-INSTRUCTIONS.md](./AI-INSTRUCTIONS.md) — required workflow for AI contributors
- [CODING-STANDARDS.md](./CODING-STANDARDS.md) — implementation and commenting standards
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Cube ID, login, sessions, and recovery
- [ADMIN-PORTAL.md](./ADMIN-PORTAL.md) — administration, testing, security, and content controls
- [ADS-AFFILIATES.md](./ADS-AFFILIATES.md) — managed ad slots, banners, carousels, and affiliate links
- [SECURITY.md](./SECURITY.md) — security requirements and review checklist
- [BACKUP-AND-MIGRATION.md](./BACKUP-AND-MIGRATION.md) — provider independence, exports, and Supabase migration
- [CHANGELOG.md](./CHANGELOG.md) — meaningful project changes
- [decisions](./decisions/) — architecture decision records

## Required documentation workflow

A feature is not complete until all applicable items are finished:

1. Code and database changes are implemented.
2. The relevant permanent document is updated.
3. `CHANGELOG.md` is updated.
4. A decision record is added when architecture, data ownership, security, public behavior, or project structure changes.
5. Branch, commit, deployment, testing, known issues, and rollback notes are logged.
6. Any old checkpoint document is either preserved as history or folded into the permanent documentation without losing important information.

## Structure enforcement

The documented structure must be followed. Contributors may not create competing documentation systems, bypass the data layer, hard-code managed content, or reorganize major folders without approval and a recorded decision.

When implementation and documentation disagree, the conflict must be resolved immediately. Neither is allowed to remain silently outdated.