import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { deliverPrivacyEmail, privacySiteOrigin } from "./email";
import {
  adminJson,
  createSignedObjectUrl,
  deleteObjects,
  downloadObject,
  listOwnedStorageObjects,
  publicObjectUrl,
  uploadObject,
} from "./supabase-admin";
import { addUtcDays, safeStorageSegment, validateAvatarBytes } from "./policy";

export type PrivacyRequestType =
  | "export"
  | "close_account"
  | "delete_data"
  | "anonymize"
  | "correction"
  | "appeal"
  | "authorized_agent"
  | "parent_request";

export type PrivacyRequestRow = {
  id: string;
  user_id: string | null;
  subject_user_id: string | null;
  request_type: PrivacyRequestType;
  status: string;
  requester_type: string;
  requested_email: string | null;
  requester_email: string | null;
  subject_email: string | null;
  verification_status: string;
  verification_expires_at: string | null;
  verified_at: string | null;
  due_at: string | null;
  deletion_not_before: string | null;
  export_before_delete: boolean;
  delete_mode: "full_delete" | "anonymize";
  payload: Record<string, unknown> | null;
  export_path: string | null;
  export_expires_at: string | null;
  delivery_status: string;
  appeal_of_request_id: string | null;
  created_at: string;
};

export type AvatarSubmissionRow = {
  id: string;
  user_id: string | null;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  crop: Record<string, unknown> | null;
  status: string;
  submitted_at: string;
  moderation_reason: string | null;
  published_path: string | null;
};

type AuthAdminUser = {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: unknown[];
};

const EXPORT_BUCKET = "privacy-exports";
const REVIEW_BUCKET = "avatar-review";
const AVATAR_BUCKET = "avatars";
const EXPORT_LINK_SECONDS = 7 * 24 * 60 * 60;

export async function createVerifiedAccountRequest(input: {
  userId: string;
  email?: string | null;
  requestType: "export" | "close_account" | "delete_data" | "anonymize" | "correction" | "appeal";
  exportBeforeDelete?: boolean;
  deleteMode?: "full_delete" | "anonymize";
  payload?: Record<string, unknown>;
  appealOfRequestId?: string | null;
  jurisdiction?: string | null;
}): Promise<string> {
  const now = new Date().toISOString();
  const rows = await adminJson<Array<{ id: string }>>("/rest/v1/account_data_requests?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: input.userId,
      subject_user_id: input.userId,
      request_type: input.requestType,
      status: "queued",
      requester_type: "self",
      intake_channel: "account",
      requested_email: input.email ?? null,
      requester_email: input.email ?? null,
      subject_email: input.email ?? null,
      verification_status: "verified",
      verified_at: now,
      export_before_delete: Boolean(input.exportBeforeDelete),
      delete_mode: input.deleteMode ?? (input.requestType === "anonymize" ? "anonymize" : "full_delete"),
      payload: input.payload ?? {},
      appeal_of_request_id: input.appealOfRequestId ?? null,
      jurisdiction: input.jurisdiction ?? null,
    }),
  });
  const id = rows[0]?.id;
  if (!id) throw new Error("Privacy request was not created.");
  await addPrivacyEvent(id, "request_created", input.userId, "user", {
    channel: "account",
    request_type: input.requestType,
  });
  return id;
}

