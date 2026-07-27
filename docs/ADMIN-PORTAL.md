# Cube Labs 3D Admin Portal

## Implementation status (reviewed 2026-07-27)

The admin platform was originally coded and verified on
`claude/cubelabs-admin-dashboard-4pe35q`, then merged into `main`. PR #8 later
ported the unique admin roadmap model, `/admin/todo` page, navigation item, and
overview widget onto the current canonical history. See ADR 0003 in
`docs/DECISIONS.md`, the security section of `docs/ARCHITECTURE.md`, and
`docs/GOVERNANCE.md`.

The code is merged but production activation is not verified: migrations,
service-role/Stripe configuration, private media bucket, owner bootstrap,
browser role/denial checks, and live RLS verification remain open.

| Route | Purpose | Permission |
| --- | --- | --- |
| `/admin` | Overview metrics + health | `admin.overview.read` |
| `/admin/users` `/admin/users/[id]` | Search, detail, premium, suspend, note, reset, delete | `users.read` (+`users.suspend`, `users.premium.manage`, `users.delete`) |
| `/admin/ads` | Managed campaigns (create/publish/pause/archive) | `ads.read` (+`ads.manage`, `ads.publish`) |
| `/admin/carousels` | Carousels + affiliate products | `ads.read` (+`ads.manage`) |
| `/admin/test-lab` | Grouped test-data generation + cleanup | `test_data.generate` (+`test_data.delete`) |
| `/admin/leaderboards` | Ranking review + suspicious queue + audited corrections | `leaderboards.read` (+`leaderboards.moderate`) |
| `/admin/challenges` | Challenge inspection + moderation | `challenges.read` (+`challenges.moderate`) |
| `/admin/content` | Managed announcements/maintenance (structured) | `content.manage` |
| `/admin/security` | Honest security checks + events | `security.read` |
| `/admin/audit` | Append-only audit viewer | `audit.read` |
| `/admin/settings` | Typed settings + feature flags | `settings.read` (+`settings.manage`, owner) |
| `/admin/exports` | Audited CSV/JSON export + migration readiness | `exports.create` (+`migration.manage`, owner) |
| `/admin/roles` | Assign/deactivate admin roles; capability reference | `roles.manage` (owner) |
| `/admin/media` | Upload/manage images (magic-byte validated, private Storage) | `content.manage` |
| `/admin/billing` | Plans, subscriptions, Stripe status | `users.premium.manage` |
| `/admin/ads/preview` | Live preview of published ad/affiliate content | `ads.read` |

Enforcement: `app/admin/layout.tsx` → `requireAdmin()`; pages → `requirePermission()`;
actions/routes → `authorizeAction()`. Authorization is stored in `admin_members`.
Migration: `supabase/migrations/20260723_admin_platform.sql`. Owner bootstrap:
`select public.bootstrap_owner('you@example.com')`.

Remaining before `[x]`: apply all admin/ad/media/billing migrations in
production, set `SUPABASE_SERVICE_ROLE_KEY` and Stripe keys, create the private
media bucket, bootstrap owner, complete browser + RLS verification, add rate
limiting, finish the carousel slide editor, and complete the content authoring
workflow. Public ad render components already exist; selecting their public
placements remains a product decision.

## Purpose

The admin portal is the owner-operated control center for site content, advertising, users, testing, rankings, challenges, security, analytics, and audit history.

Primary route: `/admin`

## First-version pages

1. Overview
2. Ads and campaigns
3. Banners and carousels
4. Users
5. Test Lab
6. Leaderboards
7. Challenges
8. Content
9. Security
10. Audit Log
11. Settings and migration tools

## Owner dashboard

The overview should show:

- new and active users;
- solves and challenges;
- leaderboard activity;
- ad impressions and clicks;
- affiliate clicks and revenue notes;
- failed login attempts;
- security alerts;
- recent administrative actions;
- deployment and provider health.

