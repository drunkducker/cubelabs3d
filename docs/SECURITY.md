# Cube Labs 3D Security

This document is the authoritative security reference for the admin platform and
the surrounding application. It is referenced by `docs/README.md`.

## Security boundary

**The browser is never the security boundary.** Every protected page and every
privileged operation independently validates on the server:

1. Read + validate the server-side session (HTTP-only cookie → Supabase Auth).
2. Confirm an **active, unexpired** `admin_members` row (`requireAdmin`).
3. Verify the required permission server-side (`requirePermission` / `authorizeAction`).
4. Validate and normalize all input.
5. Perform the operation through a protected server action or route handler.
6. Write an audit record (values redacted).
7. Return only the minimum necessary data.
8. **Fail closed** when auth, config, or permission checks are unavailable.

Never trusted from the browser: role, permission, account ownership, user id,
premium state, test-data state, leaderboard eligibility, previous DB value,
campaign approval state, challenge result, audit identity.

## Service-role usage

- The Supabase **service-role key** bypasses RLS and is used **only** in
  server-only code (`lib/admin/service-client.ts`, guarded by `import "server-only"`)
  **after** `requireAdmin`/`requirePermission` has passed.
- It is read from `SUPABASE_SERVICE_ROLE_KEY` — **never** `NEXT_PUBLIC_*`.
- `isAdminConfigured()` fails closed (throws `AdminConfigError`) when the key is
  absent, so the admin surface never silently degrades to an unprivileged path.

## Roles & permissions

Centralized in `lib/admin/permissions.ts`. Roles: `owner`, `admin`, `moderator`,
`editor`, `support`, `analyst`. `permissionsForRole` is derived from
`hasPermission` so the listed grant can never diverge from the effective grant.

Owner-only (`OWNER_ONLY`): `roles.manage`, `users.delete`, `leaderboards.reset`,
`settings.manage`, `migration.manage`, `test_data.display_mode`. These are
denied to every non-owner role even if a future edit mislists them.

## Audit & redaction

- `admin_audit_log` is **append-only** — no UPDATE/DELETE policy exists, so even
  a leaked user token cannot tamper with history.
- `lib/admin/redact.ts` strips sensitive keys (password, token, secret,
  service-role, authorization, cookie, refresh/access token, recovery, otp,
  smtp, credential) and JWT-looking strings before any insert. This is unit
  tested (`tests/redact.test.ts`).
- Never logged: passwords, access/refresh tokens, SMTP credentials, service-role
  keys, full recovery links, unnecessary private auth metadata.

## RLS model

Every admin table has RLS **enabled with no permissive anon/user policy** — deny
by default. Privileged reads/writes go through the service role. Public read
policies exist **only** where a public page legitimately needs data (live
campaigns/carousels/slides, active affiliate products, public non-secret
settings). Authenticated users may only *insert* a moderation report; they
cannot read the queue.

### RLS verification checklist

Run in the Supabase SQL editor / advisor after applying `20260723_admin_platform.sql`:

- [ ] `admin_members`, `admin_audit_log`, `admin_security_events`, `site_settings`,
      `feature_flags`, `test_runs`, `ad_campaigns`, `ad_carousels`,
      `ad_carousel_slides`, `affiliate_products`, `moderation_reports` all report
      **RLS enabled** in the Supabase advisor.
- [ ] An anonymous client cannot `select` from `admin_members` or `admin_audit_log`.
- [ ] An ordinary authenticated client cannot read the audit log or security events.
- [ ] An ordinary authenticated client cannot update/delete an audit row.
- [ ] Public leaderboard queries (`is_test=false & leaderboard_eligible=true`)
      exclude every test-run solve.
- [ ] `select public.bootstrap_owner('you@example.com')` creates exactly one owner.
- [ ] Supabase Auth **leaked-password protection is enabled** (dashboard setting).

## Automated vs manual verification

The Security Center (`/admin/security`) labels each finding **Passed / Warning /
Failed / Unavailable / Manual check required** and never claims automated
verification where only a manual check was possible. RLS-enabled state, storage
policies, and the leaked-password setting are **manual** because they cannot be
introspected through the REST API.

## Hardening applied

- `force-dynamic` + `no-store` on all admin routes (never statically cached).
- Origin check (`assertSameOrigin`) on privileged mutations (defense in depth on
  top of Next's server-action CSRF protection).
- Input size limits and safe-URL validation (`http/https` only) block
  `javascript:`, `data:`, `file:` destinations.
- Typed-phrase confirmation + mandatory reason on destructive actions.

## Known open items

- Rate limiting on sensitive endpoints is **not yet implemented** (tracked in
  ROADMAP §8). Origin checks and size limits are in place.
- Production RLS/advisor verification must be run and recorded once the migration
  is applied (see checklist above).
