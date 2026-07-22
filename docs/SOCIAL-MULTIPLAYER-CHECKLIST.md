# Cube Labs 3D Social Multiplayer Checklist

## Foundation

- [x] Create dedicated social feature branch.
- [x] Define renderer-independent challenge, attempt, profile, and leaderboard types.
- [x] Build responsive Community prototype.
- [x] Add working local challenge creation route.
- [x] Add dynamic challenge acceptance and rematch route.
- [x] Add browser persistence for prototype challenges.
- [x] Connect Community calls-to-action to the challenge builder.
- [ ] Run production build and lint validation.

## Cube Engine Integration

- [ ] Export a versioned serialized 3×3 cube state from `CubeGame`.
- [ ] Separate scramble history from player move history.
- [ ] Capture elapsed time, move count, solved status, undo use, and auto-solve use.
- [ ] Add a Create Challenge button directly to the playable cube controls.
- [ ] Load a challenge scramble or exact state automatically on `/play/3x3?challenge=<id>`.
- [ ] Lock the official starting state once a challenge attempt begins.
- [ ] Record completion and compare it with the sender's result.
- [ ] Add challenge result and rematch screens.

## Accounts and Profiles

- [ ] Choose authentication provider.
- [ ] Add email login.
- [ ] Add Google login.
- [ ] Preserve guest play without forced registration.
- [ ] Add unique username and display name.
- [ ] Add built-in avatar selection.
- [ ] Add profile visibility controls.
- [ ] Add public statistics and achievement badges.

## Cloud Persistence and Sharing

- [ ] Create users, profiles, friendships, challenges, attempts, and leaderboard tables.
- [ ] Replace browser-only challenge storage with database persistence.
- [ ] Use server-generated challenge IDs and protected cube-state payloads.
- [ ] Add cross-device share links.
- [ ] Add copy-link, email, text, QR, and native-share actions.
- [ ] Add expiration and deletion controls.

## Friends and Leaderboards

- [ ] Add friend requests, acceptance, removal, blocking, and reporting.
- [ ] Add friend-only, weekly, monthly, and all-time boards.
- [ ] Separate assisted and unassisted results.
- [ ] Track mobile/touch and desktop/mouse categories.
- [ ] Add daily scramble leaderboards.
- [ ] Add challenge win/loss and rematch history.

## Live Multiplayer

- [ ] Build private room codes and lobby readiness.
- [ ] Issue the same server-authoritative scramble at match start.
- [ ] Show opponent progress without exposing exact moves.
- [ ] Add casual and ranked matchmaking.
- [ ] Add reconnect and abandoned-match rules.
- [ ] Add anti-cheat and result verification.

## Safety and Moderation

- [ ] Restrict usernames and challenge messages.
- [ ] Add block and report controls.
- [ ] Add rate limits for friend requests and challenge messages.
- [ ] Add privacy defaults suitable for younger players.
- [ ] Add account deletion and data export.
