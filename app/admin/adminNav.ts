import type { AdminRole } from "@/app/lib/admin";

/*
 * Admin portal navigation, mirroring the approved 9-screen control-panel
 * design. `ready` marks sections that are actually built; the rest render as
 * planned so the shell is complete without pretending unfinished sections work.
 * `roles` (when set) restricts a section to specific roles.
 */
export type AdminNavItem = {
  href: string;
  label: string;
  ready: boolean;
  roles?: AdminRole[];
  note?: string;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", ready: true },
  { href: "/admin/ads", label: "Ads", ready: true, roles: ["owner", "admin", "editor"], note: "Managed ad slots" },
  { href: "/admin/banners", label: "Banners & Carousels", ready: false, note: "Affiliate + promo slides" },
  { href: "/admin/videos", label: "Videos", ready: true, roles: ["owner", "admin", "editor"], note: "YouTube embeds" },
  { href: "/admin/users", label: "Users", ready: false },
  { href: "/admin/test-lab", label: "Test Lab", ready: false, roles: ["owner", "admin"] },
  { href: "/admin/leaderboards", label: "Leaderboards", ready: false },
  { href: "/admin/challenges", label: "Challenges", ready: false },
  { href: "/admin/content", label: "Content", ready: false },
  { href: "/admin/security", label: "Security", ready: false, roles: ["owner", "admin"] },
  { href: "/admin/audit", label: "Audit Log", ready: true, roles: ["owner", "admin", "moderator"] },
  { href: "/admin/settings", label: "Settings", ready: false, roles: ["owner"] },
];
