"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearAuthCookies,
  getSupabaseConfig,
  setAuthCookies,
  supabaseRequest,
} from "@/app/lib/supabase-rest";
import { evaluateAgeBand, type AgeBand } from "@/lib/privacy/policy";

function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host) {
    const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  return "https://cubelabs3d.vercel.app";
}

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    age_band?: AgeBand;
    age_screening_outcome?: string;
    profile_visibility?: "public" | "private";
  };
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: AuthUser;
  msg?: string;
  error?: string;
  error_description?: string;
};

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function authErrorUrl(message: string) {
  return `/auth/email?error=${encodeURIComponent(message)}`;
}

async function upsertProfile(
  session: { access_token: string },
  user: AuthUser,
  displayName?: string,
  ageBand?: AgeBand,
) {
  const resolvedAgeBand = ageBand ?? user.user_metadata?.age_band ?? null;
  const screening = resolvedAgeBand ? evaluateAgeBand(resolvedAgeBand) : null;
  const existing = await supabaseRequest<Array<{
    display_name: string | null;
    age_band?: AgeBand | null;
    age_screened_at?: string | null;
    profile_visibility?: string | null;
  }>>(
    `/rest/v1/profiles?id=eq.${user.id}&select=display_name,age_band,age_screened_at,profile_visibility&limit=1`,
    {},
    session.access_token,
  ).catch(() => []);
  const current = existing[0];

  await supabaseRequest(
    "/rest/v1/profiles",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: user.id,
        display_name: current?.display_name || displayName || user.user_metadata?.display_name || user.email?.split("@")[0] || "Cube Solver",
        ...(resolvedAgeBand && !current?.age_band ? {
          age_band: resolvedAgeBand,
          age_screened_at: new Date().toISOString(),
          guardian_status: "not_required",
        } : {}),
        ...(screening?.outcome === "teen_defaults" && !current?.age_screened_at ? {
          profile_visibility: "private",
          show_location: false,
          show_collection: false,
          show_activity: false,
        } : {}),
      }),
    },
    session.access_token,
  );

  if (screening) {
    await supabaseRequest(
      "/rest/v1/age_screenings?on_conflict=user_id,source",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          user_id: user.id,
          age_band: screening.ageBand,
          outcome: screening.outcome,
          source: "signup",
        }),
      },
      session.access_token,
    ).catch(() => undefined);
  }
}

export async function signIn(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const { url, key } = getSupabaseConfig();

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const result = (await response.json()) as AuthResponse;
  if (!response.ok || !result.access_token || !result.refresh_token) {
    redirect(authErrorUrl(result.error_description ?? result.msg ?? result.error ?? "Unable to sign in."));
  }

  setAuthCookies({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_in: result.expires_in,
  });
  if (result.user) {
    await upsertProfile({ access_token: result.access_token }, result.user).catch(() => undefined);
  }
  redirect("/profile");
}

export async function signUp(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const displayName = value(formData, "display_name");
  let screening;
  try {
    screening = evaluateAgeBand(value(formData, "age_band"));
  } catch (error) {
    redirect(authErrorUrl(error instanceof Error ? error.message : "Choose an age range."));
  }

  if (!screening.canCreateAccount) {
    redirect(`/privacy/requests?type=parent_request&subject_email=${encodeURIComponent(email)}&message=${encodeURIComponent("A parent or guardian must contact Cube Labs before an under-13 account can be considered.")}`);
  }

  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      data: {
        display_name: displayName,
        age_band: screening.ageBand,
        age_screening_outcome: screening.outcome,
        profile_visibility: screening.defaultProfileVisibility,
      },
      redirect_to: `${getSiteOrigin()}/auth/email?mode=login&message=${encodeURIComponent("Email confirmed. Log in to continue.")}`,
    }),
    cache: "no-store",
  });

  const result = (await response.json()) as AuthResponse;
  if (!response.ok) {
    redirect(authErrorUrl(result.error_description ?? result.msg ?? result.error ?? "Unable to create account."));
  }

  if (result.access_token && result.refresh_token && result.user) {
    setAuthCookies({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
    });

    await upsertProfile(
      { access_token: result.access_token },
      result.user,
      displayName,
      screening.ageBand,
    ).catch(() => undefined);
    redirect("/profile");
  }

  redirect("/auth/email?message=Check%20your%20email%20to%20confirm%20your%20account.");
}

export async function requestPasswordReset(formData: FormData) {
  const email = value(formData, "email");
  if (!email) redirect("/auth?error=Enter%20your%20email%20before%20requesting%20a%20reset.");

  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirect_to: `${getSiteOrigin()}/auth/reset` }),
    cache: "no-store",
  });

  if (!response.ok) {
    const result = (await response.json()) as AuthResponse;
    redirect(`/auth?error=${encodeURIComponent(result.error_description ?? result.msg ?? result.error ?? "Unable to send reset email.")}`);
  }

  redirect("/auth?message=Password%20reset%20email%20sent.%20Check%20your%20inbox.");
}

export async function signOut() {
  clearAuthCookies();
  redirect("/");
}
