# Historical Checkpoints

This directory is for dated project snapshots and handoff records.

Checkpoint files preserve what was believed, planned, or completed at a particular time. They are historical evidence, not the current source of truth. Current status belongs in [`../CURRENT_STATUS.md`](../CURRENT_STATUS.md), and the active checklist belongs in [`../ROADMAP.md`](../ROADMAP.md).

## Known historical records to preserve

- `cubelabs3d-project-status.md` — July 20, 2026 early project and business checkpoint; now substantially outdated.
- `PROJECT_STATUS_2026-07-21_0246.md` — July 21, 2026 at 02:46 checkpoint.
- `CURRENT-SITE-STATE-2026-07-22.md` — July 22, 2026 branch, auth, and production-baseline checkpoint.
- `2026-07-22-database-and-admin-design.md` — July 22, 2026 database & admin control-panel design submission; folded into `ARCHITECTURE.md` and `ADMIN-PORTAL.md`.
- `2026-07-22-admin-portal-mockup.md` — July 22, 2026 approved 9-screen admin portal visual design; reference for the admin build.

When these files are added to the repository, place copies in this directory using clear dated names, for example:

- `2026-07-20-project-status.md`
- `2026-07-21-0246-project-status.md`
- `2026-07-22-0131-current-site-state.md`

## Archive rules

1. Never silently delete historical checkpoints that contain unique decisions, fixes, branch details, or lessons learned.
2. Fold lasting rules and current facts into permanent documents.
3. Mark superseded information clearly.
4. Do not use a checkpoint to override `CURRENT_STATUS.md`, `ROADMAP.md`, architecture documents, ADRs, or the changelog.
5. New daily work belongs in `DAILY-LOG.md`; create a separate checkpoint only for a meaningful release, handoff, migration, or recovery point.
