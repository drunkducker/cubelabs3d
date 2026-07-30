import type { Metadata } from "next";
import Link from "next/link";
import { submitPublicPrivacyRequest } from "./actions";

export const metadata: Metadata = {
  title: "Privacy Requests | Cube Lab 3D",
  description: "Submit a verified access, deletion, correction, appeal, parent, or authorized-agent request.",
};

type SearchParams = {
  type?: string;
  subject_email?: string;
  message?: string;
  submitted?: string;
  case?: string;
  email_sent?: string;
  verified?: string;
  error?: string;
};

export default function PrivacyRequestsPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const initialType = allowedType(searchParams.type);
  const parentPath = initialType === "parent_request";

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[var(--bg)] px-4 py-8 sm:px-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1] mx-auto w-full max-w-[760px]">
        <Link href="/privacy" className="inline-flex min-h-11 items-center text-sm font-black text-[var(--muted)]">← Privacy policy</Link>

        <header className="mt-4 rounded-[20px] border border-[var(--border)] bg-[#050813] p-6 shadow-[0_18px_46px_rgba(0,0,0,.45)]">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--purple)]">Data rights</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Privacy request portal</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Submit access, deletion, correction, appeal, parent or guardian, and authorized-agent requests. We verify the requester before review and track the legal response deadline on the case.
          </p>
        </header>

        {searchParams.message ? <Notice tone="info">{searchParams.message}</Notice> : null}
        {searchParams.error ? <Notice tone="error">{searchParams.error}</Notice> : null}
        {searchParams.verified ? <Notice tone={searchParams.verified === "1" ? "success" : "error"}>{searchParams.message || (searchParams.verified === "1" ? "Request verified." : "Verification failed.")}</Notice> : null}
        {searchParams.submitted ? (
          <Notice tone={searchParams.email_sent === "1" ? "success" : "warning"}>
            Request created. Case reference: <strong>{searchParams.case}</strong>. {searchParams.email_sent === "1" ? "Check your email for the one-time verification link." : "Email delivery is queued; support can retry it from the case record."}
          </Notice>
        ) : null}

        <form action={submitPublicPrivacyRequest} encType="multipart/form-data" className="mt-5 grid gap-4 rounded-[20px] border border-[var(--border)] bg-white/[.035] p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" name="requester_name" required />
            <Field label="Your email" name="requester_email" type="email" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Request type" name="request_type" defaultValue={initialType} options={[
              ["export", "Access / data export"],
              ["delete_data", "Delete account data"],
              ["correction", "Correct inaccurate data"],
              ["appeal", "Appeal a privacy decision"],
              ["authorized_agent", "Authorized-agent request"],
              ["parent_request", "Parent or guardian request"],
            ]} />
            <Select label="You are acting as" name="requester_type" defaultValue={parentPath ? "parent" : initialType === "authorized_agent" ? "authorized_agent" : "self"} options={[
              ["self", "Account holder"],
              ["parent", "Parent"],
              ["guardian", "Legal guardian"],
              ["authorized_agent", "Authorized agent"],
            ]} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account holder email" name="subject_email" type="email" defaultValue={searchParams.subject_email || ""} />
            <Field label="State, country, or region" name="jurisdiction" placeholder="Georgia, California, EU, UK..." />
          </div>

          <Field label="Relationship or authority" name="relationship_to_subject" placeholder="Parent, legal guardian, written authorization, power of attorney..." />
          <Field label="Prior case ID for an appeal" name="appeal_of_request_id" placeholder="UUID from the prior decision" />

          <section className="grid gap-3 rounded-[12px] border border-[var(--border)] bg-black/20 p-4">
            <div>
              <h2 className="font-black text-white">Correction details</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">For correction requests, enter only the replacement values that should change.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Correct display name" name="correct_display_name" />
              <Field label="Correct username" name="correct_username" />
              <Field label="Correct title" name="correct_title" />
              <Field label="Correct main puzzle" name="correct_favorite_puzzle" />
              <Field label="Correct region" name="correct_region" />
              <Field label="Correct country code" name="correct_country_code" />
            </div>
            <label className="grid gap-2 text-sm font-black text-white">
              Correct bio
              <textarea name="correct_bio" rows={3} maxLength={220} className="rounded-[10px] border border-[var(--border-2)] bg-black/25 px-3 py-3 text-sm font-semibold text-white outline-none" />
            </label>
          </section>

          <label className="grid gap-2 text-sm font-black text-white">
            Request details
            <textarea name="details" rows={5} maxLength={4000} required className="rounded-[10px] border border-[var(--border-2)] bg-black/25 px-3 py-3 text-sm font-semibold text-white outline-none" placeholder="Describe what you are requesting and any information that will help us locate the account or review the case." />
          </label>

          <label className="grid gap-2 text-sm font-black text-white">
            Supporting authority or identity document (optional)
            <input type="file" name="evidence" accept="application/pdf,image/jpeg,image/png" className="block w-full rounded-[10px] border border-[var(--border-2)] bg-black/25 p-3 text-sm text-[var(--muted)] file:mr-3 file:rounded-[8px] file:border-0 file:bg-white/10 file:px-3 file:py-2 file:font-black file:text-white" />
            <span className="text-xs font-semibold leading-5 text-[var(--muted)]">PDF, JPEG, or PNG, up to 8 MB. Evidence is stored in a private bucket and is not placed in the public profile or export.</span>
          </label>

          <section className="rounded-[12px] border border-yellow-400/25 bg-yellow-500/[.06] p-4 text-sm leading-6 text-[var(--muted)]">
            <strong className="text-white">Verification and deadlines:</strong> we send a one-time verification link to the requester email. Parent, guardian, and authorized-agent authority also receives manual review. Most cases receive a 45-day deadline; EU, EEA, and UK cases receive a 30-day default deadline. A deadline may be extended only with a recorded reason and notice.
          </section>

          <button type="submit" className="cta-purple min-h-12 rounded-[10px] px-5 text-sm font-black text-white">Submit privacy request</button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, name, type = "text", required = false, placeholder, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <label className="grid gap-2 text-sm font-black text-white">
      {label}
      <input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} className="min-h-12 rounded-[10px] border border-[var(--border-2)] bg-black/25 px-3 text-sm font-semibold text-white outline-none" />
    </label>
  );
}

function Select({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: Array<[string, string]> }) {
  return (
    <label className="grid gap-2 text-sm font-black text-white">
      {label}
      <select name={name} defaultValue={defaultValue} className="min-h-12 rounded-[10px] border border-[var(--border-2)] bg-[#080c15] px-3 text-sm font-black text-white outline-none">
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function Notice({ tone, children }: { tone: "info" | "success" | "warning" | "error"; children: React.ReactNode }) {
  const classes = {
    info: "border-blue-400/25 bg-blue-500/10 text-blue-100",
    success: "border-green-400/25 bg-green-500/10 text-green-100",
    warning: "border-yellow-400/25 bg-yellow-500/10 text-yellow-100",
    error: "border-red-400/25 bg-red-500/10 text-red-100",
  }[tone];
  return <div className={`mt-4 rounded-[12px] border p-4 text-sm font-bold leading-6 ${classes}`}>{children}</div>;
}

function allowedType(value?: string): string {
  return ["export","delete_data","correction","appeal","authorized_agent","parent_request"].includes(value || "") ? String(value) : "export";
}
