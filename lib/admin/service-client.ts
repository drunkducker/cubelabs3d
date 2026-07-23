import "server-only";

/*
 * Server-only Supabase access for privileged admin operations.
 *
 * The service-role key BYPASSES row-level security, so this module must never
 * be imported by a client component. The `server-only` import above makes any
 * accidental client import a build error.
 *
 * The key is read from SUPABASE_SERVICE_ROLE_KEY (NOT NEXT_PUBLIC_*), so it is
 * never shipped to the browser. Callers must have already passed
 * requireAdmin()/requirePermission() before using anything here — this module
 * does not itself authorize the request.
 */

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).replace(/\/$/, "");

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function isAdminConfigured() {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

export class AdminConfigError extends Error {
  constructor() {
    super("Admin service is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    this.name = "AdminConfigError";
  }
}

/*
 * Perform a service-role request against Supabase PostgREST or Auth admin API.
 * Fails closed: throws AdminConfigError when the privileged key is missing so
 * callers never silently fall back to an unprivileged path.
 */
export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isAdminConfigured()) throw new AdminConfigError();

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Admin request failed with ${response.status}.`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/*
 * Count-only helper using PostgREST's exact count header. Returns a bounded
 * count without shipping rows to the server needlessly.
 */
export async function adminCount(pathWithFilters: string): Promise<number | null> {
  if (!isAdminConfigured()) return null;
  const sep = pathWithFilters.includes("?") ? "&" : "?";
  const response = await fetch(`${SUPABASE_URL}${pathWithFilters}${sep}select=id&limit=1`, {
    method: "GET",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const range = response.headers.get("content-range"); // e.g. "0-0/1234"
  const total = range?.split("/")?.[1];
  if (!total || total === "*") return null;
  const n = Number(total);
  return Number.isFinite(n) ? n : null;
}
