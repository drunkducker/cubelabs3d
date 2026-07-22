# Cube Labs 3D Admin Portal

## Purpose

The admin portal is the owner-operated control center for site content, advertising, users, testing, rankings, challenges, security, analytics, and audit history.

Primary route: `/admin`

## First-version pages

1. Overview
2. Ads and campaigns
3. Banners and carousels
4. Users
5. Test Lab
6. Leaderboards
7. Challenges
8. Content
9. Security
10. Audit Log
11. Settings and migration tools

## Owner dashboard

The overview should show:

- new and active users;
- solves and challenges;
- leaderboard activity;
- ad impressions and clicks;
- affiliate clicks and revenue notes;
- failed login attempts;
- security alerts;
- recent administrative actions;
- deployment and provider health.

## Ads, banners, and carousels

The owner can create and schedule managed content with:

- internal campaign name;
- advertiser or affiliate partner;
- mobile and desktop media;
- headline and supporting copy;
- button text;
- destination and tracking URL;
- placement;
- start and end time;
- active state;
- display priority;
- impression and click totals;
- disclosure text.

Slides must support ordering, preview, activation, scheduling, and placement assignment without code changes.

## User management

Authorized administrators can search and inspect users, view account and platform activity, grant or remove premium access, suspend or restore accounts, request password resets, export user data, and delete user data.

Destructive actions require explicit confirmation and an audit record. Permanent deletion should require a typed confirmation phrase.

## Test Lab

The Test Lab allows the owner to exercise the entire product without physically solving a cube.

It can generate or modify:

- solves by cube type;
- times and move counts;
- solved, DNF, win, and loss states;
- XP, streaks, and achievements;
- friend requests and friendships;
- challenges and challenge outcomes;
- notifications;
- leaderboard entries;
- premium status.

Every generated record must be marked as test data using the canonical `is_test = true` column. Test data is excluded from public rankings, production analytics, and real achievements by default.

## Leaderboard control

Admin tools should support suspicious-entry review, impossible-time flags, entry removal, ranking recalculation, seasonal resets, freezing, dispute handling, and explicit exclusion of test users.

Manual overrides must record the original value, new value, reason, acting admin, and timestamp.

## Challenge control

Admins can inspect participants, scramble, cube type, attempts, status, winner, completion times, reports, and test flags. Supported actions include cancel, reopen, force completion, assign winner, mark disputed, or remove invalid test records.

## Security center

The security page should surface:

- failed login and reset attempts;
- rate-limit events;
- privileged actions;
- role changes;
- user deletions;
- Supabase security advisor findings;
- RLS status;
- public tables or endpoints;
- secret/configuration warnings;
- storage-policy issues;
- deployment health.

A security check must verify that admin routes are protected server-side, service-role secrets are not public, test data is isolated, audit logs are active, and exposed tables have correct RLS policies.

## Roles

Recommended roles:

- Owner — full access
- Admin — users, content, ads, moderation
- Moderator — reports, users, and challenges
- Editor — content, ads, banners
- Support — limited user assistance
- Analyst — read-only reporting

The owner is the only role allowed to change owner privileges, critical provider settings, migration exports, or destructive global settings.

## Audit requirements

Every privileged action logs:

- acting user;
- role;
- action;
- target type and identifier;
- date and time;
- previous value;
- new value;
- reason;
- request or IP metadata where appropriate;
- success or failure.

## Security boundary

The admin UI is not the security boundary. Every privileged operation must validate authentication and permission on the server before executing.