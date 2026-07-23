import { describe, it, expect } from "vitest";
import { isCampaignEligible, selectCampaign, type Campaign } from "@/lib/admin/campaign-selection";

const now = new Date("2026-07-23T12:00:00Z");
const base: Campaign = { id: "1", placement: "home_top_banner", status: "active", priority: 0, starts_at: null, ends_at: null };

describe("campaign eligibility", () => {
  it("drafts, paused and archived campaigns never render", () => {
    expect(isCampaignEligible({ ...base, status: "draft" }, { placement: "home_top_banner", now })).toBe(false);
    expect(isCampaignEligible({ ...base, status: "paused" }, { placement: "home_top_banner", now })).toBe(false);
    expect(isCampaignEligible({ ...base, status: "archived" }, { placement: "home_top_banner", now })).toBe(false);
  });

  it("future campaigns do not render early", () => {
    expect(isCampaignEligible({ ...base, starts_at: "2026-08-01T00:00:00Z" }, { placement: "home_top_banner", now })).toBe(false);
  });

  it("expired campaigns do not render", () => {
    expect(isCampaignEligible({ ...base, ends_at: "2026-07-01T00:00:00Z" }, { placement: "home_top_banner", now })).toBe(false);
  });

  it("wrong placement does not match", () => {
    expect(isCampaignEligible(base, { placement: "profile_promo", now })).toBe(false);
  });

  it("device targeting is respected", () => {
    expect(isCampaignEligible({ ...base, device: "desktop" }, { placement: "home_top_banner", now, device: "mobile" })).toBe(false);
    expect(isCampaignEligible({ ...base, device: "all" }, { placement: "home_top_banner", now, device: "mobile" })).toBe(true);
  });

  it("an in-window active campaign is eligible", () => {
    expect(isCampaignEligible({ ...base, starts_at: "2026-07-01T00:00:00Z", ends_at: "2026-08-01T00:00:00Z" }, { placement: "home_top_banner", now })).toBe(true);
  });
});

describe("campaign selection", () => {
  it("selects the highest priority eligible campaign", () => {
    const campaigns: Campaign[] = [
      { ...base, id: "low", priority: 1 },
      { ...base, id: "high", priority: 10 },
      { ...base, id: "draft", priority: 99, status: "draft" },
    ];
    expect(selectCampaign(campaigns, { placement: "home_top_banner", now })?.id).toBe("high");
  });

  it("returns null when nothing is eligible", () => {
    expect(selectCampaign([{ ...base, status: "paused" }], { placement: "home_top_banner", now })).toBeNull();
  });
});
