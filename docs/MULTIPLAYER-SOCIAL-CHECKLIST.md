# Cube Labs 3D — Multiplayer & Social Build Checklist

**Started:** July 21, 2026 (America/New_York)

## Product goal

Create a social challenge loop where a player can scramble or partially solve a cube, send the exact state to a friend, compare results, build a profile, and return for leaderboards and rematches.

## Release 1 — Asynchronous challenges

- [x] Define challenge, attempt, profile, and leaderboard domain types.
- [x] Add a first `/community` interface prototype.
- [x] Show challenge states for “Beat my time” and “I bet you can’t solve it.”
- [x] Show profile/avatar, basic statistics, friends, and leaderboard concepts.
- [ ] Add a Community entry point to the main site navigation.
- [ ] Connect “Create challenge” to the playable cube engine.
- [ ] Serialize the exact cube state, cube size, scramble, camera-independent move history, and rule settings.
- [ ] Generate a secure challenge ID and shareable `/challenge/[id]` route.
- [ ] Add guest play so recipients can attempt a challenge without registering.
- [ ] Record completion time, move count, undo count, hints, device/control type, and result status.
- [ ] Add sender result comparison and instant rematch.
- [ ] Add copy-link and native share support.
- [ ] Add email challenge delivery.
- [ ] Add expiration and privacy controls.

## Accounts and profiles

- [ ] Choose the production identity provider.
- [ ] Add email login.
- [ ] Add Google login.
- [ ] Preserve guest attempts when a guest creates an account.
- [ ] Add unique username and display name.
- [ ] Add built-in Cube Labs avatars.
- [ ] Add public, friends-only, and private profile settings.
- [ ] Add profile statistics by cube size.
- [ ] Add achievement badges and streaks.
- [ ] Add account deletion and data export.

## Friends and safety

- [ ] Add friend requests, accept, decline, remove, block, and report actions.
- [ ] Add direct friend challenges.
- [ ] Add notification preferences.
- [ ] Add username and avatar moderation safeguards.
- [ ] Add rate limits for invitations and email sending.
- [ ] Prevent challenge-link enumeration.

## Leaderboards

- [ ] Add challenge-specific leaderboards.
- [ ] Add friends, daily, weekly, monthly, and all-time filters.
- [ ] Separate cube sizes.
- [ ] Separate assisted and unassisted results.
- [ ] Mark undo, hint, solver, and practice usage.
- [ ] Add fastest time and fewest moves categories.
- [ ] Add daily official scrambles.
- [ ] Add anti-cheat validation and suspicious-result review.

## Release 2 — Live private matches

- [ ] Add private lobby and room codes.
- [ ] Add ready state and synchronized countdown.
- [ ] Issue the same scramble from the server when the match begins.
- [ ] Broadcast progress without revealing exact moves.
- [ ] Handle disconnects, reconnects, forfeits, and ties.
- [ ] Save match results and replays.

## Release 3 — Public matchmaking

- [ ] Add casual and ranked queues.
- [ ] Add skill rating by cube size.
- [ ] Match by cube size, rating, device/control type, and assistance rules.
- [ ] Add seasons and seasonal rewards.
- [ ] Add clubs, groups, and private tournaments.

## Technical foundation

- [x] Keep social domain types independent from the renderer.
- [ ] Select and configure the production database.
- [ ] Create Drizzle tables and migrations.
- [ ] Add server-side challenge validation.
- [ ] Add authenticated API/server actions.
- [ ] Add transactional attempt submission.
- [ ] Add replay storage strategy.
- [ ] Add email provider and templates.
- [ ] Add analytics for create → share → open → attempt → signup → rematch.
- [ ] Add automated tests for cube-state fidelity and leaderboard ranking.

## Definition of the first usable milestone

A player can open any supported playable cube, create a challenge from its exact current state, share a link, and a friend can play that identical state as a guest. Both players can then see who solved it, the time, move count, assistance flags, and a rematch button.
