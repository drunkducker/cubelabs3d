# Cube Labs 3D Coding Standards

Authoritative implementation + commenting standards. Referenced by
`docs/README.md`.

## Architecture boundaries

```
Admin UI / reusable admin components   (components/admin/*, app/admin/**)
        ↓
Protected server actions / route handlers   (app/admin/actions/*, app/api/admin/*)
        ↓
Cube Labs administration services   (lib/admin/*)
        ↓
Provider adapter (service role)   (lib/admin/service-client.ts)
        ↓
Supabase / PostgreSQL / Auth / Storage
```

- **Visual components never perform privileged Supabase operations directly.**
  They call server actions, which call services, which call the provider adapter.
- Provider-specific calls stay behind the service/adapter boundary so a future
  migration away from Supabase touches one layer, not the UI.
- `import "server-only"` guards every module that must never reach the client
  (`service-client`, `auth`, `audit`, `overview`, `users`, `security`,
  `settings`, `list`, and the action files).

## Server actions & routes

Every privileged mutation follows the same shape:

1. `assertSameOrigin()`
2. `authorizeAction(permission)` (throws on failure)
3. validate + normalize input (`lib/admin/validation.ts`)
4. operate via the service role
5. `writeAudit(...)` (redacted)
6. `revalidatePath(...)`
7. redirect with a safe `message` / `error` query param (never leak internals)

`handleActionError` maps errors to user-safe messages and records a security
event for authorization failures.

## Validation

- All input is validated server-side; the browser is never trusted for shape,
  size, or safety.
- URLs go through `safeUrl` (http/https only). Text is length-capped.
- Enumerated values go through `oneOf`; integers through `clampInt`.

## Migrations

Additive and idempotent (`create table if not exists`, `add column if not exists`,
`drop policy if exists` before `create policy`). Enable RLS, add policies,
add indexes, preserve existing rows, comment non-obvious security decisions,
include rollback guidance. Never rewrite existing gameplay rows.

## Comments

Match the surrounding terse style. Explain **why** for non-obvious security and
architecture decisions (see the header comments in `20260723_admin_platform.sql`
and `lib/admin/*`). Do not over-comment mechanical code.

## Styling

Mobile-first. Tailwind utilities reading from the CSS custom properties in
`app/globals.css`. Primary interactive controls are ≥44×44px. Shared admin form
control: the `.input` class. Status is never communicated by color alone (text
label + pill).

## Testing

Pure logic (permissions, redaction, validation, campaign selection) is unit
tested with Vitest under `tests/` and must stay green (`npm test`). A green build
is `[~]`, not `[x]` — real behavior must be confirmed where a user can see it.

Puzzle changes should test each layer they can break:

- engine invariants, inverse/round-trip behavior, and solved detection;
- renderer membership and accumulated transforms across repeated algorithms;
- gesture candidate stability after earlier moves;
- serialized save/result/challenge payloads and assistance blocking;
- browser/mobile behavior for touch direction, layout, native share/clipboard,
  account persistence, and two-account challenge paths.

Do not use a logic-only test to claim a Three.js interaction is verified, or a
browser preview build to claim production database/RLS behavior is verified.

## Do not

- Weaken RLS to make a feature work.
- Hard-code managed ads, leaderboards, roles, or admin behavior.
- Store authorization in client-controlled fields.
- Scatter provider-specific URLs/keys through components.
- Claim something is deployed or verified without checking it.
