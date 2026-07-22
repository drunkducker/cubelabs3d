# AI Instructions for Cube Labs 3D

Every AI agent working on this repository must follow these instructions before changing code.

> These are the **rules**. For the **build method** that keeps agents effective across long sessions and hand-offs — bounded session-start reads, single-session vertical slices, write-through memory, and the per-slice checklist — read [`AI-BUILD-PLAN.md`](./AI-BUILD-PLAN.md).

## Required reading

Read, in order:

1. `docs/README.md`
2. `docs/CONSTITUTION.md`
3. `docs/ARCHITECTURE.md`
4. the feature-specific document related to the task
5. recent entries in `docs/CHANGELOG.md`
6. relevant files in `docs/decisions/`

## Before coding

- Confirm the active branch and deployment target.
- Inspect existing shared components before creating new ones.
- Identify which permanent documents must change with the feature.
- Protect approved layouts and unrelated pages.
- Confirm whether the task affects authentication, security, user data, admin privileges, ads, rankings, migrations, or provider independence.

## Implementation rules

- Design and validate mobile first.
- Preserve the existing hero cube and approved homepage layout unless the owner explicitly requests a redesign.
- Reuse shared components and shared engine behavior.
- Keep provider-specific code out of visual page components.
- Never hard-code managed advertisements or affiliate campaigns.
- Never expose service-role keys, SMTP credentials, private tokens, or privileged APIs.
- Enforce authorization server-side.
- Clearly mark generated test data and exclude it from public results.
- Add useful comments explaining non-obvious decisions and behavior.

## Documentation and logging

Every meaningful change must be logged in the documented structure. Update the relevant feature document and `CHANGELOG.md`. Create an architecture decision record when the change affects:

- project structure;
- system boundaries;
- data ownership;
- database schema strategy;
- provider choice;
- security model;
- public identifiers;
- ranking rules;
- managed advertising behavior;
- test-data isolation;
- approved UX conventions.

The change log entry must include the date, author/agent, branch, purpose, affected systems, tests, deployment status, known issues, and rollback notes when applicable.

## Completion reporting

Do not say a change is complete unless it has been verified. Distinguish clearly between:

- planned;
- coded;
- committed;
- merged;
- deployed;
- tested on desktop;
- tested on a real or emulated mobile device;
- blocked.

## Prohibited behavior

An AI agent may not:

- silently reorganize the repository;
- replace approved designs while fixing unrelated code;
- duplicate an existing shared system;
- bypass the application data layer;
- place test records into real leaderboards;
- weaken RLS or admin authorization to fix an error;
- claim background work is occurring;
- claim a commit or deployment exists without checking.

## Handoff requirement

At the end of a substantial task, record:

- what changed;
- current branch and commit;
- deployment URL or deployment status;
- tests completed;
- remaining issues;
- next recommended action;
- documentation files updated.