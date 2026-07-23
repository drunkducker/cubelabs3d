import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { syncSubscription } from "@/lib/admin/billing";

export const dynamic = "force-dynamic";

/*
 * Stripe webhook. Verifies the signature WITHOUT the Stripe SDK using the
 * documented scheme: HMAC-SHA256(secret, `${timestamp}.${rawBody}`) compared
 * against the v1 signature, within a 5-minute tolerance, using a timing-safe
 * compare. Fails closed when STRIPE_WEBHOOK_SECRET is not set.
 *
 * The user is resolved from the object's metadata.user_id (set when the
 * checkout session is created), so entitlement can never be forged from the
 * client — only Stripe can produce a valid signature.
 */

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const TOLERANCE_SECONDS = 60 * 5;

function verify(rawBody: string, sigHeader: string | null): boolean {
  if (!WEBHOOK_SECRET || !sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${rawBody}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

type StripeObject = {
  id?: string;
  customer?: string;
  status?: string;
  client_reference_id?: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  livemode?: boolean;
  metadata?: { user_id?: string; plan_id?: string };
};

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing webhook not configured." }, { status: 503 });
  }
  const raw = await request.text();
  if (!verify(raw, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: StripeObject } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  const obj = event.data?.object ?? {};
  const userId = obj.metadata?.user_id || obj.client_reference_id;
  if (!userId) return NextResponse.json({ received: true, skipped: "no user id" });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscription({
          userId,
          planId: obj.metadata?.plan_id ?? null,
          status: (obj.status as never) ?? "active",
          providerCustomerId: obj.customer ?? null,
          providerSubscriptionId: obj.id ?? null,
          currentPeriodEnd: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null,
          cancelAtPeriodEnd: obj.cancel_at_period_end ?? false,
          isTest: obj.livemode === false,
        });
        break;
      case "customer.subscription.deleted":
        await syncSubscription({
          userId,
          planId: obj.metadata?.plan_id ?? null,
          status: "canceled",
          providerSubscriptionId: obj.id ?? null,
          isTest: obj.livemode === false,
        });
        break;
      default:
        break;
    }
  } catch {
    // Return 200 so Stripe does not hammer retries on a transient DB error;
    // the event id is idempotent via the unique (provider, subscription id).
    return NextResponse.json({ received: true, note: "processing error" });
  }

  return NextResponse.json({ received: true });
}
