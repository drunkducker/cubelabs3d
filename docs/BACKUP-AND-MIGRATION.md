# Backup and Migration

## Goal

Cube Labs must be able to leave Supabase or split services across providers without rebuilding the product UI.

## Provider independence

Application pages use Cube Labs service functions rather than direct provider calls. Supabase-specific database, authentication, storage, and realtime code stays behind adapters.

Public Cube IDs must not depend on provider-generated user IDs.

## Portable data

Keep core product data in ordinary PostgreSQL tables wherever possible:

- profiles and public Cube IDs;
- solves and statistics;
- friendships and friend requests;
- challenges and attempts;
- leaderboard records;
- achievements and collections;
- notifications;
- ads, placements, campaigns, and carousel slides;
- affiliate products;
- admin roles and audit logs;
- site settings and feature flags.

Schema migrations must be committed to GitHub and remain sufficient to rebuild the database structure.

## Harder migration areas

### Authentication

Export users and supported password hashes when possible. A change to a different authentication system may require staged account migration or password resets. Sessions and JWT signing keys must be handled separately from database rows.

### Storage

Avatars, ad media, tutorial assets, and videos must be copied to the replacement object-storage provider. Store stable asset metadata rather than scattering provider-specific URLs throughout components.

### Realtime

Online presence, live notifications, and live challenges may require a replacement WebSocket or realtime service. Persistent challenge and friendship data remains in PostgreSQL.

## Backup requirements

Maintain:

- scheduled PostgreSQL backups;
- periodic verified restore tests;
- exports of authentication users where supported;
- inventory and backup of storage objects;
- committed database migrations;
- environment-variable inventory without secret values;
- current deployment and DNS notes;
- documented recovery steps.

## Admin migration tools

The admin portal should eventually provide owner-only export tools for:

- users and profiles;
- solves and statistics;
- friendships and challenges;
- leaderboards;
- content and learning material;
- ads and affiliate campaigns;
- settings;
- audit logs.

Exports must be access-controlled and audited.

## Migration options

1. Self-host Supabase while retaining similar APIs.
2. Move PostgreSQL to another managed provider and replace Auth, Storage, and Realtime independently.
3. Keep Supabase Auth while moving high-volume data or media elsewhere.
4. Keep the database while moving images and videos to lower-cost object storage and a CDN.

## Migration procedure

A production migration requires:

1. complete inventory of data and provider features;
2. current backups and successful restore test;
3. migration rehearsal in a non-production environment;
4. data validation counts and checksums where practical;
5. authentication and redirect testing;
6. storage URL migration;
7. security and RLS review;
8. documented cutover and rollback windows;
9. post-cutover monitoring;
10. update to architecture, changelog, and a decision record.

## Prohibited coupling

Do not:

- call Supabase directly from every page;
- use storage-provider URLs as permanent identifiers;
- rely on provider dashboards as the only schema history;
- omit backups of admin content and affiliate campaigns;
- treat a successful export as a verified backup without testing restoration.