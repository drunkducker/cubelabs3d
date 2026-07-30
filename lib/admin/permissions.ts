/*
 * Centralized role/permission matrix.
 * Every privileged server operation checks this independently of UI visibility.
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
  "privacy.read",
  "privacy.manage",
  "avatars.moderate",
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

const ROLE_PERMISSIONS: Record<Exclude<AdminRole, "owner">, Permission[]> = {
  admin: [
    "admin.overview.read",
    "users.read",
    "users.suspend",
    "users.export",
    "users.premium.manage",
    "privacy.read",
    "privacy.manage",
    "avatars.moderate",
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
    "privacy.read",
    "avatars.moderate",
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
    "privacy.read",
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

export const OWNER_ONLY: Permission[] = [
  "roles.manage",
  "users.delete",
  "leaderboards.reset",
  "settings.manage",
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
  return PERMISSIONS.filter((permission) => hasPermission(role, permission));
}

export function isOwnerOnly(permission: Permission): boolean {
  return OWNER_ONLY.includes(permission);
}
