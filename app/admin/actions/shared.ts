import "server-only";

import { headers } from "next/headers";
import { AdminAuthError } from "@/lib/admin/auth";
import { writeSecurityEvent } from "@/lib/admin/audit";
import { ValidationError } from "@/lib/admin/validation";

/*
 * Origin check for privileged mutations: reject requests whose Origin header
 * does not match the request Host. Server actions are CSRF-hardened by Next,
 * but this is defense in depth for the privileged surface.
 */
export function assertSameOrigin() {
  const h = headers();
  const origin = h.get("origin");
  if (!origin) return; // same-origin form posts may omit Origin; Next protects these.
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    if (host && new URL(origin).host !== host) {
      throw new ValidationError("Cross-origin request rejected.");
    }
  } catch {
    throw new ValidationError("Invalid request origin.");
  }
}

/*
 * Translate an error into a user-safe message and record a security event for
 * authorization failures. Never leaks internal detail to the client.
 */
export async function handleActionError(error: unknown, action: string, actorId?: string | null): Promise<string> {
  if (error instanceof AdminAuthError) {
    if (error.code === "forbidden" || error.code === "not_admin") {
      await writeSecurityEvent({
        eventType: "unauthorized_admin_action",
        severity: "warning",
        actorId: actorId ?? null,
        detail: { action, code: error.code },
      });
      return "You do not have permission to perform that action.";
    }
    if (error.code === "unauthenticated") return "Your session expired. Please sign in again.";
    return "The admin service is not configured.";
  }
  if (error instanceof ValidationError) return error.message;
  return "The operation could not be completed.";
}

export function backTo(path: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${path}?${qs}`;
}
