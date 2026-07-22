"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, writeAudit } from "@/app/lib/admin";
import { getData } from "@/app/lib/data";

const VIDEO_EDITORS = ["owner", "admin", "editor"] as const;
const VIDEO_DELETERS = ["owner", "admin"] as const;

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

/** Accept a full YouTube URL or a bare id and return the 11-char video id. */
function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function createVideo(formData: FormData) {
  const ctx = await requireAdmin([...VIDEO_EDITORS]);

  const title = str(formData, "title");
  const youtubeId = parseYouTubeId(str(formData, "youtube"));
  if (!title || !youtubeId) {
    redirect("/admin/videos?error=A%20title%20and%20a%20valid%20YouTube%20URL%20or%20ID%20are%20required.");
  }

  const payload = {
    title,
    youtube_id: youtubeId as string,
    description: nullable(formData, "description"),
    category: nullable(formData, "category"),
    placement: str(formData, "placement") || "learn_featured",
    priority: Number.parseInt(str(formData, "priority") || "0", 10) || 0,
    is_active: formData.get("is_active") === "on",
    is_test: formData.get("is_test") === "on",
    starts_at: tsOrNull(formData, "starts_at"),
    ends_at: tsOrNull(formData, "ends_at"),
    created_by: ctx.user.id,
  };

  let created: { id: string } | null = null;
  try {
    created = await getData().videos.create({ accessToken: ctx.token }, payload);
  } catch {
    await writeAudit(ctx, { action: "video.create", targetType: "video", newValue: { title }, success: false });
    redirect("/admin/videos?error=Could%20not%20add%20the%20video.%20Confirm%20the%20videos%20migration%20has%20run.");
  }

  await writeAudit(ctx, { action: "video.create", targetType: "video", targetId: created?.id, newValue: { title, youtube_id: youtubeId, placement: payload.placement } });
  revalidatePath("/admin/videos");
  redirect("/admin/videos?message=Video%20added.");
}

export async function setVideoActive(formData: FormData) {
  const ctx = await requireAdmin([...VIDEO_EDITORS]);
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";
  if (!id) redirect("/admin/videos?error=Missing%20video%20id.");

  try {
    await getData().videos.setActive({ accessToken: ctx.token }, id, active);
  } catch {
    await writeAudit(ctx, { action: "video.set_active", targetType: "video", targetId: id, newValue: { is_active: active }, success: false });
    redirect("/admin/videos?error=Could%20not%20update%20the%20video.");
  }

  await writeAudit(ctx, { action: "video.set_active", targetType: "video", targetId: id, newValue: { is_active: active } });
  revalidatePath("/admin/videos");
  redirect(`/admin/videos?message=${active ? "Video%20published." : "Video%20hidden."}`);
}

export async function deleteVideo(formData: FormData) {
  const ctx = await requireAdmin([...VIDEO_DELETERS]);
  const id = str(formData, "id");
  if (!id) redirect("/admin/videos?error=Missing%20video%20id.");

  try {
    await getData().videos.remove({ accessToken: ctx.token }, id);
  } catch {
    await writeAudit(ctx, { action: "video.delete", targetType: "video", targetId: id, success: false });
    redirect("/admin/videos?error=Could%20not%20delete%20the%20video.");
  }

  await writeAudit(ctx, { action: "video.delete", targetType: "video", targetId: id });
  revalidatePath("/admin/videos");
  redirect("/admin/videos?message=Video%20deleted.");
}
