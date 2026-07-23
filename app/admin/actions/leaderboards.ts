"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { adminRequest } from "@/lib/admin/service-client";
import { normalizeText, requireText, oneOf, clampInt } from "@/lib/admin/validation";
import { assertSameOrigin, backTo, handleActionError } from "./shared";

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}

const ACTIONS = ["mark_valid", "mark_suspicious", "exclude", "restore"] as const;

/*
 * Review a leaderboard/solve entry. This NEVER overwrites the original solve
 * time — it only flips moderation/eligibility flags and records the reason.
 */
export async function reviewLeaderboardEntry(formData: FormData) {
  assertSameOrigin();
  const solveId = normalizeText(formData.get("solve_id"), 64);
  const decision = oneOf(formData.get("decision"), ACTIONS, "mark_valid");
  try {
    const ctx = await authorizeAction("leaderboards.moderate");
    const reason = requireText(formData.get("reason"), "Reason");
    const before = await adminRequest<Array<{ moderation_status: string; leaderboard_eligible: boolean; is_suspicious: boolean }>>(
      `/rest/v1/solve_results?id=eq.${solveId}&select=moderation_status,leaderboard_eligible,is_suspicious`,
    );
    const patch =
      decision === "mark_valid"
        ? { moderation_status: "none", is_suspicious: false, verification_status: "verified" }
        : decision === "mark_suspicious"
          ? { moderation_status: "flagged", is_suspicious: true }
          : decision === "exclude"
            ? { moderation_status: "excluded", leaderboard_eligible: false }
            : { moderation_status: "none", leaderboard_eligible: true, is_suspicious: false };

    await adminRequest(`/rest/v1/solve_results?id=eq.${solveId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    await writeAudit(ctx, {
      action: `leaderboard.${decision}`,
      targetType: "solve",
      targetId: solveId,
      previousValue: before?.[0],
      newValue: patch,
      reason,
    });
    revalidatePath("/admin/leaderboards");
    redirect(backTo("/admin/leaderboards", { message: `Entry updated: ${decision}.` }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "leaderboard.review");
    redirect(backTo("/admin/leaderboards", { error: message }));
  }
}

/*
 * Correct a recorded time. The ORIGINAL value is preserved in original_time_ms
 * (only on first correction) alongside the correction reason and acting admin.
 */
export async function correctSolveTime(formData: FormData) {
  assertSameOrigin();
  const solveId = normalizeText(formData.get("solve_id"), 64);
  try {
    const ctx = await authorizeAction("leaderboards.moderate");
    const reason = requireText(formData.get("reason"), "Reason");
    const newTime = clampInt(formData.get("new_time_ms"), 1, 3_600_000, 0);
    if (newTime <= 0) throw new Error("time");
    const before = await adminRequest<Array<{ solve_time_ms: number; original_time_ms: number | null }>>(
      `/rest/v1/solve_results?id=eq.${solveId}&select=solve_time_ms,original_time_ms`,
    );
    const row = before?.[0];
    const patch = {
      solve_time_ms: newTime,
      original_time_ms: row?.original_time_ms ?? row?.solve_time_ms ?? null, // preserve first original only
      moderation_status: "corrected",
      correction_reason: reason,
      corrected_by: ctx.userId,
      corrected_at: new Date().toISOString(),
    };
    await adminRequest(`/rest/v1/solve_results?id=eq.${solveId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    await writeAudit(ctx, {
      action: "leaderboard.correct_time",
      targetType: "solve",
      targetId: solveId,
      previousValue: { solve_time_ms: row?.solve_time_ms },
      newValue: { solve_time_ms: newTime },
      reason,
    });
    revalidatePath("/admin/leaderboards");
    redirect(backTo("/admin/leaderboards", { message: "Time corrected; original value preserved." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "leaderboard.correct_time");
    redirect(backTo("/admin/leaderboards", { error: message }));
  }
}
