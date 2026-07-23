"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { adminRequest } from "@/lib/admin/service-client";
import { normalizeText, requireText, oneOf } from "@/lib/admin/validation";
import { assertSameOrigin, backTo, handleActionError } from "./shared";

const ACTIONS = ["cancel", "reopen", "expire", "force_complete", "mark_disputed", "resolve_dispute"] as const;

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}

/*
 * Moderate a challenge. Server-side validation remains the authority for
 * results; every change requires a reason and writes an audit entry preserving
 * the previous state.
 */
export async function moderateChallenge(formData: FormData) {
  assertSameOrigin();
  const id = normalizeText(formData.get("challenge_id"), 64);
  const decision = oneOf(formData.get("decision"), ACTIONS, "cancel");
  try {
    const ctx = await authorizeAction("challenges.moderate");
    const reason = requireText(formData.get("reason"), "Reason");
    const before = await adminRequest<Array<{ status: string; dispute_status: string; winner_id: string | null }>>(
      `/rest/v1/challenges?id=eq.${id}&select=status,dispute_status,winner_id`,
    );
    const winnerId = normalizeText(formData.get("winner_id"), 64) || null;
    const patch: Record<string, unknown> = {};
    if (decision === "cancel") patch.status = "declined";
    else if (decision === "reopen") patch.status = "accepted";
    else if (decision === "expire") patch.status = "expired";
    else if (decision === "force_complete") { patch.status = "completed"; patch.completed_at = new Date().toISOString(); if (winnerId) patch.winner_id = winnerId; }
    else if (decision === "mark_disputed") patch.dispute_status = "disputed";
    else if (decision === "resolve_dispute") patch.dispute_status = "resolved";
    patch.moderation_note = reason;

    await adminRequest(`/rest/v1/challenges?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    await writeAudit(ctx, {
      action: `challenge.${decision}`,
      targetType: "challenge",
      targetId: id,
      previousValue: before?.[0],
      newValue: patch,
      reason,
    });
    revalidatePath("/admin/challenges");
    redirect(backTo("/admin/challenges", { message: `Challenge updated: ${decision}.` }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "challenge.moderate");
    redirect(backTo("/admin/challenges", { error: message }));
  }
}
