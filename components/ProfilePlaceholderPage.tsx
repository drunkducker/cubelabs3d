import type { ReactNode } from "react";
import Link from "next/link";
import { CubeIcon } from "@/components/icons";

type ProfilePlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  children?: ReactNode;
};

export default function ProfilePlaceholderPage({
  eyebrow,
  title,
  description,
  primaryHref = "/profile",
  primaryLabel = "Back to profile",
  children,
}: ProfilePlaceholderPageProps) {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1]">
        <Link href="/profile" className="mb-5 inline-flex text-sm font-bold text-[var(--muted)]">
          Back to profile
        </Link>

        <section className="relative overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.45)]">
          <div className="absolute right-[-20px] top-[-20px] h-32 w-32 rotate-45 rounded-[8px] border border-[rgba(139,92,246,.28)] bg-[rgba(139,92,246,.12)]" />
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--purple)]">{eyebrow}</p>
            <h1 className="mt-2 text-[38px] font-black leading-none text-white">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
            <Link href={primaryHref} className="cta-purple mt-5 grid min-h-12 place-items-center rounded-[8px] text-center font-black text-white">
              {primaryLabel}
            </Link>
          </div>
        </section>

        {children ? <section className="mt-4 grid gap-3">{children}</section> : null}

        <section className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-blue-500/15 text-[var(--blue)]">
              <CubeIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-black text-white">Connection point</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                This route is ready for the approved profile layout pass. Final data actions should use the app service layer, not direct UI-side provider logic.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
