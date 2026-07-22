# Session Handoff — 2026-07-22

**Phase: PAGE BUILDING.** The platform foundation, admin portal, and monetization
system are in place; work has shifted to building out the public pages and the
remaining admin sections.

- **Working branch:** `claude/working-status-mumm9x` (HEAD `c0addeb`, ~11 commits ahead of `main`)
- **Canonical:** `main` = live production (`cubelabs3d.vercel.app`)
- **Build:** passing, 32 routes
- **Not yet promoted to `main`, not yet verified live** — see "Before promoting" below.

## What this session built (all on the working branch)

- **Auth & identity:** homepage-matched `/auth` sign-in, working **password reset** (with a reachable "Forgot your password?" entry), Cube ID dashboard, Cube Labs Mail. Fixed reset/confirm email links to use the real site origin.
- **Admin portal** (`/admin`): server-side role gate (`app/lib/admin.ts`), 7-role model + owner failsafe (`ADMIN_OWNER_EMAIL`), audit log, and a **dashboard with live metrics** (security-definer RPC — no service key).
- **Monetization managers:** **Ads** (`/admin/ads`), **Videos/YouTube** (`/admin/videos`), **Banners & Carousels/affiliate slides** (`/admin/banners`) — all CRUD, role-gated, audited.
- **Public render layer:** `AdSlot`, `PromoCarousel`, `FeaturedVideos` components (public-read, by placement) + `/api/ads/[id]/click` tracking + `/partners` showcase page.
- **Public pages / layout:** `/solver/3x3` and `/solver/4x4` now render the managed layout (partner banner, gear carousel, tutorials); **new `/learn` page** built from the mockup.
- **Provider independence:** `app/lib/data` adapter layer (Supabase isolated in one file), `scripts/export-data.sh` backups, and `docs/PORTABILITY-AND-EXIT.md` exit plan.
- **Governance:** `docs/AI-BUILD-PLAN.md` (context-rot-resistant method + tracking rules), branch registry in `CURRENT_STATUS.md`, ADRs 0002 (admin) and 0003 (provider abstraction).

## Before promoting to `main` (owner actions)

1. **Run all 8 migrations** in the Supabase SQL editor (order as listed):
   `cube_id_platform`, `cube_labs_mail_foundation`, `admin_foundation`,
   `ads_manager`, `admin_metrics`, `videos_manager`, `promo_slides`, `ad_tracking`
   (all prefixed `20260722_`).
2. **Set env vars** in Vercel (all environments): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://cubelabs3d.vercel.app`,
   `ADMIN_OWNER_EMAIL=dleshrader@gmail.com`, `DATA_PROVIDER=supabase`.
3. **Supabase → Auth → URL Configuration → Redirect URLs:** add `https://cubelabs3d.vercel.app/**`.
4. Then log in as the owner, verify `/admin` + `/learn` + `/partners`, and fast-forward `main`.

## Known issues / honest status

- **4×4 solver is correct but slow** (~20s desktop; can exceed the mobile timeout; 116–160-move solutions). Stopgap shipped (120s timeout + live counter). Real fix = reduction performance (ROADMAP §3). Same slowness affects 5×5. The 4×4 code is identical on `main` and `claude/more-cubelabs-yuom1x`.
- **Deferred:** ad **impression** tracking (clicks done), per-item **edit** forms (create/toggle/delete done).
- **Managed slots render nothing until content is published** — expected, not a bug.

## Next up (page building)

1. **Test Lab** (admin) — generate `is_test` solves/rankings so the platform looks alive.
2. **Public Leaderboards page** (third mockup) — completes the Solvers/Learn/Leaderboards trio.
3. Then: User Manager, Challenge/Leaderboard moderation, Security Center, Settings; impression tracking; individual Learn guides.

## Key docs

`CURRENT_STATUS.md` (state + branch registry) · `ROADMAP.md` (checklist + tracking rules) ·
`AI-BUILD-PLAN.md` (how to build without context rot) · `PORTABILITY-AND-EXIT.md` ·
`ADMIN-PORTAL.md` · `CHANGELOG.md` (dated detail) · `decisions/` (ADRs).
