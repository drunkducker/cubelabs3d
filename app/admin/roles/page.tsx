import { requirePermission } from "@/lib/admin/auth";
import { listAdminMembers, type AdminMemberRow } from "@/lib/admin/roles";
import { ADMIN_ROLES, permissionsForRole } from "@/lib/admin/permissions";
import { isAdminConfigured } from "@/lib/admin/service-client";
import { Card, Notice, PageHeader, StatusPill } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { upsertAdminMember, deactivateAdminMember } from "@/app/admin/actions/roles";

export const dynamic = "force-dynamic";

/*
 * Roles & permissions (Owner-only). Assign roles by email, view each role's
 * capabilities, and deactivate memberships. The permission MATRIX is enforced
 * in code; this page just manages who holds which role.
 */
export default async function RolesPage({ searchParams }: { searchParams: { message?: string; error?: string } }) {
  await requirePermission("roles.manage"); // Owner-only
  const configured = isAdminConfigured();
  const members = configured ? await listAdminMembers() : [];

  const columns: Column<AdminMemberRow>[] = [
    { key: "user_id", header: "User", sortable: true, render: (r) => <code className="text-xs">{r.user_id.slice(0, 12)}…</code> },
    { key: "role", header: "Role", sortable: true, render: (r) => <span className="font-black uppercase text-[var(--blue)]">{r.role}</span> },
    { key: "is_active", header: "Status", sortable: true, render: (r) => <StatusPill status={r.is_active ? "active" : "archived"} /> },
    { key: "note", header: "Note", render: (r) => <span className="text-[var(--muted)]">{r.note ?? "—"}</span> },
    {
      key: "user_id",
      header: "Actions",
      render: (r) =>
        r.is_active ? (
          <form action={deactivateAdminMember}>
            <input type="hidden" name="user_id" value={r.user_id} />
            <button className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-extrabold">Deactivate</button>
          </form>
        ) : (
          <span className="text-xs text-[var(--muted)]">inactive</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Roles & permissions" subtitle="Owner-only. Assign administrator roles by email and review what each role can do. Authorization is stored in admin_members, never in profiles." />
      {searchParams.message && <div className="mb-4"><Notice tone="info">{searchParams.message}</Notice></div>}
      {searchParams.error && <div className="mb-4"><Notice tone="danger">{searchParams.error}</Notice></div>}
      {!configured && <div className="mb-4"><Notice tone="warning">Admin service not configured — role management disabled until the service-role key and migration are in place.</Notice></div>}

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-black">Assign / update a role</h2>
        <form action={upsertAdminMember} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
          <input name="email" required placeholder="Account email (must exist)" className="input" />
          <select name="role" className="input">
            {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input name="note" placeholder="Internal note (optional)" className="input" />
          <button className="min-h-[44px] rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white">Save</button>
        </form>
        <p className="mt-2 text-xs text-[var(--muted)]">Assigning <strong>owner</strong> grants full access including this page. The last active Owner cannot be deactivated.</p>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-black">Administrators</h2>
        <DataTable columns={columns} rows={members} filterKeys={["user_id", "role", "note"]} getRowKey={(r) => r.user_id} emptyText="No administrators yet." />
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-black">What each role can do</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_ROLES.map((role) => (
            <div key={role} className="rounded-xl border border-[var(--border)] p-3">
              <p className="mb-2 font-black uppercase text-[var(--blue)]">{role}</p>
              <ul className="grid gap-0.5 text-xs text-[var(--muted)]">
                {role === "owner" ? <li>Everything (all permissions)</li> : permissionsForRole(role).map((p) => <li key={p}><code>{p}</code></li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
