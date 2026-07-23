"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authorizeAction, resolveAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { adminRequest } from "@/lib/admin/service-client";
import { setUserBan, requestPasswordResetFor } from "@/lib/admin/users";
import { normalizeText, requireText, clampInt } from "@/lib/admin/validation";
import { assertSameOrigin, backTo, handleActionError } from "./shared";

/*
 * User administration mutations. Each: origin check → permission check →
 * validate → operate via service role → audit → revalidate. Failures record a
 * security event and return a safe message via query string.
 */

export async function setUserSuspension(formData: FormData) {
  assertSameOrigin();
  const userId = normalizeText(formData.get("user_id"), 64);
  const suspend = normalizeText(formData.get("suspend")) === "true";
  const detail = backTo(`/admin/users/${userId}`, {});
  try {
    const ctx = await authorizeAction("users.suspend");
    const reason = requireText(formData.get("reason"), "Reason");
    await setUserBan(userId, suspend);
    await writeAudit(ctx, {
      action: suspend ? "user.suspend" : "user.restore",
      targetType: "user",
      targetId: userId,
      newValue: { suspended: suspend },
      reason,
    });
    revalidatePath(`/admin/users/${userId}`);
    redirect(backTo(`/admin/users/${userId}`, { message: suspend ? "Account suspended." : "Account restored." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "user.suspend");
    redirect(backTo(detail, { error: message }));
  }
}

export async function grantPremium(formData: FormData) {
  assertSameOrigin();
  const userId = normalizeText(formData.get("user_id"), 64);
  const grant = normalizeText(formData.get("grant")) === "true";
  const expiresDays = clampInt(formData.get("expires_days"), 0, 3650, 0);
  try {
    const ctx = await authorizeAction("users.premium.manage");
    const reason = requireText(formData.get("reason"), "Reason");
    const expiresAt = grant && expiresDays > 0 ? new Date(Date.now() + expiresDays * 86_400_000).toISOString() : null;
    // Premium is tracked in app_metadata via the Auth admin API (never client-writable).
    await adminRequest(`/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ app_metadata: { premium: grant, premium_expires_at: expiresAt } }),
    });
    await writeAudit(ctx, {
      action: grant ? "user.premium.grant" : "user.premium.revoke",
      targetType: "user",
      targetId: userId,
      newValue: { premium: grant, premium_expires_at: expiresAt },
      reason,
    });
    revalidatePath(`/admin/users/${userId}`);
    redirect(backTo(`/admin/users/${userId}`, { message: grant ? "Premium granted." : "Premium revoked." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "user.premium.manage");
    redirect(backTo(`/admin/users/${userId}`, { error: message }));
  }
}

export async function sendPasswordReset(formData: FormData) {
  assertSameOrigin();
  const userId = normalizeText(formData.get("user_id"), 64);
  const email = normalizeText(formData.get("email"), 254);
  try {
    const ctx = await authorizeAction("users.read");
    if (!email) throw new Error("no email");
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://cubelabs3d.vercel.app";
    await requestPasswordResetFor(email, `${origin.replace(/\/$/, "")}/auth/reset`);
    // Note: we log the action and target, never the recovery link or token.
    await writeAudit(ctx, { action: "user.password_reset.request", targetType: "user", targetId: userId, reason: "Support-initiated reset" });
    redirect(backTo(`/admin/users/${userId}`, { message: "Password-reset email requested." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "user.password_reset.request");
    redirect(backTo(`/admin/users/${userId}`, { error: message }));
  }
}

export async function addUserNote(formData: FormData) {
  assertSameOrigin();
  const userId = normalizeText(formData.get("user_id"), 64);
  try {
    const ctx = await authorizeAction("users.read");
    const note = requireText(formData.get("note"), "Note", 2000);
    await writeAudit(ctx, { action: "user.note.add", targetType: "user", targetId: userId, newValue: { note }, reason: "Internal note" });
    revalidatePath(`/admin/users/${userId}`);
    redirect(backTo(`/admin/users/${userId}`, { message: "Note recorded in audit trail." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "user.note.add");
    redirect(backTo(`/admin/users/${userId}`, { error: message }));
  }
}

/*
 * Permanent deletion — Owner-only, typed-confirmation, reason required.
 */
export async function deleteUserPermanently(formData: FormData) {
  assertSameOrigin();
  const userId = normalizeText(formData.get("user_id"), 64);
  try {
    const ctx = await authorizeAction("users.delete"); // OWNER_ONLY per permission matrix
    const reason = requireText(formData.get("reason"), "Reason");
    const phrase = normalizeText(formData.get("confirm_phrase"));
    if (phrase !== "DELETE") {
      throw new Error("phrase");
    }
    await adminRequest(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
    await writeAudit(ctx, {
      action: "user.delete.permanent",
      targetType: "user",
      targetId: userId,
      reason,
      newValue: { deleted: true },
    });
    redirect(backTo(`/admin/users`, { message: "Account permanently deleted." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const ctx = await resolveAdmin().catch(() => null);
    if (error instanceof Error && error.message === "phrase") {
      redirect(backTo(`/admin/users/${userId}`, { error: "Type DELETE exactly to confirm permanent deletion." }));
    }
    const message = await handleActionError(error, "user.delete.permanent", ctx?.userId);
    redirect(backTo(`/admin/users/${userId}`, { error: message }));
  }
}

// Next throws a special redirect "error"; re-throw so the redirect works.
function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}
