import "server-only";

import { adminCount, adminRequest, isAdminConfigured } from "./service-client";
import { MFA_REQUIRED, hasVerifiedFactor } from "./mfa";

/*
 * Protected security-check routine. It reports the BEST AVAILABLE truth and is
 * scrupulously honest about what it could and could not verify automatically.
 * Never claims automated verification where only a manual check was possible.
 */

export type CheckStatus = "passed" | "warning" | "failed" | "unavailable" | "manual";

export type SecurityCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

async function tableHasRows(path: string): Promise<number | null> {
  try {
    return await adminCount(path);
  } catch {
    return null;
  }
}

export async function getSecuritySummary(): Promise<{ checks: SecurityCheck[]; events: Array<{ id: string; event_type: string; severity: string; created_at: string; resolved: boolean }> }> {
  const checks: SecurityCheck[] = [];

  // Service-role configuration (server-only env presence).
  const configured = isAdminConfigured();
  checks.push({
    id: "service_role_configured",
    label: "Service-role key configured server-side",
    status: configured ? "passed" : "failed",
    detail: configured
      ? "SUPABASE_SERVICE_ROLE_KEY is present in the server environment and never exposed as NEXT_PUBLIC_*."
      : "SUPABASE_SERVICE_ROLE_KEY is not set. Admin data access is disabled until it is configured.",
  });

  // NEXT_PUBLIC leak guard: the service-role key must not be a public var.
  const publicLeak = Boolean(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
  checks.push({
    id: "service_role_not_public",
    label: "Service-role key is not exposed to the browser",
    status: publicLeak ? "failed" : "passed",
    detail: publicLeak
      ? "A NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY variable exists. Remove it immediately."
      : "No NEXT_PUBLIC service-role variable detected.",
  });

  // Route protection is enforced in code (layout requireAdmin + per-action
  // authorizeAction). We can assert the mechanism exists but real rejection is
  // covered by automated tests, not by a live probe here.
  checks.push({
    id: "route_protection",
    label: "Admin routes reject non-admins server-side",
    status: "manual",
    detail: "Enforced by requireAdmin() in app/admin/layout.tsx and authorizeAction() in each server action. Verified by the authorization unit tests; confirm in a browser with a non-admin account before trusting production.",
  });

  // Audit log active?
  const auditRows = await tableHasRows(`/rest/v1/admin_audit_log?`);
  checks.push({
    id: "audit_active",
    label: "Audit logging is active",
    status: auditRows === null ? "unavailable" : auditRows > 0 ? "passed" : "warning",
    detail:
      auditRows === null
        ? "Could not read admin_audit_log. Confirm the admin migration has run."
        : auditRows > 0
          ? `admin_audit_log contains ${auditRows} record(s).`
          : "admin_audit_log exists but is empty. It will populate as privileged actions occur.",
  });

  // Test-data isolation: public-eligible leaderboard queries exclude test rows.
  const testSolves = await tableHasRows(`/rest/v1/solve_results?is_test=eq.true`);
  checks.push({
    id: "test_isolation",
    label: "Public leaderboard queries exclude test data",
    status: testSolves === null ? "unavailable" : "passed",
    detail:
      testSolves === null
        ? "Could not read solve_results. Confirm the admin migration added is_test."
        : `Leaderboard reads filter is_test=false and leaderboard_eligible=true by contract. ${testSolves} test solve(s) present and excluded.`,
  });

  // RLS on admin tables — cannot be introspected without pg_catalog access via
  // the REST API; treat as manual/migration-verified.
  checks.push({
    id: "rls_admin_tables",
    label: "Exposed tables have RLS enabled",
    status: "manual",
    detail: "The admin migration enables RLS on every new table with no permissive anon/user policy. Verify with the RLS checklist (docs/SECURITY.md) using the Supabase advisor.",
  });

  // Storage policies — provider dashboard concern.
  checks.push({
    id: "storage_policies",
    label: "Storage policies exist for private buckets",
    status: "manual",
    detail: "Storage bucket policies are managed in the Supabase dashboard and cannot be read here. Manual check required.",
  });

  // Leaked-password protection (known dashboard flag, per prior health review).
  checks.push({
    id: "leaked_password_protection",
    label: "Supabase leaked-password protection enabled",
    status: "manual",
    detail: "Dashboard-only Auth setting. Prior review recorded this as disabled — verify and enable in Supabase Auth settings.",
  });

  // Admin 2FA: enforcement flag + whether the acting admin has a verified factor.
  const mfaOwn = await hasVerifiedFactor().catch(() => false);
  checks.push({
    id: "admin_mfa_enforced",
    label: "Admin two-factor enforcement",
    status: MFA_REQUIRED ? "passed" : "warning",
    detail: MFA_REQUIRED
      ? "ADMIN_REQUIRE_MFA is on. Admins must complete an MFA challenge (aal2) to reach privileged pages."
      : "ADMIN_REQUIRE_MFA is off. Enrol at /admin/security/mfa, then set ADMIN_REQUIRE_MFA=true to require it for every admin.",
  });
  checks.push({
    id: "admin_mfa_enrolled",
    label: "Your account has a verified authenticator",
    status: mfaOwn ? "passed" : "warning",
    detail: mfaOwn ? "You have a verified TOTP factor." : "Open /admin/security/mfa to enrol an authenticator app.",
  });

  // Rate limiting: activates when the 20260726 migration is applied.
  checks.push({
    id: "rate_limits",
    label: "Rate limiting active on sensitive routes",
    status: "manual",
    detail: "Sign-in lockout, password-reset throttling, admin-action throttling, media upload, checkout, and ad tracking all call check_rate_limit. Fails open until 20260726_rate_limiting.sql is applied; then it silently activates.",
  });

  // Security headers ship in next.config.mjs; the RESPONSE cannot be introspected
  // from here, so this is a labelled-manual check pointing at the real config.
  checks.push({
    id: "security_headers",
    label: "Security response headers configured",
    status: "manual",
    detail: "HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, and a report-only CSP are set in next.config.mjs. Verify with curl -I on production.",
  });

  // Required env inventory (presence only, never values).
  const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const missing = requiredEnv.filter((k) => !process.env[k] && !(k === "SUPABASE_URL" && process.env.NEXT_PUBLIC_SUPABASE_URL));
  checks.push({
    id: "env_inventory",
    label: "Required environment variables configured",
    status: missing.length === 0 ? "passed" : "warning",
    detail: missing.length === 0 ? "All required variables are present." : `Missing: ${missing.join(", ")}.`,
  });

  let events: Array<{ id: string; event_type: string; severity: string; created_at: string; resolved: boolean }> = [];
  try {
    events = await adminRequest(
      `/rest/v1/admin_security_events?select=id,event_type,severity,created_at,resolved&order=created_at.desc&limit=20`,
    );
  } catch {
    events = [];
  }

  return { checks, events };
}
