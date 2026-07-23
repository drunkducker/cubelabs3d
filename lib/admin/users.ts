import "server-only";

import { adminRequest } from "./service-client";
import { normalizeText } from "./validation";

/*
 * User administration data access. All reads use the service role and return
 * only the minimum fields the admin UI needs. Search is bounded and paginated;
 * we never ship the whole user table to the browser.
 */

export type AdminUserRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  cube_tag: string | null;
  public_slug: string | null;
  profile_visibility: string | null;
  created_at: string;
};

export type UserSearchParams = {
  query?: string;
  page?: number;
  pageSize?: number;
};

const MAX_PAGE_SIZE = 50;

function encode(value: string): string {
  return encodeURIComponent(value);
}

export async function searchUsers(params: UserSearchParams): Promise<{ rows: AdminUserRow[]; page: number; pageSize: number }> {
  const page = Math.max(0, params.page ?? 0);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? 25));
  const q = normalizeText(params.query ?? "", 120);

  const select = "id,display_name,username,cube_tag,public_slug,profile_visibility,created_at";
  let filter = "";
  if (q) {
    // Match a UUID exactly, otherwise search identity fields (case-insensitive).
    if (/^[0-9a-f-]{36}$/i.test(q)) {
      filter = `&id=eq.${q}`;
    } else {
      const like = `*${encode(q)}*`;
      filter = `&or=(display_name.ilike.${like},username.ilike.${like},cube_tag.ilike.${like},public_slug.ilike.${like})`;
    }
  }
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const rows = await adminRequest<AdminUserRow[]>(
    `/rest/v1/profiles?select=${select}${filter}&order=created_at.desc`,
    { headers: { Range: `${from}-${to}` } },
  );
  return { rows: rows ?? [], page, pageSize };
}

export type UserAdminDetails = {
  profile: (AdminUserRow & { title: string | null; bio: string | null; favorite_puzzle: string | null }) | null;
  auth: { email: string | null; last_sign_in_at: string | null; banned_until: string | null } | null;
  admin: { role: string; is_active: boolean } | null;
  stats: { total_solves: number; solved_count: number; current_streak: number } | null;
  solveCount: number | null;
  challengeCount: number | null;
  recentReports: Array<{ id: string; target_type: string; status: string; created_at: string }>;
  auditTrail: Array<{ id: string; action: string; actor_role: string | null; success: boolean; created_at: string }>;
};

export async function getUserAdminDetails(userId: string): Promise<UserAdminDetails> {
  const id = normalizeText(userId, 64);
  const [profiles, authUser, adminRows, statsRows, reports, audit] = await Promise.all([
    adminRequest<Array<UserAdminDetails["profile"] & object>>(
      `/rest/v1/profiles?id=eq.${id}&select=id,display_name,username,cube_tag,public_slug,profile_visibility,created_at,title,bio,favorite_puzzle`,
    ).catch(() => []),
    adminRequest<{ email?: string; last_sign_in_at?: string; banned_until?: string }>(
      `/auth/v1/admin/users/${id}`,
    ).catch(() => null),
    adminRequest<Array<{ role: string; is_active: boolean }>>(
      `/rest/v1/admin_members?user_id=eq.${id}&select=role,is_active`,
    ).catch(() => []),
    adminRequest<Array<{ total_solves: number; solved_count: number; current_streak: number }>>(
      `/rest/v1/user_stats?user_id=eq.${id}&select=total_solves,solved_count,current_streak`,
    ).catch(() => []),
    adminRequest<UserAdminDetails["recentReports"]>(
      `/rest/v1/moderation_reports?target_id=eq.${id}&target_type=eq.user&select=id,target_type,status,created_at&order=created_at.desc&limit=5`,
    ).catch(() => []),
    adminRequest<UserAdminDetails["auditTrail"]>(
      `/rest/v1/admin_audit_log?target_id=eq.${id}&select=id,action,actor_role,success,created_at&order=created_at.desc&limit=10`,
    ).catch(() => []),
  ]);

  return {
    profile: (profiles?.[0] as UserAdminDetails["profile"]) ?? null,
    auth: authUser
      ? { email: authUser.email ?? null, last_sign_in_at: authUser.last_sign_in_at ?? null, banned_until: authUser.banned_until ?? null }
      : null,
    admin: adminRows?.[0] ?? null,
    stats: statsRows?.[0] ?? null,
    solveCount: null,
    challengeCount: null,
    recentReports: reports ?? [],
    auditTrail: audit ?? [],
  };
}

/*
 * Suspend / restore an account via the Supabase Auth admin API (ban_duration).
 * Reversible by design; permanent deletion lives in a separate owner-only path.
 */
export async function setUserBan(userId: string, ban: boolean): Promise<void> {
  await adminRequest(`/auth/v1/admin/users/${normalizeText(userId, 64)}`, {
    method: "PUT",
    body: JSON.stringify({ ban_duration: ban ? "876000h" : "none" }),
  });
}

export async function requestPasswordResetFor(email: string, redirectTo: string): Promise<void> {
  await adminRequest(`/auth/v1/recover`, {
    method: "POST",
    body: JSON.stringify({ email: normalizeText(email, 254), redirect_to: redirectTo }),
  });
}