export async function createPublicPrivacyRequest(input: {
  requestType: "export" | "delete_data" | "correction" | "appeal" | "authorized_agent" | "parent_request";
  requesterType: "self" | "parent" | "guardian" | "authorized_agent";
  requesterName: string;
  requesterEmail: string;
  subjectEmail?: string | null;
  relationshipToSubject?: string | null;
  jurisdiction?: string | null;
  payload?: Record<string, unknown>;
  appealOfRequestId?: string | null;
}): Promise<{ id: string; emailSent: boolean }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const normalizedRequesterEmail = input.requesterEmail.trim().toLowerCase();
  const normalizedSubjectEmail = input.subjectEmail?.trim().toLowerCase() || null;
  const subjectReferenceHash = normalizedSubjectEmail ? sha256(`subject:${normalizedSubjectEmail}`) : null;

  const rows = await adminJson<Array<{ id: string }>>("/rest/v1/account_data_requests?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      request_type: input.requestType,
      status: "awaiting_verification",
      requester_type: input.requesterType,
      intake_channel: "public_form",
      requested_email: normalizedRequesterEmail,
      requester_email: normalizedRequesterEmail,
      subject_email: normalizedSubjectEmail,
      requester_name: input.requesterName.trim().slice(0, 120),
      relationship_to_subject: input.relationshipToSubject?.trim().slice(0, 160) || null,
      jurisdiction: input.jurisdiction?.trim().slice(0, 32) || null,
      verification_status: "email_sent",
      verification_token_hash: tokenHash,
      verification_expires_at: expiresAt,
      payload: input.payload ?? {},
      appeal_of_request_id: input.appealOfRequestId ?? null,
      export_before_delete: input.requestType === "delete_data",
      delete_mode: "full_delete",
      subject_reference_hash: subjectReferenceHash,
    }),
  });
  const id = rows[0]?.id;
  if (!id) throw new Error("Privacy request was not created.");

  await addPrivacyEvent(id, "verification_email_requested", null, "requester", {
    requester_type: input.requesterType,
  });

  const verifyUrl = `${privacySiteOrigin()}/privacy/requests/verify?token=${encodeURIComponent(token)}`;
  const delivery = await deliverPrivacyEmail({
    to: normalizedRequesterEmail,
    templateKey: input.requestType === "parent_request" ? "parent-request" : "privacy-verification",
    subject: "Verify your Cube Labs privacy request",
    text: `Verify your request using this one-time link within 24 hours:\n\n${verifyUrl}\n\nIf you did not submit this request, you can ignore this message.`,
    html: `<p>Verify your Cube Labs privacy request using this one-time link within 24 hours:</p><p><a href="${escapeHtml(verifyUrl)}">Verify privacy request</a></p><p>If you did not submit this request, you can ignore this message.</p>`,
    payload: { request_id: id, verification_expires_at: expiresAt },
  });

  if (!delivery.sent) {
    await addPrivacyEvent(id, "verification_delivery_failed", null, "system", {
      error: delivery.error ?? "mail unavailable",
    });
  }
  return { id, emailSent: delivery.sent };
}

export async function verifyPublicPrivacyToken(token: string): Promise<{ ok: boolean; requestId?: string; message: string }> {
  if (!token || token.length < 20) return { ok: false, message: "This verification link is invalid." };
  const hash = sha256(token);
  const rows = await adminJson<PrivacyRequestRow[]>(
    `/rest/v1/account_data_requests?verification_token_hash=eq.${encodeURIComponent(hash)}&select=*&limit=1`,
  );
  const request = rows[0];
  if (!request) return { ok: false, message: "This verification link is invalid or already used." };
  if (!request.verification_expires_at || new Date(request.verification_expires_at).getTime() < Date.now()) {
    await patchPrivacyRequest(request.id, {
      verification_status: "expired",
      status: "expired",
      verification_token_hash: null,
    });
    return { ok: false, requestId: request.id, message: "This verification link has expired." };
  }

  await patchPrivacyRequest(request.id, {
    verification_status: request.requester_type === "self" ? "verified" : "manual_review",
    verified_at: new Date().toISOString(),
    verification_token_hash: null,
    status: "under_review",
  });
  await addPrivacyEvent(request.id, "requester_email_verified", null, "requester", {
    requester_type: request.requester_type,
  });
  return {
    ok: true,
    requestId: request.id,
    message: request.requester_type === "self"
      ? "Your request is verified and has entered review."
      : "Your email is verified. We will now review your authority to act for the account holder.",
  };
}

