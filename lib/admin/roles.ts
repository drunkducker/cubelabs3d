import "server-only";

import { adminRequest } from "./service-client";
import type { AdminRole } from "./permissions";

export type AdminMemberRow = {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
  note: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listAdminMembers(): Promise<AdminMemberRow[]> {
  try {
    return await adminRequest<AdminMemberRow[]>(
      `/rest/v1/admin_members?select=user_id,role,is_active,note,expires_at,created_at,updated_at&order=created_at.desc`,
    );
  } catch {
    return [];
  }
}

/*
 * Resolve a login email to a user id via the Auth admin API. Used when granting
 * a role by email. Returns null when not found.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  try {
    const res = await adminRequest<{ users?: Array<{ id: string; email?: string }> }>(
      `/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    );
    const match = res.users?.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    return match?.id ?? res.users?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function countActiveOwners(): Promise<number | null> {
  try {
    const rows = await adminRequest<Array<{ user_id: string }>>(
      `/rest/v1/admin_members?role=eq.owner&is_active=eq.true&select=user_id`,
    );
    return rows.length;
  } catch {
    return null;
  }
}
