# Tracked 3x3 Leaderboard Challenge — Next Steps

Date: 2026-07-22  
Branch: `claude/home-page-html-rebuild-q7qomi`  
Status: coded prototype, build verified, not production-trusted competition yet

## What works now

- `/leaderboard/3x3/play` launches the mobile playable 3x3 daily challenge.
- `/play/3x3` exists for the shared Play navigation.
- The homepage Daily Challenge button and leaderboard CTA open the tracked 3x3 flow.
- The 3x3 cube records elapsed time, move count, touch moves, button moves, undo uses, scramble, and replay metadata.
- The owner/test complete-time box can force a finish time for QA.
- Players can load a chosen 3x3 scramble, then save or send that exact scramble.
- Admin/test controls can override reported moves, undo uses, touch moves, button moves, and solved status for QA.
- Manual complete-time entries are marked in `replay_data` as `is_test_data` and `manual_time_override`.
- Manual tracking overrides are marked in `replay_data` as reported metrics plus actual metrics.
- A signed-in user can save a solve result through `/api/solves`.
- A signed-in user can send a challenge to another exact Cube Labs account match through `/api/challenges`.
- `/challenge/[id]` opens the sent scramble for the sender or recipient.
- `/profile/challenges` shows a basic signed-in challenge inbox.

## What must be added before public rankings

- Add explicit database columns for `is_test_data`, `manual_time_override`, assistance flags, validation status, sender move count, recipient move count, and recipient time.
- Add a `scrambles` / `scramble_attempts` database design so player-created scrambles can be saved once, reused, ranked, and attached to challenges.
- Add a versioned, renderer-independent puzzle-state contract instead of relying only on scramble text.
- Validate the official start state server-side when a challenge begins.
- Validate submitted results server-side before they become ranking candidates.
- Separate assisted and unassisted results.
- Exclude admin/test/manual override records from public leaderboards by default.
- Add suspicious-result detection and owner/admin review.
- Add audit logs for leaderboard corrections, manual overrides, challenge deletion, and admin test results.
- Build the real `getLeaderboard()` service using verified solve rows or ranking snapshots.
- Rank scrambles separately from players: attempts, completion rate, best time, average time, fewest moves, assisted/unassisted, and suspected-test data exclusion.

## What must be added for sending challenges

- Replace exact text recipient lookup with a real friend/account picker.
- Handle duplicate display names safely.
- Add friend requests, blocking, reporting, and privacy controls.
- Add rate limits for challenge creation and invites.
- Add copy-link, native share, QR, email, and text-message sends.
- Add guest challenge attempts only after public share-token access rules are designed.
- Add expiration, delete/decline, rematch, and abuse controls.
- Show sender and recipient comparison cards after both attempts are complete.

## What must be added for solver memory

- Add a `solver_snapshots` or `saved_cube_states` table for logged-in users.
- Store puzzle type, state schema version, facelets or renderer-independent state, scramble, generated solution, current playback step, notes, and created/updated time.
- Define paid-user retention rules: free users may get limited recent memory; paid users get deeper history, cross-device sync, and named folders.
- Add privacy/export/delete support because saved cube states are user data.
- Add solver-page UI for "resume last cube," "recent solver states," and "save this solve setup."
- Add an application service such as `getSolverMemory()` and `saveSolverSnapshot()` rather than direct Supabase calls from solver components.

## What must be tested next

1. Deploy the branch and open `/leaderboard/3x3/play` on a phone.
2. Tap homepage Daily Challenge -> Start Challenge and confirm it reaches the same route.
3. Load the official scramble and confirm the cube starts a timed tracked attempt.
4. Solve normally and save a result while signed in.
5. Enter a manual complete time and confirm it saves as test/admin metadata.
6. Load a chosen scramble and confirm the sent challenge uses that exact scramble.
7. Enter admin/test move and undo overrides and confirm replay metadata stores both actual and reported metrics.
8. Use two accounts to send and accept a challenge.
9. Confirm `/profile/challenges` shows sent and received challenge rows.
10. Confirm `/challenge/[id]` rejects accounts that are not the sender or recipient.
11. Confirm production has run `supabase/migrations/20260722_cube_id_platform.sql`; the `challenges` table depends on it.
12. Re-run `npm run build` after any schema/API follow-up.

## Code-comment note

The challenge service and cube replay metadata now include explanatory comments for:

- why UI code calls API routes instead of Supabase directly;
- why recipient lookup is exact-match only in this prototype;
- why manual times are test/admin metadata;
- why private challenge pages are sender/recipient only;
- why recipient result summaries need explicit schema columns before production comparison cards.
- why chosen scrambles, ranked scramble libraries, and solver memory need explicit database tables before they become production features.
