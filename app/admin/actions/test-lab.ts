"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { adminRequest } from "@/lib/admin/service-client";
import { normalizeText, requireText, clampInt, oneOf } from "@/lib/admin/validation";
import { assertSameOrigin, backTo, handleActionError } from "./shared";

const PUZZLES = ["2x2", "3x3", "4x4", "5x5", "pyraminx"] as const;

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}

/*
 * Generate controlled test solves. EVERY generated row is is_test=true,
 * test_run_id set, and leaderboard_eligible=false so it can never leak into
 * public rankings, real achievements, or production analytics.
 */
export async function generateTestSolves(formData: FormData) {
  assertSameOrigin();
  const dryRun = normalizeText(formData.get("dry_run")) === "true";
  try {
    const ctx = await authorizeAction("test_data.generate");
    const name = requireText(formData.get("name"), "Run name", 120);
    const targetUser = requireText(formData.get("user_id"), "Target user id", 64);
    const puzzle = oneOf(formData.get("puzzle_type"), PUZZLES, "3x3");
    const count = clampInt(formData.get("count"), 1, 200, 10);
    const baseTime = clampInt(formData.get("base_time_ms"), 1000, 3_600_000, 15_000);

    if (dryRun) {
      redirect(backTo("/admin/test-lab", { message: `Dry run: would create ${count} test ${puzzle} solve(s) for ${targetUser}. Nothing was written.` }));
    }

    // Parent run first so all generated rows are traceable + deletable together.
    const runRows = await adminRequest<Array<{ id: string }>>("/rest/v1/test_runs?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        created_by: ctx.userId,
        name,
        purpose: normalizeText(formData.get("purpose"), 300) || "QA solve generation",
        config: { puzzle, count, baseTime, targetUser },
        generated_counts: { solves: count },
        expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      }),
    });
    const runId = runRows[0]?.id;

    const rows = Array.from({ length: count }).map((_, i) => ({
      user_id: targetUser,
      puzzle_type: puzzle,
      scramble: "TEST SCRAMBLE",
      solve_time_ms: baseTime + Math.floor((Math.random() - 0.5) * baseTime * 0.2),
      move_count: 40 + Math.floor(Math.random() * 30),
      solved: true,
      is_dnf: false,
      is_test: true,
      test_run_id: runId,
      leaderboard_eligible: false,
      verification_status: "unverified",
      device_type: "test",
      control_type: "generated",
      replay_data: { generated: true, index: i },
    }));
    await adminRequest("/rest/v1/solve_results", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(rows),
    });
    await writeAudit(ctx, { action: "test_data.generate", targetType: "test_run", targetId: runId, newValue: { count, puzzle }, reason: name });
    revalidatePath("/admin/test-lab");
    redirect(backTo("/admin/test-lab", { message: `Created ${count} test ${puzzle} solve(s) under run ${name}.` }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "test_data.generate");
    redirect(backTo("/admin/test-lab", { error: message }));
  }
}

/*
 * Delete a whole test run and only its generated rows. Nothing outside the run.
 */
export async function cleanupTestRun(formData: FormData) {
  assertSameOrigin();
  const runId = normalizeText(formData.get("run_id"), 64);
  try {
    const ctx = await authorizeAction("test_data.delete");
    // Delete generated solves first, then mark the run cleaned.
    await adminRequest(`/rest/v1/solve_results?test_run_id=eq.${runId}&is_test=eq.true`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await adminRequest(`/rest/v1/test_runs?id=eq.${runId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "cleaned", cleanup_status: "done" }),
    });
    await writeAudit(ctx, { action: "test_data.cleanup", targetType: "test_run", targetId: runId, reason: "Cleanup of test run" });
    revalidatePath("/admin/test-lab");
    redirect(backTo("/admin/test-lab", { message: "Test run cleaned." }));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = await handleActionError(error, "test_data.cleanup");
    redirect(backTo("/admin/test-lab", { error: message }));
  }
}
