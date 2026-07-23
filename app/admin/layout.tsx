import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

/*
 * The admin layout is the primary server-side gate: requireAdmin() validates
 * the session, confirms an ACTIVE admin_members row, and redirects everything
 * else. Every child page and server action re-checks permission independently.
 *
 * force-dynamic + no caching so privileged data is never statically rendered
 * or served from a shared cache.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  return (
    <AdminShell role={ctx.role} email={ctx.email}>
      {children}
    </AdminShell>
  );
}
