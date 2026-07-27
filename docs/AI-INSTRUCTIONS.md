# AI Instructions for Cube Labs 3D

Every AI agent working on this repository must follow these instructions before changing code.

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
- Confirm the current remote PR head separately from the local commit; app-based
  publishing may preserve the tree while assigning a different commit SHA.
- Inspect existing shared components before creating new ones.
- Identify which permanent documents must change with the feature.
- Read the current status, relevant handoff/engine notes, and latest daily-log
  entry before diagnosing a reported regression.
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

Do not postpone documentation until a later conversation. Before saying a task
is complete:

- update `CURRENT_STATUS.md` when the active head, PR, production baseline, or
  priorities changed;
- append `DAILY-LOG.md` with checked/completed/unverified evidence;
- append `CHANGELOG.md` for meaningful product or architecture changes;
- update `ROADMAP.md` and `MASTER-CHECKLIST.md` without promoting branch-only
  work to `[x]`;
- update the feature-specific permanent document and any root engine/handoff
  note another session is likely to read;
- add a dated checkpoint for a major feature handoff, merge, migration, or
  recovery point;
- update the same records again after a push, deployment result, or merge.

Historical entries stay intact. Add a new superseding entry instead of
rewriting what was accurately known at the earlier time.

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

If local and hosted commits differ, include both SHAs and the verified tree
relationship. If documentation is still uncommitted, say so explicitly.
