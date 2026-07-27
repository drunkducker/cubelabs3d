# Historical Checkpoints

This directory is for dated project snapshots and handoff records.

Checkpoint files preserve what was believed, planned, or completed at a particular time. They are historical evidence, not the current source of truth. Current status belongs in [`../CURRENT_STATUS.md`](../CURRENT_STATUS.md), and the active checklist belongs in [`../ROADMAP.md`](../ROADMAP.md).

## Checkpoints in this directory

Newest first. This list is the index of files that actually exist here; keep it in sync when a checkpoint is added or archived.

- `2026-07-26-all-puzzle-memory-friend-play.md` — all-puzzle Save & Friend Play rollout (PR #6).
- `2026-07-26-kilominx-merge.md` — Kilominx merge (PR #4) and current-main status.
- `2026-07-23-news-arcade-home-links.md` — homepage-linked News, My Arcade, and Learn route pass with remaining content/admin wiring.
- `2026-07-22-3x3-scrambles-solver-memory-handoff.md` — handoff for tracked 3x3 play, chosen scrambles, Supabase scramble ranking, solver memory, and remaining verification work.
- `2026-07-22-5x5-solver-continuation-prompt.md` — archived 5×5 solver continuation prompt (the live reference is `5X5_SOLVER_HANDOFF.md` at the repository root).
- `2026-07-22-leaderboard-transfer.md` — mobile leaderboard visual-prototype transfer handoff.
- `2026-07-22-deploy-triggers.md` — consolidated one-shot Vercel deploy-trigger history.
- `2026-07-22-password-reset-preview.md` — password-reset preview deployment checkpoint.
- `2026-07-22-mobile-profile-layout.md` — profile dashboard layout branch checkpoint, approved-layout wiring pass, connected profile subroutes, and remaining production QA items.
- `2026-07-22-social-discovery-privacy.md` — profile social discovery, public player profiles, friend actions, challenge prefill, and export/close-account queue handoff.
- `2026-07-22-site-health-context-rot-review.md` — health review documenting clickable route gaps, preview-data risks, Supabase proof steps, context-rot reductions, and the highest-value next fixes.
- `2026-07-22-tracked-3x3-challenge-next-steps.md` — tracked 3x3 leaderboard challenge prototype handoff and production gap list.

When adding a checkpoint, use a clear dated name (`YYYY-MM-DD-topic.md`) and add a one-line entry above.

## Archive rules

1. Never silently delete historical checkpoints that contain unique decisions, fixes, branch details, or lessons learned.
2. Fold lasting rules and current facts into permanent documents.
3. Mark superseded information clearly.
4. Do not use a checkpoint to override `CURRENT_STATUS.md`, `ROADMAP.md`, architecture documents, ADRs, or the changelog.
5. New daily work belongs in `DAILY-LOG.md`; create a separate checkpoint only for a meaningful release, handoff, migration, or recovery point.
