"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { adminRequest } from "@/lib/admin/service-client";
import { normalizeText, requireText, safeUrl, optionalSafeUrl, oneOf, clampInt } from "@/lib/admin/validation";
import { assertSameOrigin, backTo, handleActionError } from "./shared";

const PLACEMENTS = [
  "home_top_banner",
  "home_carousel",
  "solver_top_banner",
  "solver_product_carousel",
  "learn_mid_banner",
  "leaderboard_sponsor",
  "profile_promo",
] as const;

const STATUSES = ["draft", "active", "paused", "archived"] as const;

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}

export async function createCampaign(formData: FormData) {
  assertSameOrigin();
  try {
    const ctx = await authorizeAction("ads.manage");
    const name = requireText(formData.get("name"), "Campaign name", 200);
    const placement = oneOf(formData.get("placement"), PLACEMENTS, "home_top_banner");
    const destination = optionalSafeUrl(formData.get("destination_url"), "Destination URL");
    const tracking = optionalSafeUrl(formData.get("tracking_url"), "Tracking URL");
    const disclosure = normalizeText(formData.get("disclosure"), 300);
    const priority = clampInt(formData.get("priority"), 0, 1000, 0);

    const rows = await adminRequest<Array<{ id: string }>>("/rest/v1/ad_campaigns?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name,
        advertiser: normalizeText(formData.get("advertiser"), 200) || null,
        campaign_type: normalizeText(formData.get("campaign_type"), 40) || "banner",
        placement,
        headline: normalizeText(formData.get("headline"), 200) || null,
        body: normalizeText(formData.get("body"), 500) || null,
        button_text: normalizeText(formData.get("button_text"), 60) || null,
        destination_url: destination,
        tracking_url: tracking,
        disclosure: disclosure || "Sponsored",
        priority,
        status: "draft", // new campaigns never start live
        starts_at: normalizeText(formData.get("starts_at")) || null,
        ends_at: normalizeText(formData.get("ends_at")) || null,
        created_by: ctx.userId,
      }),
    });
    await writeAudit(ctx, { action: "ads.campaign.create", targetType: "ad_campaign", targetId: rows[0]?.id, newValue: { name, placement }, reason: "Created draft campaign" });
    revalidatePath("/admin/ads");
    redirect(backTo("/admin/ads", { message: "Draft campaign created." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "ads.campaign.create");
    redirect(backTo("/admin/ads", { error: message }));
  }
}

export async function createAffiliateProduct(formData: FormData) {
  assertSameOrigin();
  try {
    const ctx = await authorizeAction("ads.manage");
    const name = requireText(formData.get("name"), "Product name", 200);
    const affiliate = safeUrl(formData.get("affiliate_url"), "Affiliate URL"); // required + validated
    const destination = optionalSafeUrl(formData.get("destination_url"), "Destination URL");
    const image = optionalSafeUrl(formData.get("image_url"), "Image URL");
    const rows = await adminRequest<Array<{ id: string }>>("/rest/v1/affiliate_products?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name,
        partner: normalizeText(formData.get("partner"), 120) || null,
        brand: normalizeText(formData.get("brand"), 120) || null,
        category: normalizeText(formData.get("category"), 80) || null,
        puzzle_type: normalizeText(formData.get("puzzle_type"), 40) || null,
        description: normalizeText(formData.get("description"), 500) || null,
        affiliate_url: affiliate,
        destination_url: destination,
        image_url: image,
        price_note: normalizeText(formData.get("price_note"), 80) || null,
        disclosure: normalizeText(formData.get("disclosure"), 200) || "Affiliate link — we may earn a commission.",
        placement: normalizeText(formData.get("placement"), 60) || "solver_product_carousel",
        is_active: false, // never publishes on create
        created_by: ctx.userId,
      }),
    });
    await writeAudit(ctx, { action: "ads.affiliate.create", targetType: "affiliate_product", targetId: rows[0]?.id, newValue: { name }, reason: "Created affiliate product" });
    revalidatePath("/admin/carousels");
    redirect(backTo("/admin/carousels", { message: "Affiliate product created (inactive)." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "ads.affiliate.create");
    redirect(backTo("/admin/carousels", { error: message }));
  }
}

/*
 * Publish / pause / archive. Publishing (status=active) requires ads.publish.
 */
export async function setCampaignStatus(formData: FormData) {
  assertSameOrigin();
  const id = normalizeText(formData.get("id"), 64);
  const status = oneOf(formData.get("status"), STATUSES, "draft");
  try {
    const ctx = await authorizeAction(status === "active" ? "ads.publish" : "ads.manage");
    const before = await adminRequest<Array<{ status: string }>>(`/rest/v1/ad_campaigns?id=eq.${id}&select=status`);
    await adminRequest(`/rest/v1/ad_campaigns?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    });
    await writeAudit(ctx, {
      action: `ads.campaign.${status}`,
      targetType: "ad_campaign",
      targetId: id,
      previousValue: { status: before?.[0]?.status },
      newValue: { status },
      reason: `Campaign set to ${status}`,
    });
    revalidatePath("/admin/ads");
    redirect(backTo("/admin/ads", { message: `Campaign ${status}.` }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "ads.campaign.status");
    redirect(backTo("/admin/ads", { error: message }));
  }
}
