/*
 * Centralized role/permission matrix.
 *
 * This is the single source of truth for what each role may do. UI visibility
 * MAY read this matrix, but every privileged server operation must call
 * hasPermission()/requirePermission() independently — the browser is never the
 * security boundary. This module is safe to import from client components (it
 * contains no secrets and no data access).
 */

export const ADMIN_ROLES = [
  "owner",
  "admin",
  "moderator",
  "editor",
  "support",
  "analyst",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PERMISSIONS = [
  "admin.overview.read",
  "users.read",
  "users.suspend",
  "users.delete",
  "users.export",
  "users.premium.manage",
  "roles.manage",
  "ads.read",
  "ads.manage",
  "ads.publish",
  "test_data.generate",
  "test_data.delete",
  "test_data.display_mode",
  "leaderboards.read",
  "leaderboards.moderate",
  "leaderboards.reset",
  "challenges.read",
  "challenges.moderate",
  "content.manage",
  "reports.read",
  "reports.resolve",
  "security.read",
  "audit.read",
  "settings.read",
  "settings.manage",
  "exports.create",
  "migration.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Owner is handled by short-circuit in hasPermission() (implicitly all).
const ROLE_PERMISSIONS: Record<Exclude<AdminRole, "owner">, Permission[]> = {
  admin: [
    "admin.overview.read",
    "users.read",
    "users.suspend",
    "users.export",
    "users.premium.manage",
    "ads.read",
    "ads.manage",
    "ads.publish",
    "test_data.generate",
    "test_data.delete",
    "leaderboards.read",
    "leaderboards.moderate",
    "challenges.read",
    "challenges.moderate",
    "content.manage",
    "reports.read",
    "reports.resolve",
    "security.read",
    "audit.read",
    "settings.read",
    "exports.create",
  ],
  moderator: [
    "admin.overview.read",
    "users.read",
    "users.suspend",
    "leaderboards.read",
    "leaderboards.moderate",
    "challenges.read",
    "challenges.moderate",
    "reports.read",
    "reports.resolve",
    "security.read",
  ],
  editor: [
    "admin.overview.read",
    "ads.read",
    "ads.manage",
    "ads.publish",
    "content.manage",
  ],
  support: [
    "admin.overview.read",
    "users.read",
  ],
  analyst: [
    "admin.overview.read",
    "users.read",
    "ads.read",
    "leaderboards.read",
    "security.read",
    "audit.read",
  ],
};

// Capabilities that ONLY the Owner may ever perform, even if a future edit to
// the matrix above accidentally grants them elsewhere.
export const OWNER_ONLY: Permission[] = [
  "roles.manage",
  "users.delete",
  "leaderboards.reset",
  "settings.manage", // dangerous global settings still gate on owner in the action
  "migration.manage",
  "test_data.display_mode",
];

export function hasPermission(role: AdminRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  if (OWNER_ONLY.includes(permission)) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsForRole(role: AdminRole): Permission[] {
  // Derived from hasPermission so the effective grant and the listed grant can
  // never diverge (owner-only permissions are filtered for non-owners).
  return PERMISSIONS.filter((p) => hasPermission(role, p));
}

export function isOwnerOnly(permission: Permission): boolean {
  return OWNER_ONLY.includes(permission);
}
