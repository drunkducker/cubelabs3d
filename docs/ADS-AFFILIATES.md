# Cube Labs 3D Ads & Affiliates

Authoritative reference for managed advertising, banners, carousels, and
affiliate products. Referenced by `docs/README.md`.

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

## Rendering (public side — follow-up)

Public pages should render shared components (`AdSlot`, `ManagedCarousel`,
`AffiliateProductCard`) that call the pure selection logic against the live rows.
The admin side (create/publish/schedule, affiliate product manager) is
implemented; the public render components are the next monetization step
(ROADMAP §7). Impression/click tracking columns exist; the tracking endpoints are
follow-up work.

## Tracking

Impressions and clicks are stored as counts on the row. Do not collect
unnecessary personal data for ad tracking.
