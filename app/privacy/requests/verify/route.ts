import { NextRequest, NextResponse } from "next/server";
import { verifyPublicPrivacyToken } from "@/lib/privacy/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const result = await verifyPublicPrivacyToken(token);
  const url = new URL("/privacy/requests", request.url);
  url.searchParams.set("verified", result.ok ? "1" : "0");
  url.searchParams.set("message", result.message);
  if (result.requestId) url.searchParams.set("case", result.requestId);
  return NextResponse.redirect(url);
}
