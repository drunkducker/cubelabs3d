"use server";

import { revalidatePath } from "next/cache";
import { requireProfileSession } from "@/app/lib/profile-service";
import { supabaseRequest } from "@/app/lib/supabase-rest";
import { buildReportReason, cleanBlockReason, isUuid } from "@/lib/safety";

/*
 * Server actions for user-facing safety: block, unblock, and report. Each pins
 * the acting user to their session token so RLS enforces ownership; the client
 * cannot spoof reporter_id, blocker_id, or a report's triage fields.
 */

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function revalidateSafetyPaths(slug?: string) {
  revalidatePath("/profile/blocked");
  revalidatePath("/profile/friends");
  if (slug) revalidatePath(`/u/${slug}`);
}

/**
 * Block an account. Records the block and tears down any existing friendship
 * between the two users so the blocked account leaves the member's circle.
 * Idempotent: re-blocking is ignored via the unique constraint.
 */
export async function blockUser(formData: FormData) {
  const targetId = field(formData, "target_id");
  const slug = field(formData, "slug") || undefined;
  if (!isUuid(targetId)) return;

  const { token, user } = await requireProfileSession();
  if (targetId === user.id) return;

  try {
    await supabaseRequest(
      "/rest/v1/user_blocks?on_conflict=blocker_id,blocked_id",
      {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          blocker_id: user.id,
          blocked_id: targetId,
          reason: cleanBlockReason(field(formData, "reason")),
        }),
      },
      token,
    );
  } catch {
    /* unique-violation or transient error: treat as already blocked */
  }

  // Remove any friendship in either direction; RLS limits this to the pair.
  const participantFilter = encodeURIComponent(
    `(and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id}))`,
  );
  try {
    await supabaseRequest(
      `/rest/v1/friendships?or=${participantFilter}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
      token,
    );
  } catch {
    /* no friendship to remove */
  }

  revalidateSafetyPaths(slug);
}

/** Remove a block the acting user created. */
export async function unblockUser(formData: FormData) {
  const targetId = field(formData, "target_id");
  const slug = field(formData, "slug") || undefined;
  if (!isUuid(targetId)) return;

  const { token, user } = await requireProfileSession();
  await supabaseRequest(
    `/rest/v1/user_blocks?blocker_id=eq.${user.id}&blocked_id=eq.${targetId}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
    token,
  );

  revalidateSafetyPaths(slug);
}

/**
 * File an abuse report against another account. The report enters the admin
 * moderation queue as a fresh, normal-severity, open row (enforced by RLS).
 */
export async function reportUser(formData: FormData) {
  const targetId = field(formData, "target_id");
  const slug = field(formData, "slug") || undefined;
  const reason = buildReportReason(field(formData, "reason"), field(formData, "details"));
  if (!isUuid(targetId) || !reason) return;

  const { token, user } = await requireProfileSession();
  if (targetId === user.id) return;

  await supabaseRequest(
    "/rest/v1/moderation_reports",
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        target_type: "user",
        target_id: targetId,
        reporter_id: user.id,
        reason,
        severity: "normal",
        status: "open",
      }),
    },
    token,
  );

  if (slug) revalidatePath(`/u/${slug}`);
}