export async function submitAvatarForModeration(input: {
  userId: string;
  file: File;
  width?: number | null;
  height?: number | null;
  crop?: Record<string, number>;
}): Promise<string> {
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const validation = validateAvatarBytes(bytes, input.file.type);
  if (!validation.ok || !validation.mimeType) throw new Error(validation.error || "Invalid avatar image.");
  if (input.width && input.height && (input.width !== input.height || input.width < 256 || input.width > 1024)) {
    throw new Error("Crop the avatar to a square between 256 and 1024 pixels.");
  }

  const pending = await adminJson<AvatarSubmissionRow[]>(
    `/rest/v1/avatar_submissions?user_id=eq.${encodeURIComponent(input.userId)}&status=eq.pending&select=*`,
  ).catch(() => []);
  for (const row of pending) {
    await deleteObjects(REVIEW_BUCKET, [row.storage_path]).catch(() => undefined);
    await adminJson(`/rest/v1/avatar_submissions?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "withdrawn", moderation_reason: "Replaced by a newer submission." }),
    });
  }

  const extension = validation.mimeType === "image/jpeg" ? "jpg" : validation.mimeType === "image/png" ? "png" : "webp";
  const path = `${safeStorageSegment(input.userId)}/${randomUUID()}.${extension}`;
  await uploadObject({
    bucket: REVIEW_BUCKET,
    path,
    bytes,
    contentType: validation.mimeType,
  });

  const rows = await adminJson<Array<{ id: string }>>("/rest/v1/avatar_submissions?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: input.userId,
      storage_path: path,
      mime_type: validation.mimeType,
      byte_size: bytes.length,
      width: input.width ?? null,
      height: input.height ?? null,
      crop: input.crop ?? {},
      sha256: sha256(bytes),
      status: "pending",
    }),
  });
  await adminJson(`/rest/v1/profiles?id=eq.${encodeURIComponent(input.userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ avatar_status: "pending" }),
  });
  return rows[0]?.id ?? "";
}

export async function deleteProfileAvatar(userId: string): Promise<void> {
  const profiles = await adminJson<Array<{ avatar_path: string | null }>>(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=avatar_path&limit=1`,
  );
  const pending = await adminJson<AvatarSubmissionRow[]>(
    `/rest/v1/avatar_submissions?user_id=eq.${encodeURIComponent(userId)}&status=eq.pending&select=*`,
  ).catch(() => []);
  if (profiles[0]?.avatar_path) await deleteObjects(AVATAR_BUCKET, [profiles[0].avatar_path]).catch(() => undefined);
  if (pending.length) await deleteObjects(REVIEW_BUCKET, pending.map((row) => row.storage_path)).catch(() => undefined);
  if (pending.length) {
    await adminJson(`/rest/v1/avatar_submissions?user_id=eq.${encodeURIComponent(userId)}&status=eq.pending`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "withdrawn", moderation_reason: "Removed by account holder." }),
    });
  }
  await adminJson(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      avatar_url: null,
      avatar_path: null,
      avatar_status: "none",
      avatar_updated_at: new Date().toISOString(),
    }),
  });
}

export async function moderateAvatar(input: {
  submissionId: string;
  reviewerId: string;
  decision: "approve" | "reject";
  reason?: string | null;
}): Promise<void> {
  const rows = await adminJson<AvatarSubmissionRow[]>(
    `/rest/v1/avatar_submissions?id=eq.${encodeURIComponent(input.submissionId)}&select=*&limit=1`,
  );
  const submission = rows[0];
  if (!submission || submission.status !== "pending" || !submission.user_id) {
    throw new Error("This avatar submission is no longer pending.");
  }

  if (input.decision === "reject") {
    await deleteObjects(REVIEW_BUCKET, [submission.storage_path]).catch(() => undefined);
    await adminJson(`/rest/v1/avatar_submissions?id=eq.${encodeURIComponent(submission.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "rejected",
        moderation_reason: input.reason?.trim().slice(0, 500) || "Avatar did not meet community guidelines.",
        reviewed_at: new Date().toISOString(),
        reviewed_by: input.reviewerId,
      }),
    });
    await adminJson(`/rest/v1/profiles?id=eq.${encodeURIComponent(submission.user_id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ avatar_status: "rejected" }),
    });
    return;
  }

  const bytes = await downloadObject(REVIEW_BUCKET, submission.storage_path);
  const extension = submission.mime_type === "image/jpeg" ? "jpg" : submission.mime_type === "image/png" ? "png" : "webp";
  const publishedPath = `${safeStorageSegment(submission.user_id)}/avatar-${Date.now()}.${extension}`;
  const profiles = await adminJson<Array<{ avatar_path: string | null }>>(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(submission.user_id)}&select=avatar_path&limit=1`,
  );

  await uploadObject({
    bucket: AVATAR_BUCKET,
    path: publishedPath,
    bytes,
    contentType: submission.mime_type,
    upsert: false,
  });
  if (profiles[0]?.avatar_path) await deleteObjects(AVATAR_BUCKET, [profiles[0].avatar_path]).catch(() => undefined);
  await deleteObjects(REVIEW_BUCKET, [submission.storage_path]).catch(() => undefined);

  await adminJson(`/rest/v1/profiles?id=eq.${encodeURIComponent(submission.user_id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      avatar_url: publicObjectUrl(AVATAR_BUCKET, publishedPath),
      avatar_path: publishedPath,
      avatar_status: "approved",
      avatar_updated_at: new Date().toISOString(),
    }),
  });
  await adminJson(`/rest/v1/avatar_submissions?id=eq.${encodeURIComponent(submission.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "approved",
      moderation_reason: input.reason?.trim().slice(0, 500) || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.reviewerId,
      published_path: publishedPath,
    }),
  });
}