## Ads, banners, and carousels

The owner can create and schedule managed content with:

- internal campaign name;
- advertiser or affiliate partner;
- mobile and desktop media;
- headline and supporting copy;
- button text;
- destination and tracking URL;
- placement;
- start and end time;
- active state;
- display priority;
- impression and click totals;
- disclosure text.

Slides must support ordering, preview, activation, scheduling, and placement assignment without code changes.

## User management

Authorized administrators can search and inspect users, view account and platform activity, grant or remove premium access, suspend or restore accounts, request password resets, export user data, and delete user data.

Destructive actions require explicit confirmation and an audit record. Permanent deletion should require a typed confirmation phrase.

## Test Lab

The Test Lab allows the owner to exercise the entire product without physically solving a cube.

It can generate or modify:

- solves by cube type;
- times and move counts;
- solved, DNF, win, and loss states;
- XP, streaks, and achievements;
- friend requests and friendships;
- challenges and challenge outcomes;
- notifications;
- leaderboard entries;
- premium status.

Every generated record must be marked as test data. Test data is excluded from public rankings, production analytics, and real achievements by default.

## Leaderboard control

Admin tools should support suspicious-entry review, impossible-time flags, entry removal, ranking recalculation, seasonal resets, freezing, dispute handling, and explicit exclusion of test users.

Manual overrides must record the original value, new value, reason, acting admin, and timestamp.

## Challenge control

Admins can inspect participants, scramble, cube type, attempts, status, winner, completion times, reports, and test flags. Supported actions include cancel, reopen, force completion, assign winner, mark disputed, or remove invalid test records.

## Security center

The security page should surface:

- failed login and reset attempts;
- rate-limit events;
- privileged actions;
- role changes;
- user deletions;
- Supabase security advisor findings;
- RLS status;
- public tables or endpoints;
- secret/configuration warnings;
- storage-policy issues;
- deployment health.

A security check must verify that admin routes are protected server-side, service-role secrets are not public, test data is isolated, audit logs are active, and exposed tables have correct RLS policies.

## Roles

Recommended roles:

- Owner — full access
- Admin — users, content, ads, moderation
- Moderator — reports, users, and challenges
- Editor — content, ads, banners
- Support — limited user assistance
- Analyst — read-only reporting

The owner is the only role allowed to change owner privileges, critical provider settings, migration exports, or destructive global settings.

## Audit requirements

Every privileged action logs:

- acting user;
- role;
- action;
- target type and identifier;
- date and time;
- previous value;
- new value;
- reason;
- request or IP metadata where appropriate;
- success or failure.

## Security boundary

The admin UI is not the security boundary. Every privileged operation must validate authentication and permission on the server before executing.

## Operator and managed-content reference

The operator guide and ads/affiliates contract are consolidated below so admin
behavior, security boundaries, and day-to-day instructions remain together.

---

## Admin operator guide

