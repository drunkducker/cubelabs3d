"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, writeAudit } from "@/app/lib/admin";
import { getData } from "@/app/lib/data";

const EDITORS = ["owner", "admin", "editor"] as const;
const DELETERS = ["owner", "admin"] as const;

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

export async function createSlide(formData: FormData) {
  const ctx = await requireAdmin([...EDITORS]);

  const title = str(formData, "title");
  const carousel = str(formData, "carousel_key");
  if (!title || !carousel) {
    redirect("/admin/banners?error=A%20title%20and%20carousel%20are%20required.");
  }

  const payload = {
    carousel_key: carousel,
    title,
    subtitle: nullable(formData, "subtitle"),
    link_url: nullable(formData, "link_url"),
    image_mobile_url: nullable(formData, "image_mobile_url"),
    image_desktop_url: nullable(formData, "image_desktop_url"),
    advertiser: nullable(formData, "advertiser"),
    disclosure: nullable(formData, "disclosure"),
    priority: Number.parseInt(str(formData, "priority") || "0", 10) || 0,
    is_active: formData.get("is_active") === "on",
    is_test: formData.get("is_test") === "on",
    starts_at: tsOrNull(formData, "starts_at"),
    ends_at: tsOrNull(formData, "ends_at"),
    created_by: ctx.user.id,
  };

  let created: { id: string } | null = null;
  try {
    created = await getData().promoSlides.create({ accessToken: ctx.token }, payload);
  } catch {
    await writeAudit(ctx, { action: "slide.create", targetType: "promo_slide", newValue: { title, carousel }, success: false });
    redirect("/admin/banners?error=Could%20not%20create%20the%20slide.%20Confirm%20the%20promo%20slides%20migration%20has%20run.");
  }

  await writeAudit(ctx, { action: "slide.create", targetType: "promo_slide", targetId: created?.id, newValue: { title, carousel } });
  revalidatePath("/admin/banners");
  redirect("/admin/banners?message=Slide%20created.");
}

export async function setSlideActive(formData: FormData) {
  const ctx = await requireAdmin([...EDITORS]);
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";
  if (!id) redirect("/admin/banners?error=Missing%20slide%20id.");

  try {
    await getData().promoSlides.setActive({ accessToken: ctx.token }, id, active);
  } catch {
    await writeAudit(ctx, { action: "slide.set_active", targetType: "promo_slide", targetId: id, newValue: { is_active: active }, success: false });
    redirect("/admin/banners?error=Could%20not%20update%20the%20slide.");
  }

  await writeAudit(ctx, { action: "slide.set_active", targetType: "promo_slide", targetId: id, newValue: { is_active: active } });
  revalidatePath("/admin/banners");
  redirect(`/admin/banners?message=${active ? "Slide%20activated." : "Slide%20paused."}`);
}

export async function deleteSlide(formData: FormData) {
  const ctx = await requireAdmin([...DELETERS]);
  const id = str(formData, "id");
  if (!id) redirect("/admin/banners?error=Missing%20slide%20id.");

  try {
    await getData().promoSlides.remove({ accessToken: ctx.token }, id);
  } catch {
    await writeAudit(ctx, { action: "slide.delete", targetType: "promo_slide", targetId: id, success: false });
    redirect("/admin/banners?error=Could%20not%20delete%20the%20slide.");
  }

  await writeAudit(ctx, { action: "slide.delete", targetType: "promo_slide", targetId: id });
  revalidatePath("/admin/banners");
  redirect("/admin/banners?message=Slide%20deleted.");
}
