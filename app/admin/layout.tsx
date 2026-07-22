import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { requireAdmin, hasAnyRole } from "@/app/lib/admin";
import { ADMIN_NAV } from "./adminNav";

/*
 * Protected admin shell. requireAdmin() runs on the server on every request to
 * every /admin route, so an unauthenticated or non-admin visitor is redirected
 * before any admin markup is produced. This layout is the single entry gate for
 * the whole portal.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role } = await requireAdmin();

  return (
    <div className="relative min-h-dvh w-full bg-[var(--bg)] text-[var(--text)]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1] mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-5 md:flex-row md:gap-6 md:py-8">
        <aside className="md:w-[236px] md:flex-none">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/" className="text-lg font-black tracking-[-0.02em]">
              CUBE LAB <span className="text-[var(--blue)]">3D</span>
            </Link>
            <span className="rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Admin
            </span>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
            {ADMIN_NAV.filter((item) => !item.roles || hasAnyRole(role, item.roles)).map((item) => (
              item.ready ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-none items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-bold text-[var(--text)] transition hover:border-[var(--border-2)] hover:bg-[var(--surface)] md:flex-1"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.href}
                  title="Planned"
                  className="flex flex-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[var(--faint)] md:flex-1"
                >
                  {item.label}
                  <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Soon
                  </span>
                </span>
              )
            ))}
          </nav>

          <div className="mt-4 rounded-xl border border-[var(--border-2)] bg-[var(--surface)] p-3">
            <div className="truncate text-sm font-extrabold">{user.email ?? "Signed in"}</div>
            <div className="mt-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--blue)]">{role}</div>
            <form action={signOut} className="mt-3">
              <button type="submit" className="w-full rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] px-3 py-2 text-xs font-black text-[var(--muted)] transition hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
