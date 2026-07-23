import { getAffiliateProducts, type PublicAffiliateProduct } from "@/lib/ads/public";
import { TrackedLink } from "./tracking";

/*
 * Affiliate product card + grid. Every card shows its disclosure and uses a
 * rel="sponsored nofollow" tracked link (required by Amazon Associates and good
 * SEO hygiene). Renders whatever the owner entered in /admin/carousels.
 */

export function AffiliateProductCard({ product }: { product: PublicAffiliateProduct }) {
  const href = product.affiliate_url || product.destination_url;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image_url} alt={product.name} className="aspect-square w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid aspect-square w-full place-items-center bg-black/20 text-3xl text-[var(--faint)]">◈</div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <strong className="leading-tight">{product.name}</strong>
          {product.is_featured && <span className="rounded bg-[var(--gold)]/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-[var(--gold)]">Featured</span>}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">{product.brand || product.partner || product.puzzle_type}</p>
        {product.description && <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{product.description}</p>}
        <div className="mt-auto pt-3">
          {product.price_note && <p className="mb-2 text-sm font-black">{product.price_note}</p>}
          {href && (
            <TrackedLink
              id={product.id}
              kind="affiliate_click"
              href={href}
              className="block rounded-xl bg-[var(--blue)] px-4 py-2 text-center text-sm font-extrabold text-white"
            >
              View on {product.partner || "store"}
            </TrackedLink>
          )}
          <p className="mt-2 text-[10px] leading-4 text-[var(--faint)]">{product.disclosure || "Affiliate link — we may earn a commission."}</p>
        </div>
      </div>
    </article>
  );
}

/** Server component: fetches active affiliate products for a placement and renders a grid. */
export default async function AffiliateProductGrid({ placement, title, className = "" }: { placement: string; title?: string; className?: string }) {
  const products = await getAffiliateProducts(placement);
  if (products.length === 0) return null;
  return (
    <section className={className} aria-label={title ?? "Recommended products"}>
      {title && <h2 className="mb-3 text-lg font-black">{title}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <AffiliateProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
