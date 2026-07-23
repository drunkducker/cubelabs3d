import "server-only";

import { adminRequest } from "./service-client";

/*
 * Premium / billing service. Premium ENTITLEMENT is written to the user's auth
 * app_metadata (never client-writable); subscription history lives in
 * premium_subscriptions. Stripe is one provider behind this boundary — swapping
 * providers only touches the webhook + this file.
 */

export type PremiumPlan = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  removes_ads: boolean;
  is_active: boolean;
  provider_price_id: string | null;
  sort_order: number;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  provider: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  is_test: boolean;
  created_at: string;
};

export async function getPlans(): Promise<PremiumPlan[]> {
  try {
    return await adminRequest<PremiumPlan[]>(`/rest/v1/premium_plans?select=*&order=sort_order`);
  } catch {
    return [];
  }
}

export async function getRecentSubscriptions(limit = 25): Promise<Subscription[]> {
  try {
    return await adminRequest<Subscription[]>(
      `/rest/v1/premium_subscriptions?select=id,user_id,plan_id,status,provider,current_period_end,cancel_at_period_end,is_test,created_at&order=created_at.desc&limit=${Math.min(100, limit)}`,
    );
  } catch {
    return [];
  }
}

/*
 * Upsert a subscription and sync the premium entitlement flag on the auth user.
 * Called by the Stripe webhook after signature verification, and reusable for
 * manual admin grants.
 */
export async function syncSubscription(input: {
  userId: string;
  planId: string | null;
  status: Subscription["status"];
  provider?: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  isTest?: boolean;
}): Promise<void> {
  const provider = input.provider ?? "stripe";
  await adminRequest(`/rest/v1/premium_subscriptions`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: input.userId,
      plan_id: input.planId,
      status: input.status,
      provider,
      provider_customer_id: input.providerCustomerId ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      current_period_end: input.currentPeriodEnd ?? null,
      cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
      is_test: input.isTest ?? false,
      updated_at: new Date().toISOString(),
    }),
  });

  const premium = input.status === "active" || input.status === "trialing";
  await adminRequest(`/auth/v1/admin/users/${input.userId}`, {
    method: "PUT",
    body: JSON.stringify({ app_metadata: { premium, premium_expires_at: input.currentPeriodEnd ?? null } }),
  });
}
