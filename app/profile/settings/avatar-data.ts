import "server-only";

import { requireProfileSession } from "@/app/lib/profile-service";
import { supabaseRequest } from "@/app/lib/supabase-rest";

export type AvatarSettingsData = {
  avatarUrl: string | null;
  avatarStatus: string;
  pendingSubmittedAt: string | null;
  moderationReason: string | null;
};

export async function getAvatarSettingsData(): Promise<AvatarSettingsData> {
  const { token, user } = await requireProfileSession();
  const [profiles, submissions] = await Promise.all([
    supabaseRequest<Array<{ avatar_url: string | null; avatar_status?: string | null }>>(
      `/rest/v1/profiles?id=eq.${user.id}&select=avatar_url,avatar_status&limit=1`,
      {},
      token,
    ).catch(() => []),
    supabaseRequest<Array<{ status: string; submitted_at: string; moderation_reason: string | null }>>(
      `/rest/v1/avatar_submissions?user_id=eq.${user.id}&select=status,submitted_at,moderation_reason&order=submitted_at.desc&limit=1`,
      {},
      token,
    ).catch(() => []),
  ]);
  const profile = profiles[0];
  const latest = submissions[0];
  return {
    avatarUrl: profile?.avatar_url ?? null,
    avatarStatus: profile?.avatar_status ?? latest?.status ?? "none",
    pendingSubmittedAt: latest?.status === "pending" ? latest.submitted_at : null,
    moderationReason: latest?.status === "rejected" ? latest.moderation_reason : null,
  };
}
