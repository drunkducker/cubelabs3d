import "server-only";

import { adminCount, adminRequest, isAdminConfigured } from "./service-client";

/*
 * Aggregates operator notifications from existing signals (no new table needed):
 * unresolved critical/warning security events + open moderation reports + recent
 * failed privileged actions. Returns a bounded recent list + a total count.
 */

export type AdminNotification = { id: string; kind: string; text: string; href: string; severity: "info" | "warning" | "critical"; created_at: string };

export async function getAdminNotifications(): Promise<{ count: number | null; items: AdminNotification[] }> {
  if (!isAdminConfigured()) return { count: null, items: [] };

  const [events, reports, unresolvedCount, openReportsCount] = await Promise.all([
    adminRequest<Array<{ id: string; event_type: string; severity: "info" | "warning" | "critical"; created_at: string }>>(
      `/rest/v1/admin_security_events?resolved=eq.false&select=id,event_type,severity,created_at&order=created_at.desc&limit=5`,
    ).catch(() => []),
    adminRequest<Array<{ id: string; target_type: string; severity: string; created_at: string }>>(
      `/rest/v1/moderation_reports?status=in.(open,reviewing)&select=id,target_type,severity,created_at&order=created_at.desc&limit=5`,
    ).catch(() => []),
    adminCount(`/rest/v1/admin_security_events?resolved=eq.false`).catch(() => null),
    adminCount(`/rest/v1/moderation_reports?status=in.(open,reviewing)`).catch(() => null),
  ]);

  const items: AdminNotification[] = [
    ...events.map((e) => ({ id: e.id, kind: "security", text: e.event_type.replace(/_/g, " "), href: "/admin/security", severity: e.severity, created_at: e.created_at })),
    ...reports.map((r) => ({ id: r.id, kind: "report", text: `${r.target_type} report`, href: "/admin/challenges", severity: (r.severity === "critical" ? "critical" : "warning") as "critical" | "warning", created_at: r.created_at })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const count = unresolvedCount === null && openReportsCount === null ? null : (unresolvedCount ?? 0) + (openReportsCount ?? 0);
  return { count, items };
}
