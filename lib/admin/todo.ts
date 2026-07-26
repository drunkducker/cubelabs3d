/*
 * Admin capability TODO / roadmap. Single source of truth for what the admin
 * dashboard is expected to cover, its current status, and where each item
 * lives (or what it needs to ship).
 *
 * `status` is the code-level truth on THIS branch:
 *   done    — a real page + action set exists and is wired.
 *   partial — data path exists but a dedicated editor UI is not yet built.
 *   pending — not built at all; only the checklist entry.
 *
 * The word "done" here means "coded and build-verified". Production
 * verification (migration applied, browser-tested) is a separate operator
 * responsibility (see docs/SECURITY.md and ADMIN-GUIDE.md).
 */

export type TodoStatus = "done" | "partial" | "pending";

export type AdminTodoItem = {
  id: string;
  label: string;
  status: TodoStatus;
  href?: string;      // where to open it, when built
  note: string;       // one line of context / what's needed
};

export const ADMIN_TODO: AdminTodoItem[] = [
  {
    id: "anticheat.review",
    label: "Review flagged anti-cheat attempts",
    status: "done",
    href: "/admin/leaderboards?view=suspicious",
    note: "Suspicious queue on leaderboards page; mark valid / flag / exclude / restore, corrections preserve originals.",
  },
  {
    id: "leaderboard.moderate",
    label: "Remove or restore leaderboard entries",
    status: "done",
    href: "/admin/leaderboards",
    note: "Exclude/restore actions + audited time correction that never overwrites the original.",
  },
  {
    id: "tournaments",
    label: "Manage tournaments and special events",
    status: "pending",
    note: "Not built. Needs tournament schema (bracket, entrants, rounds, prizes, official scramble link), a scheduler, and per-event leaderboards.",
  },
  {
    id: "premium.subs",
    label: "Manage Premium subscriptions (view; billing stays in Stripe)",
    status: "done",
    href: "/admin/billing",
    note: "Plans, recent subscriptions, Stripe config status. Billing itself remains in Stripe.",
  },
  {
    id: "announcements",
    label: "Send announcements / maintenance notices",
    status: "partial",
    href: "/admin/settings",
    note: "Currently authored as typed structured settings. Needs a dedicated editor with schedule + preview.",
  },
  {
    id: "security.logs",
    label: "View security logs and account actions",
    status: "done",
    href: "/admin/security",
    note: "Security center + honest checks + recent security events.",
  },
  {
    id: "audit.log",
    label: "Audit log of all admin actions",
    status: "done",
    href: "/admin/audit",
    note: "Append-only, redacted, filterable by action / target / result.",
  },
  {
    id: "cookie.banner",
    label: "Cookie / banner text editor",
    status: "partial",
    href: "/admin/settings",
    note: "Editable today as a typed setting (e.g. content.cookie_banner). A visual editor is a follow-up.",
  },
  {
    id: "legal.pages",
    label: "Legal page editor / content management",
    status: "partial",
    href: "/admin/content",
    note: "Content page exists; sanitized structured blocks only (raw HTML deliberately rejected). Needs a real block editor.",
  },
  {
    id: "daily.challenge",
    label: "Daily challenge scheduler",
    status: "pending",
    note: "Not built. Needs a schedule table for the daily official scramble, a picker for date/timezone, and homepage/leaderboard wiring.",
  },
  {
    id: "puzzle.rotation",
    label: "Puzzle rotation manager",
    status: "pending",
    note: "Not built. Needs a rotation config for which puzzle is featured, per-day/week, and a service the homepage reads.",
  },
];

export function todoCounts(items: AdminTodoItem[] = ADMIN_TODO) {
  return items.reduce(
    (acc, i) => {
      acc[i.status]++;
      return acc;
    },
    { done: 0, partial: 0, pending: 0 },
  );
}
