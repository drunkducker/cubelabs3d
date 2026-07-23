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
