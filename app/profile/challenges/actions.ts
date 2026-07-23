"use server";

import { revalidatePath } from "next/cache";
import { requireProfileSession } from "@/app/lib/profile-service";
import { supabaseRequest } from "@/app/lib/supabase-rest";

export async function declineChallenge(formData: FormData) {
  const challengeId = String(formData.get("challenge_id") ?? "").trim();
  if (!challengeId) return;

  const { token, user } = await requireProfileSession();
  const participantFilter = encodeURIComponent(`(creator_id.eq.${user.id},sender_id.eq.${user.id},recipient_id.eq.${user.id})`);

  await supabaseRequest(
    `/rest/v1/challenges?id=eq.${challengeId}&or=${participantFilter}&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "declined" }),
    },
    token,
  );

  revalidatePath("/profile");
  revalidatePath("/profile/challenges");
}
