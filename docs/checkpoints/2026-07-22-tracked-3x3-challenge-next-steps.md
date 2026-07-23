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
- Manual complete-time entries are marked in `replay_data` as `is_test_data` and `manual_time_override`.
- A signed-in user can save a solve result through `/api/solves`.
- A signed-in user can send a challenge to another exact Cube Labs account match through `/api/challenges`.
- `/challenge/[id]` opens the sent scramble for the sender or recipient.
- `/profile/challenges` shows a basic signed-in challenge inbox.

## What must be added before public rankings

- Add explicit database columns for `is_test_data`, `manual_time_override`, assistance flags, validation status, sender move count, recipient move count, and recipient time.
- Add a versioned, renderer-independent puzzle-state contract instead of relying only on scramble text.
- Validate the official start state server-side when a challenge begins.
- Validate submitted results server-side before they become ranking candidates.
- Separate assisted and unassisted results.
- Exclude admin/test/manual override records from public leaderboards by default.
- Add suspicious-result detection and owner/admin review.
- Add audit logs for leaderboard corrections, manual overrides, challenge deletion, and admin test results.
- Build the real `getLeaderboard()` service using verified solve rows or ranking snapshots.

## What must be added for sending challenges

- Replace exact text recipient lookup with a real friend/account picker.
- Handle duplicate display names safely.
- Add friend requests, blocking, reporting, and privacy controls.
- Add rate limits for challenge creation and invites.
- Add copy-link, native share, QR, email, and text-message sends.
- Add guest challenge attempts only after public share-token access rules are designed.
- Add expiration, delete/decline, rematch, and abuse controls.
- Show sender and recipient comparison cards after both attempts are complete.

## What must be tested next

1. Deploy the branch and open `/leaderboard/3x3/play` on a phone.
2. Tap homepage Daily Challenge -> Start Challenge and confirm it reaches the same route.
3. Load the official scramble and confirm the cube starts a timed tracked attempt.
4. Solve normally and save a result while signed in.
5. Enter a manual complete time and confirm it saves as test/admin metadata.
6. Use two accounts to send and accept a challenge.
7. Confirm `/profile/challenges` shows sent and received challenge rows.
8. Confirm `/challenge/[id]` rejects accounts that are not the sender or recipient.
9. Confirm production has run `supabase/migrations/20260722_cube_id_platform.sql`; the `challenges` table depends on it.
10. Re-run `npm run build` after any schema/API follow-up.

## Code-comment note

The challenge service and cube replay metadata now include explanatory comments for:

- why UI code calls API routes instead of Supabase directly;
- why recipient lookup is exact-match only in this prototype;
- why manual times are test/admin metadata;
- why private challenge pages are sender/recipient only;
- why recipient result summaries need explicit schema columns before production comparison cards.
