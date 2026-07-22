# ADR 0003 — Provider abstraction (reduce sole dependence on Supabase)

**Date:** 2026-07-22
**Status:** accepted

## Context

The app used Supabase + Vercel to launch fast, but 11 feature files called
Supabase's REST/auth endpoints directly with PostgREST-specific query syntax.
Despite Constitution §7 ("database independence"), the code was in practice
solely dependent on Supabase — leaving would mean rewriting every feature. The
owner wants an easy exit if pricing, limits, or control ever require it.

## Decision

Introduce a provider-neutral data layer and route feature code through it:

- `app/lib/data/types.ts` — `CubeLabsData` contract (auth, profiles, ads,
  audit, optional email), plus provider-neutral domain types.
- `app/lib/data/index.ts` — `getData()` selects the active provider via
  `DATA_PROVIDER` (default `supabase`).
- `app/lib/data/providers/supabase.ts` — the only file containing Supabase REST
  paths and query syntax.

Supporting the exit:

- `scripts/export-data.sh` — portable `pg_dump` export restorable into any Postgres.
- `docs/PORTABILITY-AND-EXIT.md` — replacement stacks (self-hosted Supabase
  first, then Postgres+PostgREST+GoTrue, Nhost, Pocketbase, Appwrite), email
  (SES/SMTP/Resend), S3-compatible storage, and an exit checklist.
- `email` slot on the contract for moving mail off Supabase.

## Consequences

- Swapping backends = one new provider file + `DATA_PROVIDER` change; no page or
  action rewrites.
- Migration is incremental: the admin domain is routed through the layer now;
  auth actions, profile, mail, and solves API follow in later slices (tracked in
  ROADMAP §2). Until then those paths remain Supabase-coupled — stated honestly,
  not hidden.
- `app/lib/supabase-rest.ts` stays as the low-level transport the Supabase
  adapter uses.

## Alternatives considered

- **Keep calling Supabase directly** — fastest short term, but the exit cost
  grows with every feature; rejected.
- **Migrate everything at once** — high risk of destabilizing working auth/
  profile flows; rejected in favor of incremental migration behind the seam.
