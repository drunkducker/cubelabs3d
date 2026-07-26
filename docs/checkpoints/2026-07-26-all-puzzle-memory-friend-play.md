# All-Puzzle Memory and Friend Play Rollout

**Date:** 2026-07-26  
**Repository:** `drunkducker/cubelabs3d`  
**Branch merged:** `gpt/all-puzzle-memory-friend-play-20260726`  
**PR:** #6  
**Merge commit:** `7ce293b2cf81c2c4fd730c2adb527178ab48a2de`

## What changed

Cube Labs now exposes a shared **Save & Friend Play** panel across supported puzzle and solver routes:

- 3×3
- 4×4
- 5×5
- supported NxN routes
- Pyraminx
- Kilominx

The panel:

- detects the current puzzle type from the route;
- reads the visible scramble where available;
- accepts a manually entered start state when a puzzle does not expose one in the page markup;
- saves signed-in puzzle memory through `/api/solver-memory`;
- lists prior puzzle memories for the active `puzzle_type`;
- sends the exact puzzle type and scramble to a friend through `/api/challenges`;
- gives signed-out visitors a clear sign-in path;
- copies and dispatches the selected scramble using the shared `cube-labs:load-scramble` browser event;
- supports generic challenge-attempt submission for non-3×3 puzzle routes.

`/challenge/[id]` is now puzzle-aware. The existing embedded tracked 3×3 runner remains in place. Other puzzle types open their matching solver route with the private challenge ID and exact official scramble carried in the query string.

## Verification

- GitHub PR #6 was mergeable.
- Vercel preview build for branch head `3ba5149` completed successfully.
- No production browser/two-account verification was performed in this session.

## Remaining verification and hardening

- Test save/list/load for every puzzle while signed in.
- Test guest sign-in prompts.
- Run two-account send/open/submit flows for every puzzle type.
- Confirm database rows in `solver_memories`, `scrambles`, `challenges`, `solve_results`, `scramble_attempts`, and `challenge_attempts`.
- Add engine-native listeners for `cube-labs:load-scramble` anywhere automatic replay is not yet supported. Until then, the shared panel copies and visibly preserves the exact scramble so it can be applied manually.
- Add puzzle-specific notation validators before treating arbitrary user-entered notation as fully trusted.

## Rollback

Revert merge commit `7ce293b2cf81c2c4fd730c2adb527178ab48a2de`. The change adds UI and routing only; it does not add or remove database tables.
