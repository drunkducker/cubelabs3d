"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearAuthCookies,
  getSupabaseConfig,
  setAuthCookies,
  supabaseRequest,
} from "@/app/lib/supabase-rest";

/*
 * Origin used for Supabase email links (password reset, signup confirmation).
 * Prefer NEXT_PUBLIC_SITE_URL, then the real request origin so links always
 * return to the deployment the user is actually on, then a production
 * fallback. Never hard-code a single branch preview URL: those links break
 * the moment that preview is deleted. Each origin used here must also be
 * listed in Supabase Auth > URL Configuration > Redirect URLs.
 */
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

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; email?: string };
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
  user: { id: string; email?: string },
  displayName: string,
) {
  await supabaseRequest(
    "/rest/v1/profiles",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: user.id,
        display_name: displayName || user.email?.split("@")[0] || "Cube Solver",
      }),
    },
    session.access_token,
  );
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
  redirect("/profile");
}

export async function signUp(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const displayName = value(formData, "display_name");
  const { url, key } = getSupabaseConfig();

  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      data: { display_name: displayName },
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

    try {
      await upsertProfile({ access_token: result.access_token }, result.user, displayName);
    } catch {
      // The profile trigger/backfill can repair identity fields later.
    }

    redirect("/profile");
  }

  redirect("/auth/email?message=Check%20your%20email%20to%20confirm%20your%20account.");
}

export async function requestPasswordReset(formData: FormData) {
  const email = value(formData, "email");
  if (!email) redirect("/auth/email?error=Enter%20your%20email%20before%20requesting%20a%20reset.");

  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirect_to: `${getSiteOrigin()}/auth/reset` }),
    cache: "no-store",
  });

  if (!response.ok) {
    const result = (await response.json()) as AuthResponse;
    redirect(authErrorUrl(result.error_description ?? result.msg ?? result.error ?? "Unable to send reset email."));
  }

  redirect("/auth/email?mode=login&message=Password%20reset%20email%20sent.%20Check%20your%20inbox.");
}

export async function signOut() {
  clearAuthCookies();
  redirect("/");
}
