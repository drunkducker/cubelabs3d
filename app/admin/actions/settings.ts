"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { upsertSetting } from "@/lib/admin/settings";
import { normalizeText, requireText, oneOf } from "@/lib/admin/validation";
import { assertSameOrigin, backTo, handleActionError } from "./shared";

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}

const TYPES = ["string", "number", "boolean", "json"] as const;

export async function saveSetting(formData: FormData) {
  assertSameOrigin();
  try {
    // settings.manage is OWNER_ONLY in the matrix; admins get settings.read.
    const ctx = await authorizeAction("settings.manage");
    const key = requireText(formData.get("key"), "Key", 120);
    const dataType = oneOf(formData.get("data_type"), TYPES, "string");
    const raw = normalizeText(formData.get("value"), 4000);
    let value: unknown = raw;
    if (dataType === "number") value = Number(raw);
    else if (dataType === "boolean") value = raw === "true";
    else if (dataType === "json") { try { value = JSON.parse(raw); } catch { throw new Error("Value is not valid JSON."); } }

    await upsertSetting({
      key,
      value,
      data_type: dataType,
      category: normalizeText(formData.get("category"), 60) || "general",
      is_public: normalizeText(formData.get("is_public")) === "true",
      description: normalizeText(formData.get("description"), 300) || null,
      updatedBy: ctx.userId,
    });
    await writeAudit(ctx, { action: "settings.update", targetType: "setting", targetId: key, newValue: { key, dataType }, reason: "Setting updated" });
    revalidatePath("/admin/settings");
    redirect(backTo("/admin/settings", { message: `Setting ${key} saved.` }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "settings.update");
    redirect(backTo("/admin/settings", { error: message }));
  }
}
