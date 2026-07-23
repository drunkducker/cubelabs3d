"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { adminRequest } from "@/lib/admin/service-client";
import { findUserIdByEmail, countActiveOwners } from "@/lib/admin/roles";
import { ADMIN_ROLES } from "@/lib/admin/permissions";
import { normalizeText, requireText, oneOf } from "@/lib/admin/validation";
import { assertSameOrigin, backTo, handleActionError } from "./shared";

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}

/*
 * Assign or update an administrator role. Owner-only (roles.manage). Assigning
 * Owner is allowed only by an existing Owner (authorizeAction already enforces
 * this because roles.manage is owner-only). Every change is audited.
 */
export async function upsertAdminMember(formData: FormData) {
  assertSameOrigin();
  try {
    const ctx = await authorizeAction("roles.manage");
    const email = requireText(formData.get("email"), "Email", 254);
    const role = oneOf(formData.get("role"), ADMIN_ROLES, "support");
    const note = normalizeText(formData.get("note"), 500) || null;

    const userId = await findUserIdByEmail(email);
    if (!userId) throw new Error("no_user");

    const before = await adminRequest<Array<{ role: string; is_active: boolean }>>(
      `/rest/v1/admin_members?user_id=eq.${userId}&select=role,is_active`,
    );
    await adminRequest(`/rest/v1/admin_members`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        role,
        is_active: true,
        note,
        created_by: before?.[0] ? undefined : ctx.userId,
        updated_by: ctx.userId,
        updated_at: new Date().toISOString(),
      }),
    });
    await writeAudit(ctx, {
      action: before?.[0] ? "roles.update" : "roles.grant",
      targetType: "admin_member",
      targetId: userId,
      previousValue: before?.[0] ?? null,
      newValue: { role, is_active: true },
      reason: `Set ${email} to ${role}`,
    });
    revalidatePath("/admin/roles");
    redirect(backTo("/admin/roles", { message: `${email} is now ${role}.` }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    if (error instanceof Error && error.message === "no_user") {
      redirect(backTo("/admin/roles", { error: "No account found with that email. They must sign up first." }));
    }
    const message = await handleActionError(error, "roles.upsert");
    redirect(backTo("/admin/roles", { error: message }));
  }
}

/*
 * Deactivate an admin membership. Refuses to remove the last active Owner so the
 * platform can never lock itself out.
 */
export async function deactivateAdminMember(formData: FormData) {
  assertSameOrigin();
  const userId = normalizeText(formData.get("user_id"), 64);
  try {
    const ctx = await authorizeAction("roles.manage");
    const target = await adminRequest<Array<{ role: string; is_active: boolean }>>(
      `/rest/v1/admin_members?user_id=eq.${userId}&select=role,is_active`,
    );
    if (target?.[0]?.role === "owner") {
      const owners = await countActiveOwners();
      if (owners !== null && owners <= 1) throw new Error("last_owner");
    }
    await adminRequest(`/rest/v1/admin_members?user_id=eq.${userId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ is_active: false, updated_by: ctx.userId, updated_at: new Date().toISOString() }),
    });
    await writeAudit(ctx, { action: "roles.deactivate", targetType: "admin_member", targetId: userId, previousValue: target?.[0], newValue: { is_active: false }, reason: "Membership deactivated" });
    revalidatePath("/admin/roles");
    redirect(backTo("/admin/roles", { message: "Administrator deactivated." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    if (error instanceof Error && error.message === "last_owner") {
      redirect(backTo("/admin/roles", { error: "Cannot deactivate the last active Owner." }));
    }
    const message = await handleActionError(error, "roles.deactivate");
    redirect(backTo("/admin/roles", { error: message }));
  }
}
