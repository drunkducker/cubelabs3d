"use server";

import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { adminJson } from "@/lib/privacy/supabase-admin";
import { deliverPrivacyEmail, privacySiteOrigin } from "@/lib/privacy/email";
import {
  addPrivacyEvent,
  applyProfileCorrection,
  moderateAvatar,
  patchPrivacyRequest,
  processPrivacyQueue,
  type PrivacyRequestRow,
} from "@/lib/privacy/service";
import { addUtcDays } from "@/lib/privacy/policy";

export async function reviewAvatarAction(formData: FormData) {
  const ctx = await authorizeAction("avatars.moderate");
  const submissionId = required(formData, "submission_id", 64);
  const decision = required(formData, "decision", 16);
  const reason = optional(formData, "reason", 500);
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) throw new Error("Invalid avatar submission ID.");
  if (decision !== "approve" && decision !== "reject") throw new Error("Choose approve or reject.");

  try {
    await moderateAvatar({
      submissionId,
      reviewerId: ctx.userId,
      decision,
      reason,
    });
    await writeAudit(ctx, {
      action: `avatar.${decision}`,
      targetType: "avatar_submission",
      targetId: submissionId,
      reason,
      newValue: { decision },
    });
  } catch (error) {
    await writeAudit(ctx, {
      action: `avatar.${decision}`,
      targetType: "avatar_submission",
      targetId: submissionId,
      reason,
      success: false,
      failureCategory: "avatar_moderation_failed",
      newValue: { error: error instanceof Error ? error.message : "unknown" },
    });
    throw error;
  }
  revalidatePath("/admin/privacy");
  revalidatePath("/profile/settings");
}

export async function updatePrivacyCaseAction(formData: FormData) {
  const action = required(formData, "case_action", 40);
  const permission = action === "approve_destructive" ? "users.delete" : "privacy.manage";
  const ctx = await authorizeAction(permission);
  const requestId = required(formData, "request_id", 64);
  const reason = optional(formData, "reason", 1000);
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error("Invalid privacy case ID.");

  const rows = await adminJson<PrivacyRequestRow[]>(
    `/rest/v1/account_data_requests?id=eq.${encodeURIComponent(requestId)}&select=*&limit=1`,
  );
  const request = rows[0];
  if (!request) throw new Error("Privacy case not found.");

  try {
    switch (action) {
      case "verify_authority":
        await patchPrivacyRequest(requestId, {
          verification_status: "verified",
          status: "under_review",
          assigned_to: ctx.userId,
          decision_reason: reason || "Requester authority verified by administrator.",
        });
        await addPrivacyEvent(requestId, "authority_verified", ctx.userId, "admin", { reason });
        break;

      case "request_information":
        await patchPrivacyRequest(requestId, {
          status: "under_review",
          verification_status: "manual_review",
          assigned_to: ctx.userId,
          decision_reason: reason || "Additional information requested.",
        });
        await addPrivacyEvent(requestId, "additional_information_requested", ctx.userId, "admin", { reason });
        await notifyCase(request, "More information is needed", reason || "Please reply to the privacy contact with additional information and your case ID.");
        break;

      case "extend_deadline": {
        if (!reason) throw new Error("A recorded reason is required to extend a privacy deadline.");
        const base = request.due_at && new Date(request.due_at).getTime() > Date.now()
          ? new Date(request.due_at)
          : new Date();
        const extendedDueAt = addUtcDays(base, 30).toISOString();
        await patchPrivacyRequest(requestId, {
          extended_due_at: extendedDueAt,
          assigned_to: ctx.userId,
          decision_reason: reason,
        });
        await addPrivacyEvent(requestId, "deadline_extended", ctx.userId, "admin", { reason, extended_due_at: extendedDueAt });
        await notifyCase(request, "Privacy request deadline updated", `The response deadline was extended to ${extendedDueAt}. Reason: ${reason}`);
        break;
      }

      case "approve":
        if (["close_account", "delete_data", "anonymize"].includes(request.request_type)) {
          throw new Error("Destructive requests require Owner approval.");
        }
        if (request.requester_type !== "self" && request.verification_status !== "verified") {
          throw new Error("Verify the requester authority before approval.");
        }
        if (request.request_type === "correction") {
          await applyProfileCorrection(requestId, ctx.userId);
        } else if (request.request_type === "appeal") {
          await approveAppeal(request, ctx.userId, reason);
        } else {
          await patchPrivacyRequest(requestId, {
            status: "approved",
            assigned_to: ctx.userId,
            decision_reason: reason || "Request approved.",
          });
          await addPrivacyEvent(requestId, "request_approved", ctx.userId, "admin", { reason });
        }
        await notifyCase(request, "Privacy request approved", reason || "Your request was approved and is moving to completion.");
        break;

      case "approve_destructive": {
        if (!["close_account", "delete_data", "anonymize"].includes(request.request_type)) {
          throw new Error("This is not a destructive account request.");
        }
        if (request.requester_type !== "self" && request.verification_status !== "verified") {
          throw new Error("Verify requester authority before destructive approval.");
        }
        const deleteMode = required(formData, "delete_mode", 20);
        if (deleteMode !== "full_delete" && deleteMode !== "anonymize") throw new Error("Choose a valid deletion mode.");
        await patchPrivacyRequest(requestId, {
          status: "approved",
          assigned_to: ctx.userId,
          delete_mode: deleteMode,
          decision_reason: reason || `Owner approved ${deleteMode}.`,
          deletion_not_before: request.deletion_not_before || new Date().toISOString(),
        });
        await addPrivacyEvent(requestId, "destructive_request_approved", ctx.userId, "owner", { reason, delete_mode: deleteMode });
        await notifyCase(request, "Account request approved", reason || "Your account request was approved and will be processed after the required export and deletion hold.");
        break;
      }

      case "deny":
        if (!reason) throw new Error("A decision reason is required when denying a request.");
        await patchPrivacyRequest(requestId, {
          status: "denied",
          assigned_to: ctx.userId,
          decision_reason: reason,
          completed_at: new Date().toISOString(),
        });
        await addPrivacyEvent(requestId, "request_denied", ctx.userId, "admin", { reason });
        await notifyCase(request, "Privacy request decision", `The request was denied. Reason: ${reason}. You may submit an appeal using this case ID: ${requestId}`);
        break;

      case "complete":
        await patchPrivacyRequest(requestId, {
          status: "completed",
          assigned_to: ctx.userId,
          decision_reason: reason || request.payload?.details || "Request completed.",
          completed_at: new Date().toISOString(),
        });
        await addPrivacyEvent(requestId, "request_completed_manually", ctx.userId, "admin", { reason });
        await notifyCase(request, "Privacy request completed", reason || "Your privacy request has been completed.");
        break;

      default:
        throw new Error("Unknown privacy case action.");
    }

    await writeAudit(ctx, {
      action: `privacy.${action}`,
      targetType: "privacy_request",
      targetId: requestId,
      reason,
      newValue: { status_action: action },
    });
  } catch (error) {
    await writeAudit(ctx, {
      action: `privacy.${action}`,
      targetType: "privacy_request",
      targetId: requestId,
      reason,
      success: false,
      failureCategory: "privacy_action_failed",
      newValue: { error: error instanceof Error ? error.message : "unknown" },
    });
    throw error;
  }

  revalidatePath("/admin/privacy");
  revalidatePath("/profile/settings");
}