export async function processPrivacyQueue(limit = 10): Promise<Array<{ id: string; ok: boolean; action: string; error?: string }>> {
  const boundedLimit = Math.min(25, Math.max(1, limit));
  const rows = await adminJson<PrivacyRequestRow[]>(
    `/rest/v1/account_data_requests?request_type=in.(export,close_account,delete_data,anonymize)&status=in.(queued,approved,ready)&verification_status=in.(verified,waived)&select=*&order=created_at.asc&limit=${boundedLimit}`,
  );
  const results: Array<{ id: string; ok: boolean; action: string; error?: string }> = [];

  for (const request of rows) {
    const destructive = ["close_account", "delete_data", "anonymize"].includes(request.request_type);
    if (destructive && request.deletion_not_before && new Date(request.deletion_not_before).getTime() > Date.now()) {
      results.push({ id: request.id, ok: true, action: "waiting_for_deletion_window" });
      continue;
    }

    const claimed = await adminJson<PrivacyRequestRow[]>(
      `/rest/v1/account_data_requests?id=eq.${encodeURIComponent(request.id)}&status=in.(queued,approved,ready)&select=*`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "processing", error_message: null }),
      },
    ).catch(() => []);
    if (!claimed.length) continue;

    try {
      if (request.request_type === "export") {
        await prepareAndDeliverExport(request);
        results.push({ id: request.id, ok: true, action: "export_completed" });
        continue;
      }

      let refreshed = request;
      if (request.export_before_delete && !request.export_path) {
        refreshed = await prepareAndDeliverExport(request, true);
      }
      if (refreshed.export_before_delete && refreshed.delivery_status !== "sent") {
        await patchPrivacyRequest(request.id, {
          status: "ready",
          error_message: "Export is ready, but account deletion is paused until delivery succeeds.",
        });
        results.push({ id: request.id, ok: true, action: "deletion_paused_for_export_delivery" });
        continue;
      }

      const subjectUserId = refreshed.subject_user_id ?? refreshed.user_id;
      if (!subjectUserId) throw new Error("Request no longer has an account subject.");
      if (refreshed.delete_mode === "anonymize" || refreshed.request_type === "anonymize") {
        await anonymizeAccount(subjectUserId, refreshed.id);
        results.push({ id: request.id, ok: true, action: "account_anonymized" });
      } else {
        await hardDeleteAccount(subjectUserId, refreshed.id);
        results.push({ id: request.id, ok: true, action: "account_deleted" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Privacy worker failed.";
      await patchPrivacyRequest(request.id, { status: "failed", error_message: message });
      await addPrivacyEvent(request.id, "worker_failed", null, "system", { error: message });
      results.push({ id: request.id, ok: false, action: "failed", error: message });
    }
  }
  return results;
}

export async function prepareAndDeliverExport(
  request: PrivacyRequestRow,
  keepRequestOpen = false,
): Promise<PrivacyRequestRow> {
  const userId = request.subject_user_id ?? request.user_id;
  if (!userId) throw new Error("Cannot export a request without a subject account.");
  const packageData = await collectUserExport(userId, request.id);
  const serialized = JSON.stringify(packageData, null, 2);
  const bytes = new TextEncoder().encode(serialized);
  const path = `${safeStorageSegment(userId)}/${safeStorageSegment(request.id)}.json`;
  await uploadObject({
    bucket: EXPORT_BUCKET,
    path,
    bytes,
    contentType: "application/json",
    upsert: true,
  });
  const exportExpiresAt = addUtcDays(new Date(), 7).toISOString();
  const signedUrl = await createSignedObjectUrl(EXPORT_BUCKET, path, EXPORT_LINK_SECONDS);
  const recipient = request.requested_email || request.requester_email || packageData.account.email;
  if (!recipient) throw new Error("No verified email address is available for export delivery.");

  const delivery = await deliverPrivacyEmail({
    userId,
    to: recipient,
    templateKey: "account-data-export",
    subject: "Your Cube Labs data export is ready",
    text: `Your Cube Labs data export is ready. This secure link expires in 7 days:\n\n${signedUrl}\n\nCase reference: ${request.id}`,
    html: `<p>Your Cube Labs data export is ready.</p><p><a href="${escapeHtml(signedUrl)}">Download your export</a></p><p>This secure link expires in 7 days.</p><p>Case reference: <code>${escapeHtml(request.id)}</code></p>`,
    payload: { request_id: request.id, export_expires_at: exportExpiresAt },
  });

  const patch = {
    export_path: path,
    export_sha256: sha256(bytes),
    export_bytes: bytes.length,
    export_expires_at: exportExpiresAt,
    delivery_status: delivery.sent ? "sent" : "queued",
    status: keepRequestOpen ? (delivery.sent ? "approved" : "ready") : "completed",
    completed_at: keepRequestOpen ? null : new Date().toISOString(),
    error_message: delivery.sent ? null : delivery.error ?? "Export email is queued.",
  };
  const updated = await patchPrivacyRequest(request.id, patch);
  await addPrivacyEvent(request.id, "export_prepared", null, "system", {
    bytes: bytes.length,
    sha256: patch.export_sha256,
    delivery_status: patch.delivery_status,
  });
  return updated ?? { ...request, ...patch } as PrivacyRequestRow;
}

async function collectUserExport(userId: string, requestId: string) {
  const [auth, profile, solves, attempts, memories, collection, achievements, stats, friendships, challenges, challengeAttempts, activity, notifications, preferences, messages, privacyRequests, avatars] = await Promise.all([
    safeOne<AuthAdminUser>(`/auth/v1/admin/users/${encodeURIComponent(userId)}`),
    safeRows(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*`),
    safeRows(`/rest/v1/solve_results?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`),
    safeRows(`/rest/v1/scramble_attempts?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`),
    safeRows(`/rest/v1/solver_memories?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`),
    safeRows(`/rest/v1/cube_collection?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`),
    safeRows(`/rest/v1/user_achievements?user_id=eq.${encodeURIComponent(userId)}&select=*&order=unlocked_at.asc`),
    safeRows(`/rest/v1/user_stats?user_id=eq.${encodeURIComponent(userId)}&select=*`),
    safeRows(`/rest/v1/friendships?or=(requester_id.eq.${userId},addressee_id.eq.${userId})&select=*&order=created_at.asc`),
    safeRows(`/rest/v1/challenges?or=(creator_id.eq.${userId},sender_id.eq.${userId},recipient_id.eq.${userId})&select=*&order=created_at.asc`),
    safeRows(`/rest/v1/challenge_attempts?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`),
    safeRows(`/rest/v1/activity_events?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`),
    safeRows(`/rest/v1/notifications?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`),
    safeRows(`/rest/v1/notification_preferences?user_id=eq.${encodeURIComponent(userId)}&select=*`),
    safeRows(`/rest/v1/mail_messages?user_id=eq.${encodeURIComponent(userId)}&select=id,recipient_email,template_key,category,subject,status,queued_at,sent_at,delivered_at`),
    safeRows(`/rest/v1/account_data_requests?or=(user_id.eq.${userId},subject_user_id.eq.${userId})&select=id,request_type,status,requester_type,intake_channel,due_at,decision_reason,created_at,completed_at`),
    safeRows(`/rest/v1/avatar_submissions?user_id=eq.${encodeURIComponent(userId)}&select=id,mime_type,byte_size,width,height,status,submitted_at,reviewed_at,moderation_reason`),
  ]);

  return {
    schema: "cube-labs-user-export/v1",
    generated_at: new Date().toISOString(),
    request_id: requestId,
    account: auth
      ? {
          id: auth.id,
          email: auth.email ?? null,
          phone: auth.phone ?? null,
          created_at: auth.created_at ?? null,
          updated_at: auth.updated_at ?? null,
          last_sign_in_at: auth.last_sign_in_at ?? null,
          app_metadata: auth.app_metadata ?? {},
          user_metadata: auth.user_metadata ?? {},
          identities: auth.identities ?? [],
        }
      : { id: userId, email: null },
    data: {
      profile,
      solve_results: solves,
      scramble_attempts: attempts,
      solver_memories: memories,
      cube_collection: collection,
      user_achievements: achievements,
      user_stats: stats,
      friendships,
      challenges,
      challenge_attempts: challengeAttempts,
      activity_events: activity,
      notifications,
      notification_preferences: preferences,
      mail_history: messages,
      privacy_requests: privacyRequests,
      avatar_moderation_history: avatars,
    },
  };
}

async function hardDeleteAccount(userId: string, requestId: string): Promise<void> {
  await addPrivacyEvent(requestId, "hard_delete_started", null, "system", {});
  const ownedObjects = await listOwnedStorageObjects(userId).catch(() => []);
  const byBucket = new Map<string, string[]>();
  for (const object of ownedObjects) {
    if (object.bucket_id === EXPORT_BUCKET) continue;
    const paths = byBucket.get(object.bucket_id) ?? [];
    paths.push(object.name);
    byBucket.set(object.bucket_id, paths);
  }
  for (const [bucket, paths] of byBucket) await deleteObjects(bucket, paths);

  const avatarRows = await safeRows(`/rest/v1/avatar_submissions?user_id=eq.${encodeURIComponent(userId)}&select=storage_path,published_path`);
  const reviewPaths = avatarRows.map((row) => String(row.storage_path || "")).filter(Boolean);
  const publicPaths = avatarRows.map((row) => String(row.published_path || "")).filter(Boolean);
  if (reviewPaths.length) await deleteObjects(REVIEW_BUCKET, reviewPaths).catch(() => undefined);
  if (publicPaths.length) await deleteObjects(AVATAR_BUCKET, publicPaths).catch(() => undefined);

  await patchPrivacyRequest(requestId, {
    subject_reference_hash: sha256(`deleted:${userId}`),
    status: "processing",
  });
  await adminJson(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  await patchPrivacyRequest(requestId, {
    status: "completed",
    delivery_status: "sent",
    completed_at: new Date().toISOString(),
    error_message: null,
  });
  await addPrivacyEvent(requestId, "account_hard_deleted", null, "system", {});
}

async function anonymizeAccount(userId: string, requestId: string): Promise<void> {
  await addPrivacyEvent(requestId, "anonymization_started", null, "system", {});
  const auth = await safeOne<AuthAdminUser>(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
  await deleteProfileAvatar(userId).catch(() => undefined);

  await Promise.all([
    safeDelete(`/rest/v1/friendships?or=(requester_id.eq.${userId},addressee_id.eq.${userId})`),
    safeDelete(`/rest/v1/challenges?or=(creator_id.eq.${userId},sender_id.eq.${userId},recipient_id.eq.${userId})`),
    safeDelete(`/rest/v1/activity_events?user_id=eq.${encodeURIComponent(userId)}`),
    safeDelete(`/rest/v1/notifications?user_id=eq.${encodeURIComponent(userId)}`),
    safeDelete(`/rest/v1/mail_messages?user_id=eq.${encodeURIComponent(userId)}`),
  ]);

  const suffix = userId.replace(/-/g, "").slice(0, 10);
  await adminJson(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      display_name: "Deleted Player",
      username: null,
      cube_tag: `deleted#${suffix.slice(0, 4).toUpperCase()}`,
      public_slug: `deleted-${suffix}`,
      bio: null,
      title: "Former Player",
      country_code: null,
      region: null,
      profile_visibility: "private",
      show_location: false,
      show_collection: false,
      show_activity: false,
      age_band: null,
      guardian_status: "not_required",
      account_status: "anonymized",
      anonymized_at: new Date().toISOString(),
    }),
  });

  await adminJson(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify({
      email: `deleted+${suffix}@privacy.invalid`,
      email_confirm: true,
      password: randomBytes(36).toString("base64url"),
      ban_duration: "876000h",
      user_metadata: {},
      app_metadata: { account_status: "anonymized" },
    }),
  });

  await patchPrivacyRequest(requestId, {
    subject_reference_hash: sha256(`anonymized:${userId}:${auth?.email ?? ""}`),
    status: "completed",
    completed_at: new Date().toISOString(),
    delivery_status: "not_required",
    error_message: null,
  });
  await addPrivacyEvent(requestId, "account_anonymized", null, "system", {});
}

