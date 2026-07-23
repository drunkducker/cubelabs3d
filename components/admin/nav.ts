import type { Permission } from "@/lib/admin/permissions";

/*
 * Admin navigation config. `permission` gates visibility in the UI, but the
 * page itself re-checks server-side — hiding a link is never the boundary.
 */
export type AdminNavItem = {
  href: string;
  label: string;
  permission: Permission;
  icon: string;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", permission: "admin.overview.read", icon: "▦" },
  { href: "/admin/users", label: "Users", permission: "users.read", icon: "◍" },
  { href: "/admin/roles", label: "Roles & Access", permission: "roles.manage", icon: "◆" },
  { href: "/admin/ads", label: "Ads & Campaigns", permission: "ads.read", icon: "◈" },
  { href: "/admin/carousels", label: "Carousels & Affiliates", permission: "ads.read", icon: "▤" },
  { href: "/admin/media", label: "Media Library", permission: "content.manage", icon: "▦" },
  { href: "/admin/billing", label: "Premium & Billing", permission: "users.premium.manage", icon: "$" },
  { href: "/admin/test-lab", label: "Test Lab", permission: "test_data.generate", icon: "⚗" },
  { href: "/admin/leaderboards", label: "Leaderboards", permission: "leaderboards.read", icon: "▲" },
  { href: "/admin/challenges", label: "Challenges", permission: "challenges.read", icon: "⚔" },
  { href: "/admin/content", label: "Content", permission: "content.manage", icon: "✎" },
  { href: "/admin/security", label: "Security", permission: "security.read", icon: "⛨" },
  { href: "/admin/audit", label: "Audit Log", permission: "audit.read", icon: "☰" },
  { href: "/admin/settings", label: "Settings & Flags", permission: "settings.read", icon: "⚙" },
  { href: "/admin/exports", label: "Exports & Migration", permission: "exports.create", icon: "⇩" },
];