> Consolidated from `docs/ADMIN-GUIDE.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/ADMIN-GUIDE.md -->
# Cube Labs 3D — Admin Operator Guide

A plain-language how-to for the site owner and staff. This is the *operator*
manual; the engineering rules live earlier in this document, in the security
section of `ARCHITECTURE.md`, and in `GOVERNANCE.md`.

> **Status note (reviewed 2026-07-27):** The admin portal, public managed-content
> render components, media/billing tools, and reconciled admin roadmap are
> merged into `main`. Production activation is still unverified. Before real
> operation:
> 1. Apply `supabase/migrations/20260723_admin_platform.sql` in Supabase.
> 2. Apply the later ad-rendering and media/billing migrations.
> 3. Set `SUPABASE_SERVICE_ROLE_KEY` and Stripe variables in Vercel
>    (server-only), create the private `admin-media` bucket, and bootstrap the
>    owner.
> 4. Run browser, role-denial, RLS, upload, tracking, and billing verification.
>
> Public `AdSlot`, `AffiliateProductGrid`, and `ManagedCarousel` components now
> exist. Choosing and placing them on public pages is still a product decision.

---

## 1. Getting in

1. Create a normal account on the site (`/auth`) with the email you'll use as owner.
2. In the Supabase SQL editor, run once:
   ```sql
   select public.bootstrap_owner('you@youremail.com');
   ```
3. Sign in and go to `/admin`. As **Owner** you see everything.
4. Add staff later from the roles tools (Owner-only). Roles and what each can do:
   | Role | Can do |
   |---|---|
   | **Owner** | Everything, including roles, dangerous settings, deletion, migration exports |
   | **Admin** | Users, premium, ads, content, moderation, leaderboard review, ordinary settings |
   | **Moderator** | Reports, suspicious results, suspensions, challenge moderation |
   | **Editor** | Content, campaigns, banners, carousels, affiliate products |
   | **Support** | Search users, view limited status |
   | **Analyst** | Read-only analytics/reporting |

---

## 2. Adding an Amazon affiliate product (so it shows what you want)

**Where:** `/admin/carousels` → "New affiliate product".

**Step 1 — get your Amazon affiliate link.**
1. Join **Amazon Associates** (associates.amazon.com). You get a tracking ID like `cubelabs-20`.
2. Find the product on Amazon. Use **SiteStripe** ("Get Link → Text") *or* append your tag to the product URL:
   `https://www.amazon.com/dp/B08XXXXX/?tag=cubelabs-20`
3. That tagged URL is what you paste into **Affiliate URL**.

**Step 2 — fill the form.** Each field controls exactly what the public card shows:
| Field | What it controls |
|---|---|
| Product name | The heading on the card |
| Brand / Partner | Small label under the name |
| Puzzle type | Used to place it next to the right solver |
| Affiliate URL | **Required.** Where the "Buy" button goes (your tagged link). Must be `https`. |
| Image URL | Product photo (`https` only) |
| Price note | e.g. "≈ $12" (display only — don't quote a live price you can't keep current) |
| Description | One or two lines of copy |
| Disclosure | Pre-filled with an affiliate disclosure; keep it |
| Placement | Which slot it targets (e.g. `solver_product_carousel`) |

**Step 3 — publish.** New products are created **inactive** on purpose. Flip it to
active when you're happy with it. (Activation UI toggle is part of the next build
step; today you set `is_active = true` on the row, or use the affiliate manager
toggle once it ships.)

**Amazon rules you must follow (built into the defaults):**
- Keep the disclosure visible. Amazon requires wording like
  *"As an Amazon Associate I earn from qualifying purchases."*
- Don't display a hard-coded price as if it's live — use a "price note".
- Don't email affiliate links or use them in ways Amazon's Operating Agreement bans.

---

## 3. Adding an ad / sponsor campaign

**Where:** `/admin/ads` → "New campaign".

- Campaigns are **database-driven** — changing one never needs a code deploy.
- New campaigns start as **draft** and never show publicly until you **Publish**.
- Fill: name, advertiser, **placement**, headline, button text, **destination URL**
  (`https` only), optional tracking URL, disclosure (defaults to "Sponsored"),
  priority, and a start/end schedule.
- **Placements** (where it can appear): `home_top_banner`, `home_carousel`,
  `solver_top_banner`, `solver_product_carousel`, `learn_mid_banner`,
  `leaderboard_sponsor`, `profile_promo`.
- **Selection rules (automatic):** only *active* campaigns inside their schedule
  window render; the highest **priority** wins; drafts, paused, expired, and
  future campaigns never show. Device targeting (mobile/desktop) is respected.
- Lifecycle buttons: **Publish** (needs the `ads.publish` permission) → **Pause**
  → **Archive**.

---

## 3b. Adding staff (roles)

