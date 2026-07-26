import { NextResponse } from "next/server";
import { resolveAdmin, AdminAuthError } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { enrollTotp, verifyTotp, unenrollFactor } from "@/lib/admin/mfa";
import { checkRateLimit } from "@/lib/admin/rate-limit";
import { normalizeText } from "@/lib/admin/validation";

export const dynamic = "force-dynamic";

/*
 * Admin 2FA management for the acting administrator. Every action requires an
 * active admin session (resolveAdmin). TOTP verification is rate-limited to
 * blunt code guessing. Secrets/codes are never logged.
 */
export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await resolveAdmin();
  } catch (error) {
    const status = error instanceof AdminAuthError && error.code === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: "Not authorized." }, { status });
  }

  let body: { action?: string; factor_id?: string; code?: string; name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (body.action === "enroll") {
    const result = await enrollTotp(normalizeText(body.name, 60) || "Cube Labs Admin");
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await writeAudit(ctx, { action: "mfa.enroll.start", targetType: "user", targetId: ctx.userId, reason: "TOTP enrollment started" });
    return NextResponse.json(result); // qr + secret shown once to the enrolling user only
  }

  if (body.action === "verify") {
    if (!body.factor_id) return NextResponse.json({ error: "factor_id required." }, { status: 400 });
    if (!(await checkRateLimit(`mfa_verify:${ctx.userId}`, 8, 300))) {
      return NextResponse.json({ error: "Too many attempts. Wait a few minutes." }, { status: 429 });
    }
    const code = normalizeText(body.code, 10).replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
    const result = await verifyTotp(body.factor_id, code);
    await writeAudit(ctx, { action: "mfa.verify", targetType: "user", targetId: ctx.userId, success: result.ok, failureCategory: result.ok ? null : "invalid_code", reason: "TOTP verification" });
    if (!result.ok) return NextResponse.json({ error: result.error ?? "Invalid code." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unenroll") {
    if (!body.factor_id) return NextResponse.json({ error: "factor_id required." }, { status: 400 });
    const ok = await unenrollFactor(body.factor_id);
    await writeAudit(ctx, { action: "mfa.unenroll", targetType: "user", targetId: ctx.userId, success: ok, reason: "TOTP factor removed" });
    return NextResponse.json({ ok });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
