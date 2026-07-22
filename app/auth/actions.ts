"use server";

import { redirect } from "next/navigation";
import {
  clearAuthCookies,
  getSupabaseConfig,
  setAuthCookies,
} from "@/app/lib/supabase-rest";

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; email?: string };
  msg?: string;
  error_description?: string;
};

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function authErrorUrl(message: string) {
  return `/auth?error=${encodeURIComponent(message)}`;
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
    redirect(authErrorUrl(result.error_description ?? result.msg ?? "Unable to sign in."));
  }

  await setAuthCookies({
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
    }),
    cache: "no-store",
  });

  const result = (await response.json()) as AuthResponse;
  if (!response.ok) {
    redirect(authErrorUrl(result.error_description ?? result.msg ?? "Unable to create account."));
  }

  if (result.access_token && result.refresh_token) {
    await setAuthCookies({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
    });
    redirect("/profile");
  }

  redirect("/auth?message=Check%20your%20email%20to%20confirm%20your%20account.");
}

export async function signOut() {
  await clearAuthCookies();
  redirect("/");
}
