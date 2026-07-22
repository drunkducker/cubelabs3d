# ADR 0001: Permanent Documentation Governance

- Status: accepted
- Date: 2026-07-22
- Decision owners: Cube Labs project owner and contributing agents

## Context

Cube Labs accumulated useful checkpoint and progress Markdown files while the product evolved quickly. Those files preserve history, but important rules and decisions were spread across documents and conversations. This made it easier for future contributors to miss requirements, duplicate systems, redesign approved pages, or fail to log structural changes.

## Decision

Create `/docs` as the permanent source of truth.

All contributors must follow the documented structure. Every meaningful change must update the correct permanent document and changelog. Architectural or structural changes require a decision record.

Older checkpoint files remain historical evidence. Their durable information must be folded into permanent topic documents or referenced through an archive index rather than silently discarded.

## Required change record

Meaningful changes log:

- date and time;
- author or agent;
- branch and commit;
- purpose;
- affected systems and files;
- tests;
- deployment status;
- known issues;
- migration impact;
- rollback plan where applicable.

## Consequences

### Benefits

- New contributors have one starting point.
- Project rules become enforceable and reviewable.
- Architecture drift is easier to detect.
- Provider migration, security, admin behavior, and approved UX remain documented.
- AI handoffs become more reliable.

### Costs

- Features require documentation work in addition to code.
- Old notes must be reviewed and consolidated over time.
- Contributors must pause and record structural decisions rather than making silent changes.

## Alternatives rejected

- Continue using only timestamped progress notes: preserves history but does not provide a reliable current source of truth.
- Keep rules only in chat: inaccessible to repository contributors and easy to lose.
- Maintain documentation outside the repository: risks version drift from the code.

## Rollback

The files can technically be reverted, but returning to scattered undocumented decisions is not recommended.