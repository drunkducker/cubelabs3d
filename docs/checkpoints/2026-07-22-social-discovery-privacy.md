# Cube Labs 3D — Social Discovery and Privacy Queue

**Date:** 2026-07-22  
**Branch:** `gpt/mobile-profile-page-20260722`  
**Status:** build-verified locally; production migration and browser QA still required

## What changed

- Added smart people suggestions to `app/lib/profile-service.ts`.
- Added `/profile/friends` search for public Cube Tags, usernames, slugs, and display names.
- Added friend actions: send request, accept incoming request, decline incoming request, cancel/remove friendship.
- Added `/u/[slug]` public player profile pages.
- Added People To Challenge on `/profile`.
- Added `recipient` query-param prefill to `/leaderboard/3x3/play`.
- Added Data Export and Close Account controls to `/profile/settings`.
- Added migration `supabase/migrations/20260722_social_discovery_privacy_requests.sql`.

## Suggestion inputs

Suggestions are intentionally Cube Labs-specific rather than contact scraping:

- public profile visibility;
- favorite puzzle match;
- ranked scramble overlap;
- nearby best solve time;
- tracked solve volume;
- country match only when the current user allows location display.

Accepted, pending, and existing friendship rows are excluded from the suggestion list.

## Privacy and deletion flow

The settings danger zone now queues account requests in `account_data_requests`.

- `Email My Data Export` queues an `export` request and marks `privacy_export_requested_at`.
- `Close Account` requires typing `DELETE MY CUBE ID`, queues `close_account` with `export_before_delete = true`, switches the profile to private, hides location/collection/activity, and marks `account_closure_requested_at`.

Important boundary: this does not fully delete the Supabase Auth user yet. Final email delivery and deletion/de-identification need a server-only privacy worker with admin/service-role access.

## Migration notes

Run after:

- `20260722_cube_id_platform.sql`
- `20260722_cube_labs_mail_foundation.sql`
- `20260722_tracked_scrambles_solver_memory.sql`

The migration adds:

- `profiles.account_status`
- `profiles.privacy_export_requested_at`
- `profiles.account_closure_requested_at`
- `account_data_requests`
- privacy mail templates
- social-discovery indexes
- public-profile read/search RLS
- tighter friendship RLS policies

The Supabase CLI was not installed in this workspace, so this migration was created manually rather than through `supabase migration new`.

## Verification

Local build passed:

```bash
HOME=/tmp NPM_CONFIG_CACHE=/tmp/npm-cache npm run build
```

Build output includes the new dynamic route:

- `/u/[slug]`

## Still needed

- Apply the migration in Supabase.
- Browser-test with two signed-in accounts:
  - search public user;
  - send request;
  - accept request;
  - challenge from suggestion/friend card;
  - view `/u/[slug]`;
  - queue export;
  - queue close account.
- Add friend block/report.
- Add rate limits for search, friend requests, challenge creation, and privacy requests.
- Build the privacy worker that generates the export, emails it, then deletes or de-identifies data and deletes the Supabase Auth user.
