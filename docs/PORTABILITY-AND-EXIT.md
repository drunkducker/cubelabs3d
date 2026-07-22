# Portability & Exit Plan

**Goal:** use Supabase + Vercel to move fast now, but be able to **leave
quickly and cheaply** if pricing, limits, or control ever demand it. This
document is the "how do I get out" plan and the design that makes it real.

## The one-line reason this is easy

**Supabase is open source.** The fastest exit is not a rewrite — it is
**self-hosting the exact same stack** (Postgres + PostgREST + GoTrue + Storage +
Realtime). The app's API calls are identical; you change URLs and keys and keep
going. Everything below makes even a *different* backend a swap, not a rebuild.

## 1. The adapter layer (isolation) — built

Feature code never calls Supabase directly. It calls the provider-neutral data
layer:

- Contract: `app/lib/data/types.ts` (`CubeLabsData`)
- Active provider seam: `app/lib/data/index.ts` (`getData()`, chosen by `DATA_PROVIDER`)
- Supabase implementation (the only Supabase-specific file): `app/lib/data/providers/supabase.ts`

To move providers: add one sibling file implementing `CubeLabsData`, register it
in `index.ts`, set `DATA_PROVIDER`. No page or action changes.

**Migration status:** admin domain (auth check, roles, ads, audit, player count)
is routed through the layer. Remaining direct Supabase calls to migrate next:
`app/auth/actions.ts`, `app/profile/page.tsx`, `app/profile/mail/page.tsx`,
`app/api/solves/route.ts`, `app/auth/reset/page.tsx`. Track in ROADMAP §2.

## 2. Your data, always (backups) — built

`scripts/export-data.sh` produces a timestamped `pg_dump` of your `public`
schema (structure + data) that restores into **any** PostgreSQL. Run it on a
schedule and keep a copy off-provider.

```bash
SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres" \
  ./scripts/export-data.sh
```

Automate it later (GitHub Action or cron) so a fresh export always exists.

## 3. Email off Supabase (reduce the stickiest lock-in)

Auth/reset and Cube Labs Mail should send through a provider you own. The
`CubeLabsData.email` slot exists for this. Drop-in options (all standard SMTP or
simple API):

- **AWS SES** — cheapest at scale; already referenced in project docs.
- **Resend** / **Postmark** — fast setup, great deliverability.
- Any SMTP server.

Supabase Auth also lets you point its own recovery emails at custom SMTP, so you
can move delivery without moving auth.

## 4. Open-source replacement stacks

Ranked by how easy the exit is:

| Option | What it is | Exit effort |
| --- | --- | --- |
| **Self-hosted Supabase** | The same open-source stack, your servers/Docker | Lowest — same API, change URL/keys |
| **Postgres + PostgREST + GoTrue + MinIO** | Supabase's components, unbundled | Low — one new adapter, same concepts |
| **Nhost** | Open-source Postgres + Hasura + Auth backend | Medium — new adapter |
| **Pocketbase** | Single-binary SQLite backend (auth+db+storage) | Medium — great for small/simple, new adapter |
| **Appwrite** | Open-source app backend (auth/db/storage/functions) | Medium — new adapter |

Storage/CDN independence: use **S3-compatible** storage (AWS S3, Cloudflare R2,
MinIO) so files move with a bucket copy. Hosting: the Next.js app runs on Vercel
today but is portable to any Node host or a container.

## 5. Exit checklist (if you ever need to leave)

1. Run `scripts/export-data.sh`; verify the dump restores into a scratch Postgres.
2. Stand up the target (start with self-hosted Supabase for the smallest change).
3. Restore the dump; recreate storage buckets; migrate users (GoTrue export or
   provider user-import).
4. Add/point the provider adapter (`DATA_PROVIDER`) and update env keys/URLs.
5. Repoint email SMTP and any object-storage/CDN URLs.
6. Smoke-test auth, profile, solves, and `/admin` against the new backend.

## Principles this preserves

- Constitution §7 (database independence): no provider calls in visual
  components; provider logic isolated; migrations committed to the repo.
- See also `BACKUP-AND-MIGRATION.md` and ADR `0003-provider-abstraction.md`.
