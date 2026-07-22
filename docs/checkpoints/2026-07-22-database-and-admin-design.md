# Checkpoint — Database & Admin Control Panel Design (2026-07-22)

**Status:** historical record. Folded into the permanent documents below; do not
treat this file as the current source of truth.

- Admin portal detail → [`../ADMIN-PORTAL.md`](../ADMIN-PORTAL.md) (already a superset: 11 sections, roles, audit spec, security center)
- Data-layer philosophy and core data domains → [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Test-data isolation rule → Constitution §9, plus the now-pinned `is_test = true` convention in `ARCHITECTURE.md` and `ADMIN-PORTAL.md`

The only net-new detail from this design that was not already in the permanent
docs was the explicit test marker column name `is_test = true`, which has now
been captured. Everything else here restates existing permanent documentation.

---

## Original submitted design (preserved verbatim)

### Purpose

This document defines the long-term design for the Cube Labs database and Admin Control Panel.

### Database Philosophy

- UI talks to a Cube Labs data layer.
- Data layer talks to the database provider.
- Keep the system portable so Supabase can be replaced later.

### Core Data

- Users
- Cube IDs
- Profiles
- Solve History
- Friends
- Challenges
- Leaderboards
- Achievements
- Notifications
- Ads
- Audit Logs

### Admin Portal

Route: `/admin`

Sections: Dashboard, User Manager, Test Lab, Ad Manager, Leaderboard Manager, Challenge Manager, Security Center, Content Manager, Audit Log

### Test Lab

Allow admins to create test solves, wins, losses, XP, achievements, friend requests, and challenges. Test records must be marked `is_test = true` and excluded from production rankings.

### Rules

- Mobile first.
- No hard-coded ads.
- Reusable components.
- Follow documented architecture.
- Documentation is part of the definition of done.
- Significant admin actions are audited.
- Keep database provider-independent where practical.
