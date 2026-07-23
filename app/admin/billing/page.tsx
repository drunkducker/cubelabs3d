import { requirePermission } from "@/lib/admin/auth";
import { getPlans, getRecentSubscriptions, type Subscription } from "@/lib/admin/billing";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, EmptyState, Notice, PageHeader, StatusPill, TestBadge } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const dynamic = "force-dynamic";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default async function BillingPage() {
  await requirePermission("users.premium.manage");
  const configured = isAdminConfigured();
  const [plans, subs] = configured ? await Promise.all([getPlans(), getRecentSubscriptions()]) : [[], []];

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  const columns: Column<Subscription>[] = [
    { key: "user_id", header: "User", sortable: true, render: (r) => <code className="text-xs">{r.user_id.slice(0, 10)}…</code> },
    { key: "plan_id", header: "Plan", sortable: true },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status === "active" || r.status === "trialing" ? "active" : r.status === "canceled" ? "archived" : "warning"} /> },
    { key: "current_period_end", header: "Renews", sortable: true, render: (r) => (r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : "—") },
    { key: "is_test", header: "", render: (r) => (r.is_test ? <TestBadge /> : null) },
  ];

  return (
    <div>
      <PageHeader title="Premium & billing" subtitle="Plans, subscriptions, and provider status. Premium entitlement is written to the user's auth metadata by the verified Stripe webhook — never from the browser." />

      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — billing data unavailable until the service-role key and migration are in place.</Notice></div>}

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-black">Provider status</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
            <span className="font-bold">Stripe secret key</span><StatusPill status={stripeConfigured ? "passed" : "warning"} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
            <span className="font-bold">Stripe webhook secret</span><StatusPill status={webhookConfigured ? "passed" : "warning"} />
          </div>
        </div>
        {(!stripeConfigured || !webhookConfigured) && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Set <code>STRIPE_SECRET_KEY</code> and <code>STRIPE_WEBHOOK_SECRET</code> (server-only) to enable checkout and entitlement sync. Point your Stripe webhook at <code>/api/billing/webhook</code>.
          </p>
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-black">Plans</h2>
        {plans.length === 0 ? (
          <EmptyState title="No plans" hint="Seeded plans appear here once the 20260725 migration runs." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between">
                  <strong>{p.name}</strong>
                  <StatusPill status={p.is_active ? "active" : "archived"} />
                </div>
                <p className="mt-1 text-2xl font-black">{money(p.price_cents, p.currency)}<span className="text-sm font-normal text-[var(--muted)]">/{p.interval}</span></p>
                <p className="mt-1 text-xs text-[var(--muted)]">{p.description}</p>
                <p className="mt-2 text-[10px] text-[var(--faint)]">Price ID: <code>{p.provider_price_id || "not set"}</code></p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-black">Recent subscriptions</h2>
        <DataTable columns={columns} rows={subs} filterKeys={["user_id", "plan_id", "status"]} getRowKey={(r) => r.id} emptyText="No subscriptions yet." />
      </Card>
    </div>
  );
}
