import "server-only";

import { adminRequest } from "./service-client";
import { redactValue } from "./redact";
import type { AdminContext } from "./auth";

/*
 * Append-only audit + security-event writers. All values are redacted before
 * they touch the database. Audit failures must never crash the primary
 * operation, but they ARE surfaced (returned) so callers can react.
 */

export type AuditInput = {
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  success?: boolean;
  failureCategory?: string | null;
};

export async function writeAudit(ctx: Pick<AdminContext, "userId" | "role" | "correlationId" | "requestMeta">, input: AuditInput) {
  try {
    await adminRequest("/rest/v1/admin_audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_id: ctx.userId,
        actor_role: ctx.role,
        action: input.action,
        target_type: input.targetType ?? null,
        target_id: input.targetId ?? null,
        previous_value: input.previousValue === undefined ? null : redactValue(input.previousValue),
        new_value: input.newValue === undefined ? null : redactValue(input.newValue),
        reason: input.reason ?? null,
        success: input.success ?? true,
        failure_category: input.failureCategory ?? null,
        correlation_id: ctx.correlationId,
        request_meta: redactValue(ctx.requestMeta),
      }),
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "audit write failed" };
  }
}

export type SecurityEventInput = {
  eventType: string;
  severity?: "info" | "warning" | "critical";
  actorId?: string | null;
  targetId?: string | null;
  detail?: unknown;
  requestMeta?: unknown;
};

export async function writeSecurityEvent(input: SecurityEventInput) {
  try {
    await adminRequest("/rest/v1/admin_security_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        event_type: input.eventType,
        severity: input.severity ?? "info",
        actor_id: input.actorId ?? null,
        target_id: input.targetId ?? null,
        detail: input.detail === undefined ? null : redactValue(input.detail),
        request_meta: input.requestMeta === undefined ? null : redactValue(input.requestMeta),
      }),
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}