**Where:** `/admin/roles` (Owner only). Enter the person's account **email**
(they must have signed up first), pick a role, and Save. The page also shows a
capability reference for every role, and it will refuse to deactivate the **last
active Owner** so you can never lock yourself out.

## 3c. Uploading images (media library)

**Where:** `/admin/media`. Upload PNG/JPEG/GIF/WebP up to 5 MB. Files are checked
by their actual content (magic bytes), not the extension, and stored in a private
Supabase Storage bucket named `admin-media` (create it once in the Supabase
dashboard with Public = off). Use these for ad/carousel/tutorial imagery.

## 3d. Premium / no-ads billing

**Where:** `/admin/billing`. Shows your plans, recent subscriptions, and whether
Stripe is configured. To turn it on:
1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel (server-only).
2. In Stripe, create a webhook pointing at `https://yoursite/api/billing/webhook`.
3. Put each plan's Stripe **price ID** on the matching row in `premium_plans`.
Signed-in users buy via `/api/billing/checkout`; the **verified** webhook is what
flips their premium flag — it can never be forged from the browser.

## 4. Day-to-day operations (quick reference)

| Task | Where |
|---|---|
| See platform health at a glance | `/admin` (Overview) |
| Jump anywhere fast | Press **⌘K / Ctrl-K** (command palette) |
| See what needs attention | 🔔 bell in the header |
| Find / manage a user, grant premium, suspend, reset password | `/admin/users` |
| Add or remove staff / change roles | `/admin/roles` |
| Upload and manage images | `/admin/media` |
| Manage premium plans & subscriptions | `/admin/billing` |
| Generate fake solves/challenges to test without a real cube | `/admin/test-lab` |
| Review rankings, flag/exclude cheats, correct a time | `/admin/leaderboards` |
| Inspect / moderate a challenge, resolve a dispute | `/admin/challenges` |
| Preview what visitors see for ads/affiliates | `/admin/ads/preview` |
| Post an announcement or maintenance notice | `/admin/content` + `/admin/settings` |
| Check security status and events | `/admin/security` |
| See who did what (append-only) | `/admin/audit` |
| Toggle features, edit typed settings | `/admin/settings` |
| Export data (CSV/JSON), see migration readiness | `/admin/exports` |

**Two rules to remember as an operator:**
1. **Every change asks for a reason** and is written to the audit log. That's on purpose.
2. **Test data is quarantined** — anything from the Test Lab is marked `is_test`
   and never appears in public rankings, real achievements, or analytics.

---

## 5. Seeing your ads/affiliates on the site

Public rendering now exists. To preview exactly what visitors see, open
**`/admin/ads/preview`** — it shows each placement in mobile and desktop frames
using your live (published) content. Draft items stay invisible there, just like
on the real site.

To place content on an actual page, add the one-line component where you want it:
- Banner: `<AdSlot placement="home_top_banner" />`
- Affiliate grid: `<AffiliateProductGrid placement="solver_product_carousel" />`
- Carousel: `<ManagedCarousel placement="home_carousel" />`

They render nothing when no content is live, and every click is tracked
(impressions/clicks show back in `/admin/ads`).

## 6. What still needs building (honest gaps)

- **Activation toggles** for affiliate products and a carousel slide editor
  (reorder/preview) in the UI. (You can still activate a product by setting
  `is_active = true` on the row today.)
- Deciding **which** public pages get which placements (a product choice — the
  components are ready to drop in).
- **Rate limiting** on sensitive endpoints and admin 2FA.
- Applying the migrations + browser/RLS verification in production.

See `ROADMAP.md` §6/§7 and the security section of `ARCHITECTURE.md` for the
tracked list.
<!-- END CONSOLIDATED SOURCE: docs/ADMIN-GUIDE.md -->

---

## Ads and affiliates

