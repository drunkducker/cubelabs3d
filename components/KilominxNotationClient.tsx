"use client";

import dynamic from "next/dynamic";

const KilominxNotationNet = dynamic(() => import("@/components/KilominxNotationNet"), {
  ssr: false,
  loading: () => (
    <section className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,.045)] p-6 text-sm text-[var(--muted)]">
      Loading the engine-derived Kilominx notation map…
    </section>
  ),
});

export default function KilominxNotationClient() {
  return <KilominxNotationNet />;
}
