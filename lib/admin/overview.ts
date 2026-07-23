import "server-only";

import { adminCount, adminRequest, isAdminConfigured } from "./service-client";

/*
 * Operational overview metrics. Each metric is returned with an explicit
 * availability flag so the UI never renders a fake zero when a query fails or
 * the underlying table has not been migrated yet.
 */

export type Metric = { value: number | null; available: boolean; note?: string };

export type Overview = {
  configured: boolean;
  metrics: Record<string, Metric>;
  recentActions: Array<{ id: string; action: string; actor_role: string | null; target_type: string | null; success: boolean; created_at: string }>;
};

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

async function metric(pathWithFilters: string): Promise<Metric> {
  try {
    const value = await adminCount(pathWithFilters);
    if (value === null) return { value: null, available: false, note: "Unavailable" };
    return { value, available: true };
  } catch {
    return { value: null, available: false, note: "Unavailable" };
  }
}

export async function getAdminOverview(): Promise<Overview> {
  if (!isAdminConfigured()) {
    return { configured: false, metrics: {}, recentActions: [] };
  }

  const [
    totalUsers,
    newUsers7d,
    totalSolves,
    solvesToday,
    challengesCreated,
    challengesCompleted,
    suspiciousPending,
    activeCampaigns,
    unresolvedReports,
    failedActions7d,
    securityAlerts,
    testSolves,
  ] = await Promise.all([
    metric(`/rest/v1/profiles?`),
    metric(`/rest/v1/profiles?created_at=gte.${iso(7)}`),
    metric(`/rest/v1/solve_results?is_test=eq.false`),
    metric(`/rest/v1/solve_results?is_test=eq.false&created_at=gte.${iso(1)}`),
    metric(`/rest/v1/challenges?is_test=eq.false`),
    metric(`/rest/v1/challenges?is_test=eq.false&status=eq.completed`),
    metric(`/rest/v1/solve_results?is_suspicious=eq.true&moderation_status=eq.flagged`),
    metric(`/rest/v1/ad_campaigns?status=eq.active`),
    metric(`/rest/v1/moderation_reports?status=in.(open,reviewing)`),
    metric(`/rest/v1/admin_audit_log?success=eq.false&created_at=gte.${iso(7)}`),
    metric(`/rest/v1/admin_security_events?resolved=eq.false&severity=eq.critical`),
    metric(`/rest/v1/solve_results?is_test=eq.true`),
  ]);

  let recentActions: Overview["recentActions"] = [];
  try {
    recentActions = await adminRequest<Overview["recentActions"]>(
      `/rest/v1/admin_audit_log?select=id,action,actor_role,target_type,success,created_at&order=created_at.desc&limit=8`,
    );
  } catch {
    recentActions = [];
  }

  return {
    configured: true,
    metrics: {
      totalUsers,
      newUsers7d,
      totalSolves,
      solvesToday,
      challengesCreated,
      challengesCompleted,
      suspiciousPending,
      activeCampaigns,
      unresolvedReports,
      failedActions7d,
      securityAlerts,
      testSolves,
    },
    recentActions,
  };
}
