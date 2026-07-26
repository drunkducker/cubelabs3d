import "server-only";

import { headers } from "next/headers";
import { getSupabaseConfig } from "@/app/lib/supabase-rest";

/*
 * Rate limiting via the check_rate_limit RPC (20260726_rate_limiting.sql).
 *
 * Uses the ANON key so it works on unauthenticated paths (sign-in lockout). The
 * RPC is SECURITY DEFINER, so anon can self-throttle without table access.
 *
 * `failClosed` controls behavior when the limiter itself errors: sensitive auth
 * paths pass failClosed=true (deny on error); best-effort paths (metric beacons)
 * pass false (allow on error) so tracking never blocks a page.
 */
export async function checkRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
  opts: { failClosed?: boolean } = {},
): Promise<boolean> {
  const { url, key } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds }),
      cache: "no-store",
    });
    if (!res.ok) return opts.failClosed ? false : true;
    const allowed = (await res.json()) as boolean;
    return allowed === true;
  } catch {
    return opts.failClosed ? false : true;
  }
}

/** Best-effort client IP from forwarded headers. */
export function clientIp(): string {
  const h = headers();
  return (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Please wait and try again.") {
    super(message);
    this.name = "RateLimitError";
  }
}
