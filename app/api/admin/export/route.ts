import { NextResponse } from "next/server";
import { authorizeAction } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { adminRequest } from "@/lib/admin/service-client";
import { handleActionError } from "@/app/admin/actions/shared";

export const dynamic = "force-dynamic";

/*
 * Owner/exports.create-only data export. Returns portable CSV or JSON for a
 * whitelisted dataset. Test data is EXCLUDED by default (opt in explicitly).
 * The audit_logs dataset is Owner-only. Every export is audited. This is a
 * bounded snapshot, NOT a verified backup — the UI states that clearly.
 */

const DATASETS: Record<string, { path: string; select: string; ownerOnly?: boolean; excludeTestFilter?: string }> = {
  profiles: { path: "/rest/v1/profiles", select: "id,display_name,username,public_slug,created_at" },
  solves: { path: "/rest/v1/solve_results", select: "id,user_id,puzzle_type,solve_time_ms,move_count,solved,is_dnf,is_test,created_at", excludeTestFilter: "is_test=eq.false" },
  challenges: { path: "/rest/v1/challenges", select: "id,sender_id,recipient_id,puzzle_type,status,is_test,created_at", excludeTestFilter: "is_test=eq.false" },
  campaigns: { path: "/rest/v1/ad_campaigns", select: "id,name,advertiser,placement,status,impression_count,click_count,created_at" },
  affiliate_products: { path: "/rest/v1/affiliate_products", select: "id,name,partner,placement,is_active,click_count" },
  settings: { path: "/rest/v1/site_settings", select: "key,value,data_type,category,is_public,is_secret,updated_at" },
  feature_flags: { path: "/rest/v1/feature_flags", select: "key,enabled,environment,rollout_percentage,updated_at" },
  audit_logs: { path: "/rest/v1/admin_audit_log", select: "id,actor_role,action,target_type,target_id,success,created_at", ownerOnly: true },
};

const MAX_ROWS = 5000;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dataset = (url.searchParams.get("dataset") ?? "").toLowerCase();
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const includeTest = url.searchParams.get("include_test") === "true";

  const config = DATASETS[dataset];
  if (!config) return NextResponse.json({ error: "Unknown dataset." }, { status: 400 });

  try {
    const ctx = await authorizeAction(config.ownerOnly ? "migration.manage" : "exports.create");

    const filters: string[] = [];
    if (config.excludeTestFilter && !includeTest) filters.push(config.excludeTestFilter);
    const query = `${config.path}?select=${config.select}${filters.length ? `&${filters.join("&")}` : ""}&order=created_at.desc`;
    const rows = await adminRequest<Record<string, unknown>[]>(query, { headers: { Range: `0-${MAX_ROWS - 1}` } });

    await writeAudit(ctx, {
      action: "export.create",
      targetType: "dataset",
      targetId: dataset,
      newValue: { dataset, format, includeTest, rowCount: rows.length },
      reason: "Admin data export",
    });

    const meta = { dataset, format, includeTest, rowCount: rows.length, schemaVersion: 1, generatedAt: new Date().toISOString() };
    if (format === "json") {
      return NextResponse.json({ meta, rows }, { headers: { "Content-Disposition": `attachment; filename="cubelabs-${dataset}.json"`, "Cache-Control": "no-store" } });
    }
    const csv = `# Cube Labs export ${JSON.stringify(meta)}\n${toCsv(rows)}`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cubelabs-${dataset}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = await handleActionError(error, "export.create");
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
