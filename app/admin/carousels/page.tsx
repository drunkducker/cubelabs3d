import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { listRows } from "@/lib/admin/list";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, EmptyState, Notice, PageHeader, StatusPill } from "@/components/admin/ui";
import { createAffiliateProduct } from "@/app/admin/actions/ads";

export const dynamic = "force-dynamic";

type Carousel = { id: string; name: string; placement: string; status: string };
type Affiliate = { id: string; name: string; partner: string | null; brand: string | null; placement: string | null; is_active: boolean; is_featured: boolean; disclosure: string | null; click_count: number };

export default async function CarouselsPage({ searchParams }: { searchParams: { message?: string; error?: string } }) {
  const ctx = await requirePermission("ads.read");
  const canManage = hasPermission(ctx.role, "ads.manage");
  const configured = isAdminConfigured();
  const [carousels, products] = configured
    ? await Promise.all([
        listRows<Carousel>("/rest/v1/ad_carousels?select=id,name,placement,status&order=created_at.desc"),
        listRows<Affiliate>("/rest/v1/affiliate_products?select=id,name,partner,brand,placement,is_active,is_featured,disclosure,click_count&order=sort_order,created_at.desc"),
      ])
    : [[], []];

  return (
    <div>
      <PageHeader title="Carousels & affiliates" subtitle="Managed carousels and affiliate products. Drafts never render publicly; every affiliate link is disclosed." />
      {searchParams.message && <div className="mb-4"><Notice tone="info">{searchParams.message}</Notice></div>}
      {searchParams.error && <div className="mb-4"><Notice tone="danger">{searchParams.error}</Notice></div>}
      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — carousel/affiliate management disabled until the migration and service-role key are in place.</Notice></div>}

      {canManage && (
        <Card className="mb-4">
          <h2 className="mb-3 text-lg font-black">New affiliate product (inactive on create)</h2>
          <form action={createAffiliateProduct} className="grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Product name" className="input" />
            <input name="partner" placeholder="Partner (e.g. Amazon)" className="input" />
            <input name="brand" placeholder="Brand" className="input" />
            <input name="puzzle_type" placeholder="Puzzle type" className="input" />
            <input name="affiliate_url" required placeholder="Affiliate URL (https, required)" className="input" />
            <input name="destination_url" placeholder="Destination URL (https)" className="input" />
            <input name="image_url" placeholder="Image URL (https)" className="input" />
            <input name="price_note" placeholder="Price note" className="input" />
            <input name="disclosure" placeholder="Disclosure (default provided)" className="input sm:col-span-2" />
            <textarea name="description" placeholder="Description" className="input sm:col-span-2" />
            <button className="min-h-[44px] rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white sm:col-span-2">Create product</button>
          </form>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-black">Carousels</h2>
          {carousels.length === 0 ? (
            <EmptyState title="No carousels" hint="Carousel + slide editing (reorder, preview, schedule) is the next build step; the schema is in place." />
          ) : (
            <ul className="grid gap-2">
              {carousels.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
                  <div><p className="font-bold">{c.name}</p><p className="text-xs text-[var(--muted)]">{c.placement}</p></div>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-black">Affiliate products</h2>
          {products.length === 0 ? (
            <EmptyState title="No affiliate products" hint={canManage ? "Create your first product above." : "Products will appear here once created."} />
          ) : (
            <ul className="grid gap-2">
              {products.map((p) => (
                <li key={p.id} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{p.name}</p>
                    <StatusPill status={p.is_active ? "active" : "draft"} />
                  </div>
                  <p className="text-xs text-[var(--muted)]">{p.brand || p.partner || "—"} · {p.placement} · {p.click_count} clicks</p>
                  <p className="mt-1 text-[10px] text-[var(--faint)]">{p.disclosure}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
