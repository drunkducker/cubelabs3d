# ADR 0002 — Admin portal foundation: role-based access and audit log

**Date:** 2026-07-22
**Status:** accepted

## Context

Cube Labs needs an owner-operated admin control panel (the approved 9-screen
design: Overview, Ads, Banners & Carousels, Videos, Users, Test Lab,
Leaderboards, Challenges, Content, Security, Audit Log, Settings). The admin
surface is a security boundary and touches every data domain, so the access
model and audit trail must be settled before any section is built.

## Decision

1. **Role model.** A `role` column on `public.profiles`, constrained to
   `user | support | analyst | editor | moderator | admin | owner`. Admin-tier
   roles (everything above `user`) may enter the portal; sections further
   restrict by role.
2. **Owner bootstrap + failsafe.** The first owner is set by email in the
   migration, and the app also treats `ADMIN_OWNER_EMAIL` as owner at runtime,
   so the owner can never be locked out if the bootstrap row is missing.
3. **Server-side gate.** All `/admin` routes resolve access through
   `requireAdmin()` in `app/lib/admin.ts`, which validates the session and role
   on the server. The browser is never the security boundary.
4. **Escalation guard.** A `before update of role` trigger blocks any role
   change unless the acting user is an owner, closing the self-escalation hole
   left by the existing self-update profile policy.
5. **Audit log.** `public.admin_audit_log` records every privileged action
   (actor, role, action, target, previous/new value, reason, success). RLS
   restricts reads/appends to admins; `writeAudit()` is the single write path.

## Consequences

- Requires running `supabase/migrations/20260722_admin_foundation.sql` and
  setting `ADMIN_OWNER_EMAIL` before the portal is usable.
- Global dashboard metrics that cross RLS-protected tables (solves, revenue,
  ad/affiliate clicks) need service-role reads or security-definer aggregates;
  deferred to each section's slice rather than faked.
- Role management UI for non-owner staff is a later slice; for now roles are set
  in SQL.

## Alternatives considered

- **Env email allowlist only** — simplest, but single-tier; rejected because the
  approved design needs Owner/Admin/Moderator/Editor/Support/Analyst.
- **Owner user-ID in env** — secure but single-admin, no staff path; rejected.
