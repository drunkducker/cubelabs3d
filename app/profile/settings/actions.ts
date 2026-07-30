"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfileSession } from "@/app/lib/profile-service";
import { supabaseRequest } from "@/app/lib/supabase-rest";
import { createVerifiedAccountRequest } from "@/lib/privacy/service";

function field(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export async function updateProfileSettings(formData: FormData) {
  const { token, user } = await requireProfileSession();
  const favoritePuzzle = field(formData, "favorite_puzzle", 20);
  const countryCode = field(formData, "country_code", 2)?.toUpperCase() ?? null;

  await supabaseRequest(
    "/rest/v1/profiles",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: user.id,
        display_name: field(formData, "display_name", 60) || "Cube Solver",
        username: field(formData, "username", 40),
        bio: field(formData, "bio", 220),
        title: field(formData, "title", 80) || "Cube Explorer",
        favorite_puzzle: favoritePuzzle || "3x3",
        region: field(formData, "region", 80),
        country_code: countryCode,
        profile_visibility: field(formData, "profile_visibility", 20) || "public",
        show_location: checkbox(formData, "show_location"),
        show_collection: checkbox(formData, "show_collection"),
        show_activity: checkbox(formData, "show_activity"),
      }),
    },
    token,
  );

  revalidatePath("/profile");
  revalidatePath("/profile/settings");
  redirect("/profile/settings?saved=1");
}

export async function requestDataExport() {
  const { token, user } = await requireProfileSession();
  await createVerifiedAccountRequest({
    userId: user.id,
    email: user.email ?? null,
    requestType: "export",
    payload: {
      requested_from: "profile_settings",
      delivery: "email",
      export_format: "json",
    },
  });

  await supabaseRequest(
    `/rest/v1/profiles?id=eq.${user.id}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        account_status: "export_requested",
        privacy_export_requested_at: new Date().toISOString(),
      }),
    },
    token,
  );

  revalidatePath("/profile/settings");
  redirect("/profile/settings?privacy=export-queued");
}

export async function requestAccountClosure(formData: FormData) {
  const confirmation = String(formData.get("close_confirmation") ?? "").trim();
  if (confirmation !== "DELETE MY CUBE ID") {
    redirect("/profile/settings?privacy=confirm-close");
  }

  const { token, user } = await requireProfileSession();
  const now = new Date().toISOString();
  await createVerifiedAccountRequest({
    userId: user.id,
    email: user.email ?? null,
    requestType: "close_account",
    exportBeforeDelete: true,
    deleteMode: "full_delete",
    payload: {
      requested_from: "profile_settings",
      delivery: "email_then_delete",
      user_confirmed_phrase: true,
      requested_at: now,
    },
  });

  await supabaseRequest(
    `/rest/v1/profiles?id=eq.${user.id}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        account_status: "closure_requested",
        profile_visibility: "private",
        show_location: false,
        show_collection: false,
        show_activity: false,
        account_closure_requested_at: now,
      }),
    },
    token,
  );

  revalidatePath("/profile");
  revalidatePath("/profile/settings");
  redirect("/profile/settings?privacy=closure-queued");
}
