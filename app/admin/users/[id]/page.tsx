import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { getUserAdminDetails } from "@/lib/admin/users";
import { Card, Notice, PageHeader, StatusPill } from "@/components/admin/ui";
import { setUserSuspension, grantPremium, sendPasswordReset, addUserNote, deleteUserPermanently } from "@/app/admin/actions/users";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { message?: string; error?: string };
}) {
  const ctx = await requirePermission("users.read");
  const details = await getUserAdminDetails(params.id);
  const canSuspend = hasPermission(ctx.role, "users.suspend");
  const canPremium = hasPermission(ctx.role, "users.premium.manage");
  const canDelete = hasPermission(ctx.role, "users.delete");
  const suspended = Boolean(details.auth?.banned_until && new Date(details.auth.banned_until).getTime() > Date.now());

  return (
    <div>
      <PageHeader
        title={details.profile?.display_name || "User"}
        subtitle={details.profile?.cube_tag || params.id}
        action={<Link href="/admin/users" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-extrabold">← All users</Link>}
      />

      {searchParams.message && <div className="mb-4"><Notice tone="info">{searchParams.message}</Notice></div>}
      {searchParams.error && <div className="mb-4"><Notice tone="danger">{searchParams.error}</Notice></div>}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="grid gap-4">
          <Card>
            <h2 className="mb-3 text-lg font-black">Account</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Email" value={details.auth?.email ?? "—"} />
              <Field label="User ID" value={params.id} mono />
              <Field label="Username" value={details.profile?.username ?? "—"} />
              <Field label="Public slug" value={details.profile?.public_slug ?? "—"} />
              <Field label="Visibility" value={details.profile?.profile_visibility ?? "—"} />
              <Field label="Last sign-in" value={details.auth?.last_sign_in_at ? new Date(details.auth.last_sign_in_at).toLocaleString() : "—"} />
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill status={suspended ? "failed" : "passed"} />
              <span className="text-xs text-[var(--muted)]">{suspended ? "Suspended" : "Active"}</span>
              {details.admin && <span className="rounded-full border border-[var(--border-2)] px-2 py-0.5 text-xs font-black uppercase text-[var(--blue)]">{details.admin.role}</span>}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-black">Activity summary</h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Field label="Total solves" value={String(details.stats?.total_solves ?? "—")} />
              <Field label="Solved" value={String(details.stats?.solved_count ?? "—")} />
              <Field label="Current streak" value={String(details.stats?.current_streak ?? "—")} />
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">Private message contents are never surfaced here. Only status and counts are shown.</p>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-black">Audit history</h2>
            {details.auditTrail.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No recorded administrative actions for this account.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {details.auditTrail.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
                    <span className="font-bold">{a.action}</span>
                    <span className="text-xs text-[var(--muted)]">{a.actor_role} · {new Date(a.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          {canPremium && (
            <Card>
              <h2 className="mb-3 text-lg font-black">Premium</h2>
              <form action={grantPremium} className="grid gap-2">
                <input type="hidden" name="user_id" value={params.id} />
                <input type="hidden" name="grant" value="true" />
                <label className="text-xs font-bold text-[var(--muted)]">Expiration (days, 0 = no expiry)
                  <input name="expires_days" type="number" min={0} defaultValue={0} className="mt-1 min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 text-sm" />
                </label>
                <input name="reason" required placeholder="Reason (required)" className="min-h-[44px] rounded-xl border border-[var(--border)] bg-black/20 px-3 text-sm" />
                <div className="flex gap-2">
                  <button className="min-h-[44px] flex-1 rounded-xl bg-[var(--blue)] px-3 text-sm font-extrabold text-white">Grant premium</button>
                </div>
              </form>
              <form action={grantPremium} className="mt-2">
                <input type="hidden" name="user_id" value={params.id} />
                <input type="hidden" name="grant" value="false" />
                <input type="hidden" name="reason" value="Revoked via admin" />
                <button className="min-h-[44px] w-full rounded-xl border border-[var(--border)] px-3 text-sm font-extrabold text-[var(--muted)]">Revoke premium</button>
              </form>
            </Card>
          )}

          {canSuspend && (
            <Card>
              <h2 className="mb-3 text-lg font-black">Moderation</h2>
              <form action={setUserSuspension} className="grid gap-2">
                <input type="hidden" name="user_id" value={params.id} />
                <input type="hidden" name="suspend" value={suspended ? "false" : "true"} />
                <input name="reason" required placeholder="Reason (required)" className="min-h-[44px] rounded-xl border border-[var(--border)] bg-black/20 px-3 text-sm" />
                <button className={`min-h-[44px] rounded-xl px-3 text-sm font-extrabold ${suspended ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}>
                  {suspended ? "Restore account" : "Suspend account"}
                </button>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="mb-3 text-lg font-black">Support</h2>
            <form action={sendPasswordReset} className="grid gap-2">
              <input type="hidden" name="user_id" value={params.id} />
              <input type="hidden" name="email" value={details.auth?.email ?? ""} />
              <button className="min-h-[44px] rounded-xl border border-[var(--border)] px-3 text-sm font-extrabold">Request password reset</button>
            </form>
            <form action={addUserNote} className="mt-2 grid gap-2">
              <input type="hidden" name="user_id" value={params.id} />
              <textarea name="note" required placeholder="Internal note (stored in audit trail)" className="min-h-[72px] rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm" />
              <button className="min-h-[44px] rounded-xl border border-[var(--border)] px-3 text-sm font-extrabold">Add note</button>
            </form>
          </Card>

          {canDelete && (
            <Card className="border-rose-500/40">
              <h2 className="mb-2 text-lg font-black text-rose-300">Danger zone</h2>
              <p className="mb-3 text-xs leading-5 text-[var(--muted)]">
                Permanent deletion removes the auth account and cascades profile, solves, challenges, and collection data. Export first. This cannot be undone.
              </p>
              <form action={deleteUserPermanently} className="grid gap-2">
                <input type="hidden" name="user_id" value={params.id} />
                <input name="reason" required placeholder="Reason (required)" className="min-h-[44px] rounded-xl border border-rose-500/40 bg-black/20 px-3 text-sm" />
                <input name="confirm_phrase" required placeholder='Type DELETE to confirm' className="min-h-[44px] rounded-xl border border-rose-500/40 bg-black/20 px-3 text-sm" />
                <button className="min-h-[44px] rounded-xl bg-rose-600 px-3 text-sm font-extrabold text-white">Permanently delete</button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-bold text-[var(--muted)]">{label}</dt>
      <dd className={`mt-0.5 break-all ${mono ? "font-mono text-xs" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}
