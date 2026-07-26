import { NextResponse } from "next/server";
import { getAccessToken, getSupabaseConfig } from "@/app/lib/supabase-rest";
import { checkRateLimit } from "@/lib/admin/rate-limit";

export const dynamic = "force-dynamic";

/*
 * Creates a Stripe Checkout session for the signed-in user to buy a plan.
 * Uses the Stripe REST API directly (no SDK dependency). Requires the user to
 * be authenticated so we can stamp metadata.user_id — that id is what the
 * webhook trusts when granting premium. Fails closed without STRIPE_SECRET_KEY.
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://cubelabs3d.vercel.app").replace(/\/$/, "");

export async function POST(request: Request) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const token = getAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  // Resolve the caller's real user id from their own token.
  const { url, key } = getSupabaseConfig();
  const userRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!userRes.ok) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  const user = (await userRes.json()) as { id: string; email?: string };

  // Throttle checkout-session creation per user.
  if (!(await checkRateLimit(`checkout:${user.id}`, 8, 60))) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  let body: { price_id?: string; plan_id?: string };
  try {
    body = (await request.json()) as { price_id?: string; plan_id?: string };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!body.price_id) return NextResponse.json({ error: "price_id required." }, { status: 400 });

  // Stripe expects application/x-www-form-urlencoded.
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("success_url", `${SITE_URL}/profile?upgraded=1`);
  form.set("cancel_url", `${SITE_URL}/profile`);
  form.set("client_reference_id", user.id);
  form.set("customer_email", user.email ?? "");
  form.set("line_items[0][price]", body.price_id);
  form.set("line_items[0][quantity]", "1");
  form.set("metadata[user_id]", user.id);
  if (body.plan_id) form.set("metadata[plan_id]", body.plan_id);
  form.set("subscription_data[metadata][user_id]", user.id);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const session = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !session.url) {
    return NextResponse.json({ error: session.error?.message ?? "Could not start checkout." }, { status: 400 });
  }
  return NextResponse.json({ url: session.url });
}
