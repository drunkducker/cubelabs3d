/*
 * Pure campaign-selection logic, shared by public AdSlot rendering and admin
 * previews. No data access here so it is fully unit testable.
 *
 * A campaign is eligible for a placement/device/time when it is active,
 * inside its schedule window, and matches the placement. Selection favors
 * higher priority, then the more recently started campaign.
 */

export type Campaign = {
  id: string;
  placement: string;
  status: "draft" | "active" | "paused" | "archived";
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  device?: "all" | "mobile" | "desktop" | null;
};

export type SelectionContext = {
  placement: string;
  now: Date;
  device?: "mobile" | "desktop";
};

export function isCampaignEligible(c: Campaign, ctx: SelectionContext): boolean {
  if (c.status !== "active") return false;
  if (c.placement !== ctx.placement) return false;
  const t = ctx.now.getTime();
  if (c.starts_at && new Date(c.starts_at).getTime() > t) return false;
  if (c.ends_at && new Date(c.ends_at).getTime() < t) return false;
  if (ctx.device && c.device && c.device !== "all" && c.device !== ctx.device) return false;
  return true;
}

export function selectCampaign<T extends Campaign>(campaigns: T[], ctx: SelectionContext): T | null {
  const eligible = campaigns.filter((c) => isCampaignEligible(c, ctx));
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const as = a.starts_at ? new Date(a.starts_at).getTime() : 0;
    const bs = b.starts_at ? new Date(b.starts_at).getTime() : 0;
    return bs - as;
  });
  return eligible[0];
}
