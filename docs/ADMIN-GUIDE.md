# Cube Labs 3D — Admin Operator Guide

A plain-language how-to for the site owner and staff. This is the *operator*
manual; the *engineering* rules live in `ADMIN-PORTAL.md`, `SECURITY.md`,
`ADS-AFFILIATES.md`, and `CODING-STANDARDS.md`.

> **Status note (2026-07-23):** The admin portal is built and enforces security
> server-side. Two things are needed before it runs against real data, and one
> feature is still to build:
> 1. Apply `supabase/migrations/20260723_admin_platform.sql` in Supabase.
> 2. Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel (server-only) and bootstrap the owner.
> 3. **Public display of ads/affiliates is not wired yet** — you can *enter* a
>    product/campaign, but the public pages don't render it until the `AdSlot` /
>    `AffiliateProductCard` components are built (see "What still needs building").

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

See `ROADMAP.md` §6/§7 and `SECURITY.md` for the tracked list.
