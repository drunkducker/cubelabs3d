# Cube Labs 3D Authentication

Authoritative reference for Cube ID login, sessions, recovery, and how the admin
platform reuses this system. Referenced by `docs/README.md`.

## Model

- **Provider:** Supabase Auth (email/password today; OAuth gateway parked at
  `/auth/provider/*`).
- **Sessions:** HTTP-only cookies `cubelabs_access_token` + `cubelabs_refresh_token`
  set by server actions (`app/auth/actions.ts`, `app/lib/supabase-rest.ts`).
  `secure` in production, `sameSite=lax`, `path=/`.
- **Server actions** (`signIn`, `signUp`, `requestPasswordReset`, `signOut`) are
  the only writers of auth cookies. The browser never sees tokens in JS.
- **Profile identity** (`display_name`, `cube_tag`, `public_slug`) is generated
  by the `ensure_profile_identity` trigger (see `20260722_cube_id_platform.sql`).

## Email links

`getSiteOrigin()` prefers `NEXT_PUBLIC_SITE_URL`, then the real request origin,
then a production fallback — never a single hard-coded preview URL. Every origin
used must be listed in Supabase Auth → URL Configuration → Redirect URLs.

## Admin authentication

The admin platform **reuses** this session, it does not add a competing system:

1. `lib/admin/auth.ts#resolveAdmin` reads `cubelabs_access_token`.
2. It validates the token against `GET /auth/v1/user` with the user's own token.
3. It looks up an **active, unexpired** `admin_members` row via the service role.
4. `requireAdmin` (server components) redirects failures; `authorizeAction`
   (server actions / routes) throws so a security event can be recorded.

Authorization lives in `admin_members` — **never** in editable profile fields or
client-controlled user metadata.

### Owner bootstrap

After the first owner account exists, run once in the Supabase SQL editor:

```sql
select public.bootstrap_owner('you@example.com');
```

This inserts/updates a single `owner` row in `admin_members`. Additional admins
are added by the Owner through `roles.manage` (owner-only).

## Support-initiated recovery

`/admin/users/[id]` can request a password-reset email for a user
(`requestPasswordResetFor`). The action logs the target and action only — **never**
the recovery link or token.

## Open items

- Confirm `20260722_cube_id_platform.sql` + `20260722_cube_labs_mail_foundation.sql`
  are applied in production (ROADMAP §2).
- AWS SES production delivery verification + runbook (ROADMAP §2).
- Real Google/Apple/GitHub OAuth wiring.
- Session invalidation on suspend is best-effort via Auth ban; full token
  revocation depends on Supabase support and is not yet verified.
