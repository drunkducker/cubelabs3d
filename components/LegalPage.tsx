import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared presentation shell for Cube Lab 3D legal and compliance pages.
 *
 * The component intentionally keeps legal content readable on small screens,
 * provides a consistent effective-date notice, and gives visitors a clear path
 * back to the homepage. The page text is a practical launch draft and must be
 * reviewed by qualified counsel before the public domain is connected.
 */
export default function LegalPage({
  title,
  updated = "July 21, 2026",
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-[#05070d] px-5 py-8 text-[#eaf0f8]">
      <article className="mx-auto max-w-3xl rounded-[24px] border border-white/10 bg-[#0a0e17] p-5 shadow-2xl sm:p-8">
        <Link href="/" className="text-sm font-bold text-sky-400">← Back to Cube Lab 3D</Link>
        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-white/55">Effective and last updated: {updated}</p>
        <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
          Launch draft: this document is provided for product planning and should be reviewed by qualified legal counsel before public launch.
        </div>
        <div className="prose prose-invert mt-8 max-w-none prose-headings:mt-8 prose-headings:text-white prose-p:text-white/75 prose-li:text-white/75 prose-a:text-sky-400">
          {children}
        </div>
      </article>
    </main>
  );
}