export async function applyProfileCorrection(requestId: string, actorId: string): Promise<void> {
  const rows = await adminJson<PrivacyRequestRow[]>(
    `/rest/v1/account_data_requests?id=eq.${encodeURIComponent(requestId)}&select=*&limit=1`,
  );
  const request = rows[0];
  const userId = request?.subject_user_id ?? request?.user_id;
  if (!request || request.request_type !== "correction" || !userId) throw new Error("Correction request is invalid.");
  const requested = request.payload?.fields;
  if (!requested || typeof requested !== "object" || Array.isArray(requested)) {
    throw new Error("Correction request does not contain structured fields.");
  }
  const input = requested as Record<string, unknown>;
  const allowed: Record<string, number> = {
    display_name: 60,
    username: 40,
    bio: 220,
    title: 80,
    favorite_puzzle: 20,
    region: 80,
    country_code: 2,
  };
  const patch: Record<string, string | null> = {};
  for (const [key, max] of Object.entries(allowed)) {
    if (!(key in input)) continue;
    const value = input[key];
    patch[key] = value == null ? null : String(value).trim().slice(0, max);
  }
  if (!Object.keys(patch).length) throw new Error("No supported correction fields were supplied.");
  if (patch.country_code) patch.country_code = patch.country_code.toUpperCase();
  await adminJson(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  await patchPrivacyRequest(request.id, {
    status: "completed",
    completed_at: new Date().toISOString(),
    decision_reason: "Requested profile correction applied.",
  });
  await addPrivacyEvent(request.id, "correction_applied", actorId, "admin", { fields: Object.keys(patch) });
}

export async function addPrivacyEvent(
  requestId: string,
  eventType: string,
  actorId: string | null,
  actorType: string,
  detail: Record<string, unknown>,
): Promise<void> {
  await adminJson("/rest/v1/privacy_request_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      request_id: requestId,
      event_type: eventType,
      actor_id: actorId,
      actor_type: actorType,
      detail,
    }),
  }).catch(() => undefined);
}

export async function patchPrivacyRequest(
  requestId: string,
  body: Record<string, unknown>,
): Promise<PrivacyRequestRow | null> {
  const rows = await adminJson<PrivacyRequestRow[]>(
    `/rest/v1/account_data_requests?id=eq.${encodeURIComponent(requestId)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    },
  );
  return rows[0] ?? null;
}

async function safeRows(path: string): Promise<Array<Record<string, unknown>>> {
  return adminJson<Array<Record<string, unknown>>>(path).catch(() => []);
}

async function safeOne<T>(path: string): Promise<T | null> {
  return adminJson<T>(path).catch(() => null);
}

async function safeDelete(path: string): Promise<void> {
  await adminJson(path, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => undefined);
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
