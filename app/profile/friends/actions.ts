"use server";

import { revalidatePath } from "next/cache";
import { requireProfileSession } from "@/app/lib/profile-service";
import { supabaseRequest } from "@/app/lib/supabase-rest";

type FriendshipActionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

function formId(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function findExistingFriendship(token: string, userId: string, targetId: string) {
  const filter = encodeURIComponent(
    `(and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId}))`,
  );
  const rows = await supabaseRequest<FriendshipActionRow[]>(
    `/rest/v1/friendships?or=${filter}&select=id,requester_id,addressee_id,status&limit=2`,
    {},
    token,
  );
  return rows[0];
}

export async function sendFriendRequest(formData: FormData) {
  const targetId = formId(formData, "target_id");
  if (!targetId) return;

  const { token, user } = await requireProfileSession();
  if (targetId === user.id) return;

  const existing = await findExistingFriendship(token, user.id, targetId);
  if (existing) {
    if (existing.status === "pending" && existing.addressee_id === user.id) {
      await supabaseRequest(
        `/rest/v1/friendships?id=eq.${existing.id}&addressee_id=eq.${user.id}&select=id`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ status: "accepted" }),
        },
        token,
      );
    }
    revalidateFriendPaths();
    return;
  }

  await supabaseRequest(
    "/rest/v1/friendships?select=id",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        requester_id: user.id,
        addressee_id: targetId,
        status: "pending",
      }),
    },
    token,
  );

  revalidateFriendPaths();
}

export async function acceptFriendRequest(formData: FormData) {
  const friendshipId = formId(formData, "friendship_id");
  if (!friendshipId) return;

  const { token, user } = await requireProfileSession();
  await supabaseRequest(
    `/rest/v1/friendships?id=eq.${friendshipId}&addressee_id=eq.${user.id}&status=eq.pending&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "accepted" }),
    },
    token,
  );

  revalidateFriendPaths();
}

export async function declineFriendRequest(formData: FormData) {
  const friendshipId = formId(formData, "friendship_id");
  if (!friendshipId) return;

  const { token, user } = await requireProfileSession();
  await supabaseRequest(
    `/rest/v1/friendships?id=eq.${friendshipId}&addressee_id=eq.${user.id}&status=eq.pending&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "declined" }),
    },
    token,
  );

  revalidateFriendPaths();
}

export async function removeFriendship(formData: FormData) {
  const friendshipId = formId(formData, "friendship_id");
  if (!friendshipId) return;

  const { token, user } = await requireProfileSession();
  const participantFilter = encodeURIComponent(`(requester_id.eq.${user.id},addressee_id.eq.${user.id})`);
  await supabaseRequest(
    `/rest/v1/friendships?id=eq.${friendshipId}&or=${participantFilter}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
    token,
  );

  revalidateFriendPaths();
}

function revalidateFriendPaths() {
  revalidatePath("/profile");
  revalidatePath("/profile/friends");
}
