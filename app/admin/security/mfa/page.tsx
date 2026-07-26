import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listFactors, currentAal, MFA_REQUIRED } from "@/lib/admin/mfa";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import { MfaSetup } from "@/components/admin/MfaSetup";

export const dynamic = "force-dynamic";

/*
 * MFA enrollment / step-up. Uses requireAdmin (NOT requirePermission) so it is
 * reachable at aal1 even when ADMIN_REQUIRE_MFA forces aal2 elsewhere — that is
 * what lets an admin actually complete enrollment.
 */
export default async function MfaPage({ searchParams }: { searchParams: { reason?: string } }) {
  await requireAdmin();
  const factors = await listFactors();
  const verified = factors.some((f) => f.status === "verified");
  const aal = currentAal();
  const needsStepUp = MFA_REQUIRED && aal !== "aal2";

  return (
    <div>
      <PageHeader
        title="Two-factor authentication"
        subtitle="Protect your administrator account with a TOTP authenticator app."
        action={<Link href="/admin/security" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-extrabold">← Security</Link>}
      />

      {searchParams.reason === "required" && (
        <div className="mb-4"><Notice tone="warning">Two-factor is required for admin access. {verified ? "Sign out and sign back in to complete an MFA challenge (aal2)." : "Enrol an authenticator below, then sign out and back in."}</Notice></div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-black">Authenticator app</h2>
          <MfaSetup enrolled={verified} />
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-black">Status</h2>
          <ul className="grid gap-2 text-sm">
            <li className="flex justify-between rounded-xl border border-[var(--border)] px-3 py-2">
              <span className="font-bold">Enforcement</span>
              <span className={MFA_REQUIRED ? "text-emerald-400" : "text-[var(--muted)]"}>{MFA_REQUIRED ? "Required for admins" : "Optional (ADMIN_REQUIRE_MFA off)"}</span>
            </li>
            <li className="flex justify-between rounded-xl border border-[var(--border)] px-3 py-2">
              <span className="font-bold">Enrolled factor</span>
              <span className={verified ? "text-emerald-400" : "text-amber-400"}>{verified ? "Verified" : factors.length ? "Unverified" : "None"}</span>
            </li>
            <li className="flex justify-between rounded-xl border border-[var(--border)] px-3 py-2">
              <span className="font-bold">Session assurance</span>
              <span className={aal === "aal2" ? "text-emerald-400" : "text-amber-400"}>{aal ?? "unknown"}</span>
            </li>
          </ul>
          {needsStepUp && verified && <p className="mt-3 text-xs text-[var(--muted)]">Your session is aal1. Sign out and sign in again; Supabase will prompt for your code and issue an aal2 session.</p>}
        </Card>
      </div>
    </div>
  );
}
