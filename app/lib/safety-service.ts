import { supabaseRequest } from "@/app/lib/supabase-rest";

/*
 * Read helpers for user-facing safety features (account blocks). Reporting is
 * write-only from the member side, so it has no read helper here; the admin
 * moderation queue consumes reports via the service role.
 */

export type BlockedProfile = {
  block_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
  display_name: string | null;
  username: string | null;
  cube_tag: string | null;
  public_slug: string | null;
};

type BlockRow = {
  id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
};

type ProfileLite = {
  id: string;
  display_name: string | null;
  username: string | null;
  cube_tag: string | null;
  public_slug: string | null;
};

/** IDs of accounts the given user has blocked. Fails soft to an empty list. */
export async function getBlockedIds(token: string | null, userId: string): Promise<string[]> {
  if (!token) return [];
  try {
    const rows = await supabaseRequest<{ blocked_id: string }[]>(
      `/rest/v1/user_blocks?blocker_id=eq.${userId}&select=blocked_id`,
      {},
      token,
    );
    return rows.map((row) => row.blocked_id);
  } catch {
    return [];
  }
}

/** Whether `userId` has blocked `targetId`. */
export async function hasBlocked(token: string | null, userId: string, targetId: string): Promise<boolean> {
  if (!token) return false;
  try {
    const rows = await supabaseRequest<{ id: string }[]>(
      `/rest/v1/user_blocks?blocker_id=eq.${userId}&blocked_id=eq.${targetId}&select=id&limit=1`,
      {},
      token,
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Blocked accounts with lightweight profile details, newest first. */
export async function getBlockedProfiles(token: string, userId: string, limit = 100): Promise<BlockedProfile[]> {
  const blocks = await supabaseRequest<BlockRow[]>(
    `/rest/v1/user_blocks?blocker_id=eq.${userId}&select=id,blocked_id,reason,created_at&order=created_at.desc&limit=${limit}`,
    {},
    token,
  );
  if (!blocks.length) return [];

  const ids = Array.from(new Set(blocks.map((block) => block.blocked_id)));
  let profiles = new Map<string, ProfileLite>();
  try {
    const rows = await supabaseRequest<ProfileLite[]>(
      `/rest/v1/profiles?id=in.(${ids.join(",")})&select=id,display_name,username,cube_tag,public_slug`,
      {},
      token,
    );
    profiles = new Map(rows.map((row) => [row.id, row]));
  } catch {
    /* profile lookup is best-effort; the block row is still shown */
  }

  return blocks.map((block) => {
    const profile = profiles.get(block.blocked_id);
    return {
      block_id: block.id,
      blocked_id: block.blocked_id,
      reason: block.reason,
      created_at: block.created_at,
      display_name: profile?.display_name ?? null,
      username: profile?.username ?? null,
      cube_tag: profile?.cube_tag ?? null,
      public_slug: profile?.public_slug ?? null,
    };
  });
}
