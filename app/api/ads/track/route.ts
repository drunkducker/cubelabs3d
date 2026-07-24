import { NextResponse } from "next/server";
import { supabaseRequest } from "@/app/lib/supabase-rest";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";

export const dynamic = "force-dynamic";

/*
 * Public ad metric beacon. Records an impression or click by calling a narrow
 * SECURITY DEFINER RPC (see 20260724_ad_rendering.sql) with the anon key. The
 * RPC can only increment one counter on a live row — it grants no read/write
 * access to anything else, so this endpoint is safe to expose publicly.
 */

const RPC: Record<string, string> = {
  ad_impression: "bump_ad_impression",
  ad_click: "bump_ad_click",
  affiliate_click: "bump_affiliate_click",
};

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  let body: { kind?: string; id?: string };
  try {
    body = (await request.json()) as { kind?: string; id?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const fn = body.kind ? RPC[body.kind] : undefined;
  if (!fn || !body.id || !UUID.test(body.id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Best-effort abuse control on the public beacon (fails open so a limiter
  // outage never blocks page rendering). 240 events/min/IP is generous.
  const allowed = await checkRateLimit(`ad_track:${clientIp()}`, 240, 60);
  if (!allowed) return NextResponse.json({ ok: true, throttled: true });

  const arg = fn === "bump_affiliate_click" ? { product: body.id } : { campaign: body.id };
  try {
    await supabaseRequest(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(arg) });
  } catch {
    // Never let tracking failure surface to the user.
  }
  return NextResponse.json({ ok: true });
}
