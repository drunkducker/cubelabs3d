import "server-only";

import { redirect } from "next/navigation";
import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";

/*
 * Server-side admin access control for Cube Labs.
 *
 * The browser is NEVER the security boundary. Every admin page and privileged
 * action must resolve its context through requireAdmin()/getAdminContext(),
 * which validate the session and the role on the server before anything runs.
 *
 * Access model: a `role` column on profiles drives permissions. The account
 * named in ADMIN_OWNER_EMAIL is always treated as owner as a lock-out failsafe,
 * even if the bootstrap row has not been applied yet.
 */

export type AdminRole =
  | "user"
  | "support"
  | "analyst"
  | "editor"
  | "moderator"
  | "admin"
  | "owner";

// Roles allowed into the admin portal at all (order = ascending privilege).
export const ADMIN_ROLES: AdminRole[] = [
  "analyst",
  "support",
  "editor",
  "moderator",
  "admin",
  "owner",
];

export type AdminUser = { id: string; email?: string };

export type AdminContext = {
  user: AdminUser;
  role: AdminRole;
  token: string;
};

/** True if the role may enter the admin portal. */
export function isAdminRole(role: AdminRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/** True if `role` meets or exceeds every role in `allowed`'s minimum. */
export function hasAnyRole(role: AdminRole, allowed: AdminRole[]): boolean {
  return allowed.includes(role);
}

function ownerEmail(): string | null {
  const value = process.env.ADMIN_OWNER_EMAIL?.trim();
  return value ? value.toLowerCase() : null;
}

/**
 * Resolve the current admin context, or null if the visitor is not an admin.
 * Does not redirect — use this when you need to branch on access.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const token = getAccessToken();
  if (!token) return null;

  let user: AdminUser;
  try {
    user = await supabaseRequest<AdminUser>("/auth/v1/user", {}, token);
  } catch {
    return null;
  }
  if (!user?.id) return null;

  // Failsafe: the configured owner email is always owner.
  const configuredOwner = ownerEmail();
  if (configuredOwner && user.email && user.email.toLowerCase() === configuredOwner) {
    return { user, role: "owner", token };
  }

  let role: AdminRole = "user";
  try {
    const rows = await supabaseRequest<{ role: AdminRole }[]>(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`,
      {},
      token,
    );
    if (rows?.[0]?.role) role = rows[0].role;
  } catch {
    return null;
  }

  if (!isAdminRole(role)) return null;
  return { user, role, token };
}

/**
 * Require an admin session. Redirects non-admins away from the portal.
 * Optionally require one of `allowed` roles for a specific section.
 */
export async function requireAdmin(allowed?: AdminRole[]): Promise<AdminContext> {
  const context = await getAdminContext();
  if (!context) redirect("/auth?error=Admin%20access%20is%20required.");
  if (allowed && !hasAnyRole(context.role, allowed)) {
    redirect("/admin?error=You%20do%20not%20have%20access%20to%20that%20section.");
  }
  return context;
}

export type AuditEntry = {
  action: string;
  targetType?: string;
  targetId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
};

/**
 * Append a privileged action to the audit log. Call this from every admin
 * mutation. Never throws into the caller: a failed audit write is logged but
 * must not silently swallow the fact that it failed, so it is surfaced in the
 * returned boolean.
 */
export async function writeAudit(context: AdminContext, entry: AuditEntry): Promise<boolean> {
  try {
    await supabaseRequest(
      "/rest/v1/admin_audit_log",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          actor_id: context.user.id,
          actor_role: context.role,
          action: entry.action,
          target_type: entry.targetType ?? null,
          target_id: entry.targetId ?? null,
          previous_value: entry.previousValue ?? null,
          new_value: entry.newValue ?? null,
          reason: entry.reason ?? null,
          metadata: entry.metadata ?? null,
          success: entry.success ?? true,
        }),
      },
      context.token,
    );
    return true;
  } catch (error) {
    console.error("admin audit write failed", error);
    return false;
  }
}
