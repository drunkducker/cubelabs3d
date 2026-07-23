import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { searchUsers } from "@/lib/admin/users";
import { Card, EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import { isAdminConfigured } from "@/lib/admin/service-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  await requirePermission("users.read");

  const query = (searchParams.q ?? "").slice(0, 120);
  const page = Math.max(0, parseInt(searchParams.page ?? "0", 10) || 0);
  const configured = isAdminConfigured();
  const { rows, pageSize } = configured ? await searchUsers({ query, page }) : { rows: [], pageSize: 25 };

  return (
    <div>
      <PageHeader title="Users" subtitle="Search and administer Cube ID accounts. Reads are bounded and paginated." />

      {!configured && (
        <div className="mb-4">
          <Notice tone="warning">Admin service not configured — user search is disabled until the service-role key and migration are in place.</Notice>
        </div>
      )}

      <Card className="mb-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Search users</span>
            <input
              name="q"
              defaultValue={query}
              placeholder="Email, display name, username, Cube Tag, slug, or user ID"
              className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-black/20 px-4 text-sm"
            />
          </label>
          <button className="min-h-[44px] rounded-xl bg-[var(--blue)] px-5 text-sm font-extrabold text-white">Search</button>
        </form>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Filters (active, suspended, premium, test, reported, administrator, visibility) apply on the detail view and via targeted search terms.
        </p>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title={query ? "No matching accounts" : "Start by searching"} hint={query ? "Try a different term." : "Enter an email, name, or ID above."} />
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{u.display_name || u.username || "Unnamed"}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {u.cube_tag || u.public_slug || u.id} · joined {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link href={`/admin/users/${u.id}`} className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-extrabold">
                  Manage
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm">
            {page > 0 ? (
              <Link href={`/admin/users?q=${encodeURIComponent(query)}&page=${page - 1}`} className="font-extrabold text-[var(--blue)]">← Previous</Link>
            ) : (
              <span />
            )}
            <span className="text-[var(--muted)]">Page {page + 1}</span>
            {rows.length === pageSize ? (
              <Link href={`/admin/users?q=${encodeURIComponent(query)}&page=${page + 1}`} className="font-extrabold text-[var(--blue)]">Next →</Link>
            ) : (
              <span />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
