import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, getSupabaseConfig } from "@/app/lib/supabase-rest";
import { adminRequest, isAdminConfigured } from "./service-client";
import { hasPermission, type AdminRole, type Permission } from "./permissions";

/*
 * The server-side security boundary for the admin platform.
 *
 * Flow for every protected page and action:
 *   1. Read the HTTP-only session cookie (never trust anything from the body).
 *   2. Validate it against Supabase Auth to resolve the real user id.
 *   3. Look up an ACTIVE, unexpired admin_members row via the service role.
 *   4. Optionally verify a specific permission server-side.
 * Every step fails closed.
 */

export type AdminContext = {
  userId: string;
  email: string | null;
  role: AdminRole;
  correlationId: string;
  requestMeta: Record<string, string | null>;
};

export class AdminAuthError extends Error {
  code: "unauthenticated" | "not_admin" | "forbidden" | "unconfigured";
  constructor(code: AdminAuthError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "AdminAuthError";
  }
}

type AuthUser = { id: string; email?: string };
type AdminMember = { role: AdminRole; is_active: boolean; expires_at: string | null };

function buildRequestMeta(): Record<string, string | null> {
  const h = headers();
  // Forwarded metadata only. No cookies, no auth headers.
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    host: h.get("x-forwarded-host") ?? h.get("host"),
    user_agent: h.get("user-agent"),
    origin: h.get("origin"),
  };
}

/*
 * Resolve the acting administrator or throw. Does NOT redirect — callers in
 * server actions catch and translate; the layout uses requireAdminOrRedirect.
 */
export async function resolveAdmin(): Promise<AdminContext> {
  if (!isAdminConfigured()) {
    throw new AdminAuthError("unconfigured", "Admin service is not configured.");
  }

  const token = cookies().get(ACCESS_COOKIE)?.value;
  if (!token) throw new AdminAuthError("unauthenticated", "Sign in required.");

  // Validate the session against Supabase Auth using the user's own token.
  const { url, key } = getSupabaseConfig();
  let user: AuthUser;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("invalid session");
    user = (await res.json()) as AuthUser;
  } catch {
    throw new AdminAuthError("unauthenticated", "Your session is invalid or expired.");
  }
  if (!user?.id) throw new AdminAuthError("unauthenticated", "Your session is invalid or expired.");

  // Look up membership via the service role (bypasses RLS on admin_members).
  const members = await adminRequest<AdminMember[]>(
    `/rest/v1/admin_members?user_id=eq.${user.id}&select=role,is_active,expires_at`,
  );
  const member = members?.[0];
  if (!member || !member.is_active) {
    throw new AdminAuthError("not_admin", "You do not have administrator access.");
  }
  if (member.expires_at && new Date(member.expires_at).getTime() < Date.now()) {
    throw new AdminAuthError("not_admin", "Your administrator access has expired.");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: member.role,
    correlationId: crypto.randomUUID(),
    requestMeta: buildRequestMeta(),
  };
}

/*
 * For server COMPONENTS (layout/pages): redirect on failure instead of throwing
 * an uncaught error. Non-admins are sent to a dedicated not-authorized screen;
 * unauthenticated users go to sign-in.
 */
export async function requireAdmin(): Promise<AdminContext> {
  try {
    return await resolveAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) {
      if (error.code === "unauthenticated") redirect("/auth?message=Sign%20in%20to%20continue.");
      // Target lives OUTSIDE the protected /admin layout to avoid a redirect loop.
      redirect("/admin-denied");
    }
    throw error;
  }
}

export async function requirePermission(permission: Permission): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (!hasPermission(ctx.role, permission)) {
    redirect("/admin-denied?reason=permission");
  }
  return ctx;
}

/*
 * For server ACTIONS and route handlers: resolve + permission check that THROWS
 * (so the action can record a failed-access security event and return an error
 * to the client rather than issuing a redirect mid-mutation).
 */
export async function authorizeAction(permission: Permission): Promise<AdminContext> {
  const ctx = await resolveAdmin();
  if (!hasPermission(ctx.role, permission)) {
    throw new AdminAuthError("forbidden", `Missing permission: ${permission}`);
  }
  return ctx;
}
