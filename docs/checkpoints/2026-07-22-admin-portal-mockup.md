# Checkpoint — Admin Portal visual design (2026-07-22)

**Status:** approved design reference for the admin portal build. The owner
submitted a full 9-screen mockup of the Cube Lab 3D admin control panel.

## Screens

1. **Admin Dashboard** — metric tiles (New Users, Active Users, Solves,
   Challenges, Ad Clicks, Revenue), Solves-Over-Time chart, Top Cubes Solved,
   Recent Users, Security Alerts.
2. **Ads Manager** — table of ads with Placement, Type, Status (Active /
   Scheduled / Paused / Expired), Impressions, Clicks, CTR, row actions; "+ New Ad".
3. **Banners & Carousels** — carousel slide manager with slide detail editor
   (title, subtitle, link URL incl. affiliate `?ref=` links, mobile/desktop
   image, active toggle); example uses SpeedCubeShop affiliate slides.
4. **User Management** — searchable user table (Cube ID, email, role, status:
   Active/Suspended/Test Account/Banned), export, per-row actions.
5. **Test Lab** — generate test solves/challenges/friends/leaderboard entries;
   "This is a test entry" flag → `is_test = true`; live test preview.
6. **Leaderboard Management** — top rankings with Suspicious / Removed / Test
   tabs, min valid time, auto-flag thresholds, recalculate rankings.
7. **Challenge Management** — challenge table (challenger, opponent, cube,
   status, result), bulk actions.
8. **Security Center** — Failed Logins, Suspicious IPs, Rate-Limit hits, recent
   security events, security checklist (RLS, admin routes protected, service
   role secured, audit logging, rate limiting), "Run Security Scan".
9. **Audit Log** — time / admin / action / target / details / IP table with
   filters and export.

Shared chrome: left sidebar (Overview, Ads, Banners & Carousels, Users, Test
Lab, Leaderboards, Challenges, Content, Security, Audit Log, Settings) and an
account chip showing the Owner.

## Owner emphasis (2026-07-22)

Ads, YouTube videos, and affiliate links are important to the site and are a
priority part of the portal. "Videos (YouTube)" is added as a managed-content
section alongside Ads and Banners/Carousels.

## Build status

First slice implemented on `claude/working-status-mumm9x`: server-side gate,
role model, audit log, protected shell with this navigation, Dashboard skeleton,
and the live Audit Log page. Remaining screens are built section by section.
