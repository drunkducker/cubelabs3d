"use server";

import { revalidatePath } from "next/cache";
import { requireProfileSession } from "@/app/lib/profile-service";
import { deleteProfileAvatar, submitAvatarForModeration } from "@/lib/privacy/service";

export type AvatarActionResult = {
  ok: boolean;
  message: string;
};

export async function submitAvatarAction(formData: FormData): Promise<AvatarActionResult> {
  try {
    const { user } = await requireProfileSession();
    const file = formData.get("avatar");
    if (!(file instanceof File)) return { ok: false, message: "Choose an avatar image." };

    const width = numericField(formData, "width");
    const height = numericField(formData, "height");
    const crop = parseCrop(String(formData.get("crop") || "{}"));
    await submitAvatarForModeration({
      userId: user.id,
      file,
      width,
      height,
      crop,
    });
    revalidatePath("/profile");
    revalidatePath("/profile/settings");
    return {
      ok: true,
      message: "Avatar submitted. Your current avatar stays visible until the new image is approved.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Avatar upload failed.",
    };
  }
}

export async function deleteAvatarAction(): Promise<AvatarActionResult> {
  try {
    const { user } = await requireProfileSession();
    await deleteProfileAvatar(user.id);
    revalidatePath("/profile");
    revalidatePath("/profile/settings");
    return { ok: true, message: "Avatar removed." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Avatar deletion failed.",
    };
  }
}

function numericField(formData: FormData, name: string): number | null {
  const value = Number(formData.get(name));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function parseCrop(value: string): Record<string, number> {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const result: Record<string, number> = {};
    for (const key of ["zoom", "x", "y"]) {
      const candidate = Number(parsed[key]);
      if (Number.isFinite(candidate)) result[key] = candidate;
    }
    return result;
  } catch {
    return {};
  }
}