export async function runPrivacyWorkerAction() {
  const ctx = await authorizeAction("users.delete");
  const results = await processPrivacyQueue(25);
  await writeAudit(ctx, {
    action: "privacy.worker.manual_run",
    targetType: "privacy_queue",
    newValue: { processed: results.length, failures: results.filter((result) => !result.ok).length },
  });
  revalidatePath("/admin/privacy");
}

async function approveAppeal(request: PrivacyRequestRow, actorId: string, reason: string | null) {
  await patchPrivacyRequest(request.id, {
    status: "completed",
    assigned_to: actorId,
    decision_reason: reason || "Appeal approved.",
    completed_at: new Date().toISOString(),
  });
  if (request.appeal_of_request_id) {
    await patchPrivacyRequest(request.appeal_of_request_id, {
      status: "under_review",
      decision_reason: `Reopened after approved appeal ${request.id}.`,
      completed_at: null,
    });
    await addPrivacyEvent(request.appeal_of_request_id, "case_reopened_by_appeal", actorId, "admin", { appeal_request_id: request.id });
  }
  await addPrivacyEvent(request.id, "appeal_approved", actorId, "admin", { reason });
}

async function notifyCase(request: PrivacyRequestRow, subject: string, message: string) {
  const to = request.requester_email || request.requested_email;
  if (!to) return;
  await deliverPrivacyEmail({
    userId: request.subject_user_id || request.user_id,
    to,
    templateKey: "privacy-decision",
    subject,
    text: `${message}\n\nCase reference: ${request.id}\nPrivacy portal: ${privacySiteOrigin()}/privacy/requests`,
    html: `<p>${escapeHtml(message)}</p><p>Case reference: <code>${escapeHtml(request.id)}</code></p><p><a href="${privacySiteOrigin()}/privacy/requests">Privacy request portal</a></p>`,
    payload: { request_id: request.id },
  });
}

function required(formData: FormData, name: string, max: number): string {
  const value = String(formData.get(name) ?? "").trim().slice(0, max);
  if (!value) throw new Error(`Missing ${name.replaceAll("_", " ")}.`);
  return value;
}

function optional(formData: FormData, name: string, max: number): string | null {
  const value = String(formData.get(name) ?? "").trim().slice(0, max);
  return value || null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
