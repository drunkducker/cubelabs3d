/*
 * Admin capability TODO / roadmap. Single source of truth for what the admin
 * dashboard is expected to cover, its current status, and where each item
 * lives (or what it needs to ship).
 */
export type TodoStatus = "done" | "partial" | "pending";

export type AdminTodoItem = {
  id: string;
  label: string;
  status: TodoStatus;
  href?: string;
  note: string;
};

export const ADMIN_TODO: AdminTodoItem[] = [
  { id: "anticheat.review", label: "Review flagged anti-cheat attempts", status: "done", href: "/admin/leaderboards?view=suspicious", note: "Suspicious queue on leaderboards page; mark valid / flag / exclude / restore, corrections preserve originals." },
  { id: "leaderboard.moderate", label: "Remove or restore leaderboard entries", status: "done", href: "/admin/leaderboards", note: "Exclude/restore actions plus audited time correction that never overwrites the original." },
  { id: "tournaments", label: "Manage tournaments and special events", status: "pending", note: "Needs tournament schema, scheduling, entrants, rounds, official scrambles, and event leaderboards." },
  { id: "premium.subs", label: "Manage Premium subscriptions", status: "done", href: "/admin/billing", note: "Plans, recent subscriptions, and Stripe configuration status. Billing itself remains in Stripe." },
  { id: "announcements", label: "Send announcements / maintenance notices", status: "partial", href: "/admin/settings", note: "Typed settings exist; needs a dedicated editor with scheduling and preview." },
  { id: "security.logs", label: "View security logs and account actions", status: "done", href: "/admin/security", note: "Security center with recent events and deployment checks." },
  { id: "audit.log", label: "Audit log of all admin actions", status: "done", href: "/admin/audit", note: "Append-only, redacted, and filterable by action, target, and result." },
  { id: "cookie.banner", label: "Cookie / banner text editor", status: "partial", href: "/admin/settings", note: "Editable as a typed setting; a focused visual editor remains." },
  { id: "legal.pages", label: "Legal page editor / content management", status: "partial", href: "/admin/content", note: "Structured content path exists; a safe block editor remains." },
  { id: "daily.challenge", label: "Daily challenge scheduler", status: "pending", note: "Needs official daily scramble records, timezone/date scheduling, publication controls, and homepage/leaderboard wiring." },
  { id: "puzzle.rotation", label: "Puzzle rotation manager", status: "pending", note: "Needs a dated featured-puzzle configuration and a shared read service." },
  { id: "sec.rate_limits", label: "Rate limiting & login lockout", status: "done", href: "/admin/security", note: "Fixed-window check_rate_limit RPC + sign-in/reset/admin-action/media/checkout/ad-track wiring. Activates once 20260726_rate_limiting.sql is applied." },
  { id: "sec.mfa", label: "Admin two-factor (TOTP)", status: "done", href: "/admin/security/mfa", note: "Enrol an authenticator, then set ADMIN_REQUIRE_MFA=true to require aal2 on every admin page." },
  { id: "sec.ci_scanners", label: "CI: secret scan, dep CVEs, SAST", status: "done", note: "Gitleaks + OSV-Scanner + CodeQL + npm audit in .github/workflows/. Runs on push, PR, and weekly." },
  { id: "sec.rls_tests", label: "RLS regression tests", status: "done", note: "supabase/tests/rls_assertions.sql — wrapped in ROLLBACK, run in the Supabase SQL editor after every admin migration." },
];

export function todoCounts(items: AdminTodoItem[] = ADMIN_TODO) {
  return items.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { done: 0, partial: 0, pending: 0 },
  );
}
