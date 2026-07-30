import { NextRequest, NextResponse } from "next/server";
import { processPrivacyQueue } from "@/lib/privacy/service";
import { isPrivacyServiceConfigured } from "@/lib/privacy/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.PRIVACY_WORKER_SECRET || "";
  if (!secret) return false;
  const authorization = request.headers.get("authorization") || "";
  return authorization === `Bearer ${secret}`;
}

async function run(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!isPrivacyServiceConfigured()) {
    return NextResponse.json({ ok: false, error: "Privacy service is not configured." }, { status: 503 });
  }

  const limitValue = Number(request.nextUrl.searchParams.get("limit") || "10");
  const limit = Number.isFinite(limitValue) ? Math.min(25, Math.max(1, Math.floor(limitValue))) : 10;
  const results = await processPrivacyQueue(limit);
  return NextResponse.json({
    ok: results.every((result) => result.ok),
    processed: results.length,
    results,
    ran_at: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
