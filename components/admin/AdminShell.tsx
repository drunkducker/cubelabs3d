"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_NAV } from "./nav";
import { hasPermission, type AdminRole } from "@/lib/admin/permissions";

/*
 * Mobile-first admin shell. Phones get a compact protected header + a
 * collapsible navigation drawer; desktop gets a persistent sidebar. Navigation
 * is filtered by the acting role, but each page independently re-checks
 * permission on the server.
 */
export function AdminShell({
  role,
  email,
  children,
}: {
  role: AdminRole;
  email: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const items = ADMIN_NAV.filter((item) => hasPermission(role, item.permission));

  return (
    <div className="min-h-dvh w-full bg-[var(--bg)] text-[var(--text,#f5f7fb)]">
      {/* Protected header */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/70 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Toggle admin navigation"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] text-lg lg:hidden"
          >
            ☰
          </button>
          <Link href="/admin" className="flex items-center gap-2 font-black tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--blue)] text-sm text-white">CL</span>
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 text-right">
          <div className="hidden text-xs leading-tight sm:block">
            <p className="font-bold">{email ?? "Administrator"}</p>
            <p className="text-[var(--muted)]">Signed in</p>
          </div>
          <span className="rounded-full border border-[var(--border-2)] bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--blue)]">
            {role}
          </span>
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] text-sm" aria-label="Exit admin">
            ⤶
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] gap-0 lg:gap-6 lg:px-6">
        {/* Desktop sidebar */}
        <nav aria-label="Admin" className="sticky top-[61px] hidden h-[calc(100dvh-61px)] w-60 shrink-0 overflow-y-auto py-6 lg:block">
          <ul className="grid gap-1">
            {items.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(pathname, item.href)} />
            ))}
          </ul>
        </nav>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <nav className="absolute left-0 top-0 h-full w-[82%] max-w-xs overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-black">Admin menu</span>
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)]">✕</button>
              </div>
              <ul className="grid gap-1">
                {items.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(pathname, item.href)} />
                ))}
              </ul>
            </nav>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 lg:px-0 lg:pb-16">{children}</main>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${
          active ? "bg-[var(--blue)]/15 text-[var(--blue)]" : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text,#f5f7fb)]"
        }`}
      >
        <span aria-hidden="true" className="w-5 text-center text-base">{icon}</span>
        {label}
      </Link>
    </li>
  );
}