> Consolidated from `docs/ADS-AFFILIATES.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/ADS-AFFILIATES.md -->
# Cube Labs 3D Ads & Affiliates

Authoritative reference for managed advertising, banners, carousels, and
affiliate products. Referenced by `docs/README.md`.

**Status reviewed 2026-07-27:** management, public render components, preview,
and tracking code are merged into `main`. Production migrations, placement
choices, live browser/counter verification, affiliate activation controls, and
the carousel slide editor remain incomplete.

## Principle

Advertising is **database-driven**. Changing campaign content, scheduling, or
placement must **never** require a code deployment. Sponsored and affiliate
content is **always disclosed**.

## Data model (`20260723_admin_platform.sql`)

- `ad_campaigns` — name, advertiser, type, placement, headline/body/button,
  destination + tracking URL, disclosure, mobile/desktop assets, alt text,
  priority, status (`draft|active|paused|archived`), schedule, timezone,
  impression/click/conversion counts, notes.
- `ad_carousels` + `ad_carousel_slides` — ordered slides with per-slide media,
  schedule, priority, disclosure, destination, status.
- `affiliate_products` — partner, name, brand, category, puzzle type, image,
  destination + affiliate URL, price/availability notes, disclosure, placement,
  sort order, active/featured, click count, revenue note.

## Named placements

`home_top_banner`, `home_carousel`, `solver_top_banner`,
`solver_product_carousel`, `learn_mid_banner`, `leaderboard_sponsor`,
`profile_promo`. New placements are added through configuration, not by
hard-coding content into pages.

## Selection logic

`lib/admin/campaign-selection.ts` (pure, unit-tested in
`tests/campaign-selection.test.ts`) selects by placement + schedule window +
status + priority + device. Guarantees:

- Drafts, paused, archived campaigns **never render**.
- Future campaigns do not render early; expired campaigns do not render.
- Higher `priority` wins, then the more recently started campaign.

## Safety & disclosure

- Destination/affiliate URLs are validated to `http/https` only
  (`safeUrl` in `lib/admin/validation.ts`) — `javascript:`/`data:`/`file:` blocked.
- New campaigns and affiliate products are created **inactive/draft** and require
  an explicit publish (publishing a campaign needs `ads.publish`).
- Affiliate products carry a default disclosure ("Affiliate link — we may earn a
  commission.") and campaigns default to "Sponsored".
- Public RLS policies expose only **live** campaigns/carousels/slides and
  **active** affiliate products; drafts are unreachable by the public.

## Rendering (public side — implemented)

Shared server components read live rows via the **anon key** (RLS exposes only
active/in-window rows) and render them anywhere:

- `components/ads/AdSlot.tsx` — `<AdSlot placement="home_top_banner" />` renders the
  highest-priority live campaign (device-aware) with its disclosure; returns null
  when nothing is live, so it never leaves an empty box.
- `components/ads/AffiliateProductCard.tsx` — `<AffiliateProductGrid placement="…" />`
  renders active affiliate products; each card links with `rel="sponsored nofollow"`.
- `components/ads/ManagedCarousel.tsx` — `<ManagedCarousel placement="…" />` renders
  active carousel slides as a scroll-snap strip.
- `lib/ads/public.ts` — the anon read layer (fails soft to null/empty).

Owners preview exactly what visitors see at **`/admin/ads/preview`** (mobile +
desktop frames per placement). Dropping these components into specific public
pages (homepage, solver, leaderboard) is a per-page placement decision, done by
adding the one-line component where wanted.

## Tracking

Impression/click counts are incremented through narrow **SECURITY DEFINER** RPCs
(`bump_ad_impression`, `bump_ad_click`, `bump_affiliate_click` in
`20260724_ad_rendering.sql`) called from `/api/ads/track` via a fire-and-forget
`navigator.sendBeacon`. The RPCs can only increment one counter on a live row —
they grant no other access — so public tracking needs no elevated client
permission. No unnecessary personal data is collected.
<!-- END CONSOLIDATED SOURCE: docs/ADS-AFFILIATES.md -->
