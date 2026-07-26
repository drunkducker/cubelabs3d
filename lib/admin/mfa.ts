import "server-only";

import { cookies } from "next/headers";
import { ACCESS_COOKIE, getSupabaseConfig } from "@/app/lib/supabase-rest";

/*
 * Admin TOTP two-factor via Supabase MFA (the /auth/v1/factors API). All calls
 * use the ADMINISTRATOR'S OWN access token (not the service role) so a factor
 * is always bound to the acting user and can never be enrolled on someone
 * else's behalf.
 *
 * ADMIN_REQUIRE_MFA=true makes requireAdmin() demand an aal2 session (a
 * completed MFA challenge) for admin access. The Authenticator Assurance Level
 * is read from the validated session JWT.
 */

export const MFA_REQUIRED = process.env.ADMIN_REQUIRE_MFA === "true";

type Factor = { id: string; status: string; factor_type: string; friendly_name?: string };

function token(): string | null {
  return cookies().get(ACCESS_COOKIE)?.value ?? null;
}

async function authFetch(path: string, init: RequestInit = {}) {
  const { url, key } = getSupabaseConfig();
  const t = token();
  return fetch(`${url}${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${t ?? key}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
}

export async function listFactors(): Promise<Factor[]> {
  try {
    const res = await authFetch(`/auth/v1/factors`);
    if (!res.ok) return [];
    const data = (await res.json()) as { totp?: Factor[]; all?: Factor[] };
    return data.all ?? data.totp ?? [];
  } catch {
    return [];
  }
}

export async function hasVerifiedFactor(): Promise<boolean> {
  const factors = await listFactors();
  return factors.some((f) => f.status === "verified");
}

/*
 * Read the Authenticator Assurance Level from the current session JWT. The
 * token's authenticity is already validated elsewhere via /auth/v1/user; here
 * we only decode a claim, so an unsigned parse is acceptable.
 */
export function currentAal(): "aal1" | "aal2" | null {
  const t = token();
  if (!t) return null;
  try {
    const payload = JSON.parse(Buffer.from(t.split(".")[1], "base64").toString("utf8")) as { aal?: string };
    return payload.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return null;
  }
}

export async function enrollTotp(friendlyName: string): Promise<{ id: string; qrSvg: string | null; secret: string | null; uri: string | null } | { error: string }> {
  try {
    const res = await authFetch(`/auth/v1/factors`, {
      method: "POST",
      body: JSON.stringify({ factor_type: "totp", friendly_name: friendlyName }),
    });
    const data = (await res.json()) as { id?: string; totp?: { qr_code?: string; secret?: string; uri?: string }; error?: string; msg?: string };
    if (!res.ok || !data.id) return { error: data.error ?? data.msg ?? "Could not start enrollment." };
    return { id: data.id, qrSvg: data.totp?.qr_code ?? null, secret: data.totp?.secret ?? null, uri: data.totp?.uri ?? null };
  } catch {
    return { error: "Could not reach the auth provider." };
  }
}

export async function verifyTotp(factorId: string, code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const challengeRes = await authFetch(`/auth/v1/factors/${factorId}/challenge`, { method: "POST" });
    const challenge = (await challengeRes.json()) as { id?: string; error?: string };
    if (!challengeRes.ok || !challenge.id) return { ok: false, error: challenge.error ?? "Challenge failed." };

    const verifyRes = await authFetch(`/auth/v1/factors/${factorId}/verify`, {
      method: "POST",
      body: JSON.stringify({ challenge_id: challenge.id, code }),
    });
    const verify = (await verifyRes.json()) as { error?: string; msg?: string };
    if (!verifyRes.ok) return { ok: false, error: verify.error ?? verify.msg ?? "Invalid code." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the auth provider." };
  }
}

export async function unenrollFactor(factorId: string): Promise<boolean> {
  try {
    const res = await authFetch(`/auth/v1/factors/${factorId}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
