"use client";

import Link from "next/link";
import { openCookieSettings, useConsent } from "@/components/CookieConsent";
import { CATEGORY_META, COOKIE_INVENTORY, type ConsentCategory } from "@/lib/consent";

/*
 * Standing Cookie Settings page (MP-006). Reachable directly, from the footer,
 * and from the Cookie Policy. Shows the current decision, reopens the settings
 * modal, and publishes the first-party cookie inventory (P-006).
 */

const CATEGORY_LABEL: Record<ConsentCategory, string> = Object.fromEntries(
  CATEGORY_META.map((m) => [m.id, m.title]),
) as Record<ConsentCategory, string>;

function statusFor(allowed: boolean, required: boolean) {
  if (required) return { text: "Always on", cls: "bg-emerald-500/15 text-emerald-300" };
  return allowed
    ? { text: "Allowed", cls: "bg-emerald-500/15 text-emerald-300" }
    : { text: "Off", cls: "bg-slate-500/15 text-slate-300" };
}

export default function CookieSettingsPage() {
  const { record, ready, allows } = useConsent();

  return (
    <main className="min-h-dvh bg-[#05070d] px-5 py-8 text-[#eaf0f8]">
      <article className="mx-auto max-w-3xl rounded-[24px] border border-white/10 bg-[#0a0e17] p-5 shadow-2xl sm:p-8">
        <Link href="/" className="text-sm font-bold text-sky-400">← Back to Cube Lab 3D</Link>
        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Cookie Settings</h1>
        <p className="mt-2 text-sm text-white/55">
          Manage which cookies Cube Lab 3D may use. Strictly necessary cookies are always on; everything
          else is off until you allow it.
        </p>

        <button
          type="button"
          onClick={openCookieSettings}
          className="mt-6 rounded-xl bg-sky-500 px-5 py-3 text-sm font-extrabold text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          Manage cookie preferences
        </button>

        <section className="mt-8">
          <h2 className="text-lg font-black">Your current choices</h2>
          <p className="mt-1 text-xs text-white/50">
            {ready && record
              ? `Last updated ${new Date(record.ts).toLocaleString()}${record.gpc ? " · Global Privacy Control was active" : ""}.`
              : "No choice recorded yet — nonessential cookies are off."}
          </p>
          <ul className="mt-3 grid gap-2">
            {CATEGORY_META.map((meta) => {
              const allowed = meta.required || (ready && allows(meta.id));
              const status = statusFor(allowed, meta.required);
              return (
                <li
                  key={meta.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{meta.title}</span>
                    <span className="mt-0.5 block text-xs text-white/60">{meta.summary}</span>
                  </span>
                  <span className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${status.cls}`}>
                    {status.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-black">Cookie inventory</h2>
          <p className="mt-1 text-sm text-white/60">
            The first-party cookies and storage keys Cube Lab 3D may set. Third-party providers place
            cookies only in the categories you allow, subject to their own policies.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="px-3 py-2 font-bold">Name</th>
                  <th className="px-3 py-2 font-bold">Provider</th>
                  <th className="px-3 py-2 font-bold">Purpose</th>
                  <th className="px-3 py-2 font-bold">Category</th>
                  <th className="px-3 py-2 font-bold">Storage</th>
                  <th className="px-3 py-2 font-bold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_INVENTORY.map((entry) => (
                  <tr key={entry.name} className="border-t border-white/10 align-top">
                    <td className="px-3 py-2 font-mono text-[11px] text-white/90">{entry.name}</td>
                    <td className="px-3 py-2 text-white/70">{entry.provider}</td>
                    <td className="px-3 py-2 text-white/70">{entry.purpose}</td>
                    <td className="px-3 py-2 text-white/70">{CATEGORY_LABEL[entry.category]}</td>
                    <td className="px-3 py-2 text-white/70">{entry.storage}</td>
                    <td className="px-3 py-2 text-white/70">{entry.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-sm text-white/60">
          For the full policy, see the{" "}
          <Link href="/cookies" className="text-sky-400 hover:underline">Cookie Policy</Link>. To exercise
          data rights, visit{" "}
          <Link href="/data-rights" className="text-sky-400 hover:underline">Data Rights</Link>.
        </p>
      </article>
    </main>
  );
}
