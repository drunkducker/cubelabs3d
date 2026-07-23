import { supabaseRequest } from "@/app/lib/supabase-rest";
import { selectCampaign, type Campaign } from "@/lib/admin/campaign-selection";

/*
 * Public-side ad/affiliate reads. These use the ANON key (no service role) and
 * rely on the row-level-security SELECT policies from 20260723_admin_platform.sql,
 * which only expose active, in-window campaigns/slides and active affiliate
 * products. Safe to call from public server components. Fails soft: on any
 * error it returns null/empty so an ad slot never breaks a page.
 */

export type PublicCampaign = Campaign & {
  headline: string | null;
  body: string | null;
  button_text: string | null;
  destination_url: string | null;
  disclosure: string | null;
  mobile_asset_url: string | null;
  desktop_asset_url: string | null;
  alt_text: string | null;
};

export type PublicAffiliateProduct = {
  id: string;
  name: string;
  brand: string | null;
  partner: string | null;
  puzzle_type: string | null;
  description: string | null;
  image_url: string | null;
  affiliate_url: string | null;
  destination_url: string | null;
  price_note: string | null;
  disclosure: string | null;
  is_featured: boolean;
};

const CAMPAIGN_SELECT =
  "id,placement,status,priority,starts_at,ends_at,headline,body,button_text,destination_url,disclosure,mobile_asset_url,desktop_asset_url,alt_text";

export async function getActiveCampaign(placement: string, device?: "mobile" | "desktop"): Promise<PublicCampaign | null> {
  try {
    const rows = await supabaseRequest<PublicCampaign[]>(
      `/rest/v1/ad_campaigns?placement=eq.${encodeURIComponent(placement)}&status=eq.active&select=${CAMPAIGN_SELECT}&order=priority.desc&limit=20`,
    );
    // Re-run the shared selection logic client-side of the DB for schedule/device
    // (the RLS policy already excludes drafts/expired, this adds device + priority).
    return (selectCampaign(rows ?? [], { placement, now: new Date(), device }) as PublicCampaign) ?? null;
  } catch {
    return null;
  }
}

export async function getAffiliateProducts(placement: string, limit = 8): Promise<PublicAffiliateProduct[]> {
  try {
    const rows = await supabaseRequest<PublicAffiliateProduct[]>(
      `/rest/v1/affiliate_products?placement=eq.${encodeURIComponent(placement)}&is_active=eq.true&select=id,name,brand,partner,puzzle_type,description,image_url,affiliate_url,destination_url,price_note,disclosure,is_featured&order=is_featured.desc,sort_order&limit=${Math.min(24, limit)}`,
    );
    return rows ?? [];
  } catch {
    return [];
  }
}

export type PublicCarouselSlide = {
  id: string;
  headline: string | null;
  body: string | null;
  mobile_asset_url: string | null;
  desktop_asset_url: string | null;
  alt_text: string | null;
  destination_url: string | null;
  disclosure: string | null;
};

export async function getCarouselSlides(placement: string): Promise<PublicCarouselSlide[]> {
  try {
    const carousels = await supabaseRequest<Array<{ id: string }>>(
      `/rest/v1/ad_carousels?placement=eq.${encodeURIComponent(placement)}&status=eq.active&select=id&limit=1`,
    );
    const carouselId = carousels?.[0]?.id;
    if (!carouselId) return [];
    const slides = await supabaseRequest<PublicCarouselSlide[]>(
      `/rest/v1/ad_carousel_slides?carousel_id=eq.${carouselId}&status=eq.active&select=id,headline,body,mobile_asset_url,desktop_asset_url,alt_text,destination_url,disclosure&order=sort_order`,
    );
    return slides ?? [];
  } catch {
    return [];
  }
}
