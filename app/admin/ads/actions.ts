"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, writeAudit } from "@/app/lib/admin";
import { supabaseRequest } from "@/app/lib/supabase-rest";

// Roles allowed to manage ads.
const AD_EDITORS = ["owner", "admin", "editor"] as const;
const AD_DELETERS = ["owner", "admin"] as const;

function str(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}
function nullable(form: FormData, name: string): string | null {
  const v = str(form, name);
  return v === "" ? null : v;
}
function tsOrNull(form: FormData, name: string): string | null {
  const v = str(form, name);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function createAd(formData: FormData) {
  const ctx = await requireAdmin([...AD_EDITORS]);

  const name = str(formData, "name");
  const placement = str(formData, "placement");
  if (!name || !placement) {
    redirect("/admin/ads?error=Campaign%20name%20and%20placement%20are%20required.");
  }

  const payload = {
    name,
    placement,
    advertiser: nullable(formData, "advertiser"),
    ad_type: str(formData, "ad_type") || "banner",
    headline: nullable(formData, "headline"),
    body: nullable(formData, "body"),
    button_text: nullable(formData, "button_text"),
    destination_url: nullable(formData, "destination_url"),
    image_mobile_url: nullable(formData, "image_mobile_url"),
    image_desktop_url: nullable(formData, "image_desktop_url"),
    disclosure: nullable(formData, "disclosure"),
    priority: Number.parseInt(str(formData, "priority") || "0", 10) || 0,
    is_active: formData.get("is_active") === "on",
    is_test: formData.get("is_test") === "on",
    starts_at: tsOrNull(formData, "starts_at"),
    ends_at: tsOrNull(formData, "ends_at"),
    created_by: ctx.user.id,
  };

  let created: { id: string }[] = [];
  try {
    created = await supabaseRequest<{ id: string }[]>(
      "/rest/v1/ads",
      { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) },
      ctx.token,
    );
  } catch {
    await writeAudit(ctx, { action: "ad.create", targetType: "ad", newValue: { name, placement }, success: false });
    redirect("/admin/ads?error=Could%20not%20create%20the%20ad.%20Confirm%20the%20ads%20migration%20has%20run.");
  }

  await writeAudit(ctx, {
    action: "ad.create",
    targetType: "ad",
    targetId: created?.[0]?.id,
    newValue: { name, placement, ad_type: payload.ad_type, is_active: payload.is_active },
  });
  revalidatePath("/admin/ads");
  redirect("/admin/ads?message=Ad%20created.");
}

export async function setAdActive(formData: FormData) {
  const ctx = await requireAdmin([...AD_EDITORS]);
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";
  if (!id) redirect("/admin/ads?error=Missing%20ad%20id.");

  try {
    await supabaseRequest(
      `/rest/v1/ads?id=eq.${encodeURIComponent(id)}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: active, updated_at: new Date().toISOString() }) },
      ctx.token,
    );
  } catch {
    await writeAudit(ctx, { action: "ad.set_active", targetType: "ad", targetId: id, newValue: { is_active: active }, success: false });
    redirect("/admin/ads?error=Could%20not%20update%20the%20ad.");
  }

  await writeAudit(ctx, { action: "ad.set_active", targetType: "ad", targetId: id, newValue: { is_active: active } });
  revalidatePath("/admin/ads");
  redirect(`/admin/ads?message=${active ? "Ad%20activated." : "Ad%20paused."}`);
}

export async function deleteAd(formData: FormData) {
  const ctx = await requireAdmin([...AD_DELETERS]);
  const id = str(formData, "id");
  if (!id) redirect("/admin/ads?error=Missing%20ad%20id.");

  try {
    await supabaseRequest(
      `/rest/v1/ads?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
      ctx.token,
    );
  } catch {
    await writeAudit(ctx, { action: "ad.delete", targetType: "ad", targetId: id, success: false });
    redirect("/admin/ads?error=Could%20not%20delete%20the%20ad.");
  }

  await writeAudit(ctx, { action: "ad.delete", targetType: "ad", targetId: id });
  revalidatePath("/admin/ads");
  redirect("/admin/ads?message=Ad%20deleted.");
}
