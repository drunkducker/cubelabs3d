import "server-only";

import { adminJson, createSignedObjectUrl } from "@/lib/privacy/supabase-admin";
import type { AvatarSubmissionRow, PrivacyRequestRow } from "@/lib/privacy/service";

export type PrivacyCaseAdminRow = PrivacyRequestRow & {
  requester_name: string | null;
  relationship_to_subject: string | null;
  jurisdiction: string | null;
  extended_due_at: string | null;
  assigned_to: string | null;
  decision_reason: string | null;
  error_message: string | null;
  completed_at: string | null;
  profile: {
    id: string;
    display_name: string | null;
    username: string | null;
    cube_tag: string | null;
    account_status: string | null;
  } | null;
  evidenceUrl: string | null;
  effectiveDueAt: string | null;
  overdue: boolean;
  events: Array<{
    id: string;
    event_type: string;
    actor_type: string;
    detail: Record<string, unknown>;
    created_at: string;
  }>;
};

export type AvatarAdminRow = AvatarSubmissionRow & {
  previewUrl: string | null;
  profile: {
    id: string;
    display_name: string | null;
    username: string | null;
    cube_tag: string | null;
  } | null;
};

export async function getPrivacyAdminData(): Promise<{
  cases: PrivacyCaseAdminRow[];
  avatars: AvatarAdminRow[];
  overdueCount: number;
}> {
  const [requests, avatars] = await Promise.all([
    adminJson<Array<PrivacyRequestRow & {
      requester_name: string | null;
      relationship_to_subject: string | null;
      jurisdiction: string | null;
      extended_due_at: string | null;
      assigned_to: string | null;
      decision_reason: string | null;
      error_message: string | null;
      completed_at: string | null;
    }>>(
      "/rest/v1/account_data_requests?select=*&status=not.in.(cancelled,expired)&order=due_at.asc&order=created_at.desc&limit=100",
    ).catch(() => []),
    adminJson<AvatarSubmissionRow[]>(
      "/rest/v1/avatar_submissions?select=*&status=eq.pending&order=submitted_at.asc&limit=100",
    ).catch(() => []),
  ]);

  const userIds = Array.from(new Set([
    ...requests.flatMap((row) => [row.subject_user_id, row.user_id]),
    ...avatars.map((row) => row.user_id),
  ].filter((value): value is string => Boolean(value))));
  const profiles = userIds.length
    ? await adminJson<Array<{
        id: string;
        display_name: string | null;
        username: string | null;
        cube_tag: string | null;
        account_status: string | null;
      }>>(
        `/rest/v1/profiles?id=in.(${userIds.join(",")})&select=id,display_name,username,cube_tag,account_status`,
      ).catch(() => [])
    : [];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const requestIds = requests.map((row) => row.id);
  const eventRows = requestIds.length
    ? await adminJson<Array<{
        id: string;
        request_id: string;
        event_type: string;
        actor_type: string;
        detail: Record<string, unknown>;
        created_at: string;
      }>>(
        `/rest/v1/privacy_request_events?request_id=in.(${requestIds.join(",")})&select=id,request_id,event_type,actor_type,detail,created_at&order=created_at.desc&limit=500`,
      ).catch(() => [])
    : [];

  const cases = await Promise.all(requests.map(async (request): Promise<PrivacyCaseAdminRow> => {
    const evidencePath = typeof request.payload?.evidence_path === "string" ? request.payload.evidence_path : null;
    const evidenceUrl = evidencePath
      ? await createSignedObjectUrl("privacy-evidence", evidencePath, 15 * 60).catch(() => null)
      : null;
    const effectiveDueAt = request.extended_due_at || request.due_at;
    const profileId = request.subject_user_id || request.user_id;
    return {
      ...request,
      profile: profileId ? profileMap.get(profileId) ?? null : null,
      evidenceUrl,
      effectiveDueAt,
      overdue: Boolean(effectiveDueAt && new Date(effectiveDueAt).getTime() < Date.now() && !["completed","denied"].includes(request.status)),
      events: eventRows
        .filter((event) => event.request_id === request.id)
        .slice(0, 8)
        .map(({ request_id: _requestId, ...event }) => event),
    };
  }));

  const avatarRows = await Promise.all(avatars.map(async (avatar): Promise<AvatarAdminRow> => ({
    ...avatar,
    previewUrl: await createSignedObjectUrl("avatar-review", avatar.storage_path, 15 * 60).catch(() => null),
    profile: avatar.user_id ? profileMap.get(avatar.user_id) ?? null : null,
  })));

  return {
    cases,
    avatars: avatarRows,
    overdueCount: cases.filter((row) => row.overdue).length,
  };
}
