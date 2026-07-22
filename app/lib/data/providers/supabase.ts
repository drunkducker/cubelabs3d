import type { AdminRole } from "@/app/lib/admin";
import { supabaseRequest } from "@/app/lib/supabase-rest";
import type {
  AccessContext,
  AdInput,
  AdRecord,
  AuditInput,
  AuditRecord,
  AuthUser,
  CubeLabsData,
  DashboardMetrics,
} from "../types";

/*
 * Supabase implementation of the Cube Labs data contract. This is the ONLY
 * place Supabase REST paths and query syntax live. To move providers, add a
 * sibling file implementing CubeLabsData and switch DATA_PROVIDER — no feature
 * code changes.
 */

function token(ctx: AccessContext): string | null | undefined {
  return ctx.accessToken;
}

export const supabaseProvider: CubeLabsData = {
  name: "supabase",

  auth: {
    async currentUser(ctx): Promise<AuthUser | null> {
      const t = token(ctx);
      if (!t) return null;
      try {
        const user = await supabaseRequest<AuthUser>("/auth/v1/user", {}, t);
        return user?.id ? user : null;
      } catch {
        return null;
      }
    },
  },

  profiles: {
    async getRole(ctx, userId): Promise<AdminRole | null> {
      const rows = await supabaseRequest<{ role: AdminRole }[]>(
        `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role`,
        {},
        token(ctx),
      );
      return rows?.[0]?.role ?? null;
    },
    async countAll(ctx): Promise<number | null> {
      try {
        const rows = await supabaseRequest<{ id: string }[]>(
          "/rest/v1/profiles?select=id&limit=10000",
          {},
          token(ctx),
        );
        return Array.isArray(rows) ? rows.length : null;
      } catch {
        return null;
      }
    },
  },

  ads: {
    async list(ctx): Promise<AdRecord[]> {
      return supabaseRequest<AdRecord[]>(
        "/rest/v1/ads?select=*&order=priority.desc,created_at.desc",
        {},
        token(ctx),
      );
    },
    async create(ctx, input: AdInput): Promise<{ id: string }> {
      const rows = await supabaseRequest<{ id: string }[]>(
        "/rest/v1/ads",
        { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(input) },
        token(ctx),
      );
      return { id: rows?.[0]?.id };
    },
    async setActive(ctx, id, active): Promise<void> {
      await supabaseRequest(
        `/rest/v1/ads?id=eq.${encodeURIComponent(id)}`,
        { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: active, updated_at: new Date().toISOString() }) },
        token(ctx),
      );
    },
    async remove(ctx, id): Promise<void> {
      await supabaseRequest(
        `/rest/v1/ads?id=eq.${encodeURIComponent(id)}`,
        { method: "DELETE", headers: { Prefer: "return=minimal" } },
        token(ctx),
      );
    },
  },

  audit: {
    async recent(ctx, limit): Promise<AuditRecord[]> {
      return supabaseRequest<AuditRecord[]>(
        `/rest/v1/admin_audit_log?select=*&order=created_at.desc&limit=${encodeURIComponent(String(limit))}`,
        {},
        token(ctx),
      );
    },
    async write(ctx, entry: AuditInput): Promise<boolean> {
      try {
        await supabaseRequest(
          "/rest/v1/admin_audit_log",
          {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              actor_id: entry.actor_id,
              actor_role: entry.actor_role,
              action: entry.action,
              target_type: entry.target_type ?? null,
              target_id: entry.target_id ?? null,
              previous_value: entry.previous_value ?? null,
              new_value: entry.new_value ?? null,
              reason: entry.reason ?? null,
              metadata: entry.metadata ?? null,
              success: entry.success ?? true,
            }),
          },
          token(ctx),
        );
        return true;
      } catch (error) {
        console.error("supabase audit write failed", error);
        return false;
      }
    },
  },

  metrics: {
    async dashboard(ctx): Promise<DashboardMetrics | null> {
      try {
        // Security-definer RPC; self-authorizes via is_admin().
        return await supabaseRequest<DashboardMetrics>(
          "/rest/v1/rpc/admin_dashboard_metrics",
          { method: "POST", body: "{}" },
          token(ctx),
        );
      } catch {
        return null;
      }
    },
  },
};
