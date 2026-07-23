import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { getProfileSettingsPageData } from "@/app/lib/profile-service";
import { requestAccountClosure, requestDataExport, updateProfileSettings } from "@/app/profile/settings/actions";
import { ChevronRightIcon, LockIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Profile Settings | Cube Lab 3D",
  description: "Edit Cube Labs profile identity, visibility, and account settings.",
};

export default async function ProfileSettingsPage({ searchParams }: { searchParams?: { saved?: string; privacy?: string } }) {
  let data;
  try {
    data = await getProfileSettingsPageData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Sign in required.") redirect("/auth");
    redirect("/auth/email?error=Your%20session%20expired.%20Please%20log%20in%20again.");
  }

  const profile = data.profile;
  const prefs = data.preferences;
  const privacyRequests = data.privacyRequests;

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
          Back to profile
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.45)]">
          <div className="absolute right-[-18px] top-[-18px] h-32 w-32 rotate-45 rounded-[8px] border border-[rgba(139,92,246,.28)] bg-[rgba(139,92,246,.12)]" />
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--purple)]">Cube ID</p>
            <h1 className="mt-2 text-[38px] font-black leading-none text-white">Profile Settings</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Update the account fields that power the approved dashboard, friend lookup, and public profile hooks.
            </p>
            {searchParams?.saved ? (
              <p className="mt-4 rounded-[8px] border border-green-400/25 bg-green-500/10 px-3 py-2 text-sm font-black text-[var(--green)]">
                Profile saved.
              </p>
            ) : null}
            <PrivacyStatus value={searchParams?.privacy} />
          </div>
        </section>

        <form action={updateProfileSettings} className="mt-4 grid gap-3 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
          <Field label="Display name" name="display_name" defaultValue={profile?.display_name ?? ""} placeholder="Cube Solver" />
          <Field label="Username" name="username" defaultValue={profile?.username ?? ""} placeholder="cube_master_3d" />
          <Field label="Title" name="title" defaultValue={profile?.title ?? "Cube Explorer"} placeholder="Cube Explorer" />

          <label className="grid gap-2">
            <span className="text-[12px] font-black uppercase tracking-[.12em] text-[var(--muted)]">Bio</span>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              placeholder="Speed solver. Puzzle lover. Always improving."
              rows={4}
              className="min-h-[104px] resize-none rounded-[8px] border border-[var(--border)] bg-black/25 px-3 py-3 text-sm font-semibold text-white outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className="text-[12px] font-black uppercase tracking-[.12em] text-[var(--muted)]">Main puzzle</span>
              <select
                name="favorite_puzzle"
                defaultValue={profile?.favorite_puzzle ?? "3x3"}
                className="min-h-11 rounded-[8px] border border-[var(--border)] bg-[#080c15] px-3 text-sm font-black text-white outline-none"
              >
                {["2x2", "3x3", "4x4", "5x5", "Pyraminx"].map((puzzle) => (
                  <option key={puzzle} value={puzzle}>{puzzle}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-[12px] font-black uppercase tracking-[.12em] text-[var(--muted)]">Visibility</span>
              <select
                name="profile_visibility"
                defaultValue={profile?.profile_visibility ?? "public"}
                className="min-h-11 rounded-[8px] border border-[var(--border)] bg-[#080c15] px-3 text-sm font-black text-white outline-none"
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Region" name="region" defaultValue={profile?.region ?? ""} placeholder="Georgia" />
            <Field label="Country" name="country_code" defaultValue={profile?.country_code ?? ""} placeholder="US" />
          </div>

          <section className="grid gap-2 rounded-[8px] border border-[var(--border)] bg-black/20 p-3">
            <Toggle name="show_location" label="Show location" defaultChecked={profile?.show_location ?? false} />
            <Toggle name="show_collection" label="Show cube collection" defaultChecked={profile?.show_collection ?? true} />
            <Toggle name="show_activity" label="Show solve activity" defaultChecked={profile?.show_activity ?? true} />
          </section>

          <button className="cta-purple min-h-12 rounded-[8px] text-sm font-black text-white">
            Save Profile
          </button>
        </form>

        <section className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Mail preferences</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Challenge emails are {prefs?.email_challenges ?? true ? "on" : "off"} and achievement emails are {prefs?.email_achievements ?? true ? "on" : "off"}.
              </p>
            </div>
            <Link href="/profile/mail" className="shrink-0 rounded-[8px] border border-[var(--border-2)] bg-black/20 px-3 py-2 text-xs font-black text-white">
              Mail
            </Link>
          </div>
        </section>

        <section className="mt-4 rounded-[8px] border border-yellow-400/25 bg-yellow-500/[.06] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-yellow-500/10 text-[var(--gold)]">
              <LockIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white">Data export and close account</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Export is queued for email first. Closing your account hides public profile data now, then the backend privacy worker can email the export and delete/de-identify the remaining records.
              </p>
            </div>
          </div>

          <form action={requestDataExport} className="mt-4">
            <button className="min-h-11 w-full rounded-[8px] border border-[var(--border-2)] bg-black/20 text-sm font-black text-white">
              Email My Data Export
            </button>
          </form>

          <form action={requestAccountClosure} className="mt-3 grid gap-3 rounded-[8px] border border-red-400/25 bg-red-500/[.06] p-3">
            <p className="text-sm font-bold leading-6 text-red-100">
              To close the account, type DELETE MY CUBE ID. This queues export-before-delete and makes the profile private immediately.
            </p>
            <input
              name="close_confirmation"
              placeholder="DELETE MY CUBE ID"
              className="min-h-11 rounded-[8px] border border-red-400/25 bg-black/30 px-3 text-sm font-semibold text-white outline-none"
            />
            <button className="min-h-11 rounded-[8px] border border-red-400/30 bg-red-500/10 text-sm font-black text-red-100">
              Close Account
            </button>
          </form>

          {privacyRequests.length ? (
            <div className="mt-4 grid gap-2">
              <h3 className="text-sm font-black uppercase tracking-[.12em] text-[var(--muted)]">Recent requests</h3>
              {privacyRequests.map((request) => (
                <article key={request.id} className="rounded-[8px] border border-[var(--border)] bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black capitalize text-white">{request.request_type.replaceAll("_", " ")}</p>
                    <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-black capitalize text-[var(--blue)]">{request.status}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                    {request.requested_email ? `Email target: ${request.requested_email}` : "No email on this account"} - {new Date(request.created_at).toLocaleString()}
                  </p>
                  {request.error_message ? <p className="mt-2 text-xs font-bold text-red-200">{request.error_message}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <form action={signOut} className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-red-500/10 text-red-300">
              <LockIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-black text-white">Account session</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Sign out of this browser session.</p>
            </div>
          </div>
          <button className="mt-4 min-h-11 w-full rounded-[8px] border border-red-400/30 bg-red-500/10 text-sm font-black text-red-100">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue: string; placeholder: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-[12px] font-black uppercase tracking-[.12em] text-[var(--muted)]">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-h-11 rounded-[8px] border border-[var(--border)] bg-black/25 px-3 text-sm font-semibold text-white outline-none"
      />
    </label>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-[8px] px-1">
      <span className="text-sm font-bold text-white">{label}</span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 accent-[var(--purple)]" />
    </label>
  );
}

function PrivacyStatus({ value }: { value?: string }) {
  if (!value) return null;

  const messages: Record<string, { tone: string; text: string }> = {
    "export-queued": {
      tone: "border-green-400/25 bg-green-500/10 text-[var(--green)]",
      text: "Data export request queued. The email worker can pick this up and send the export package.",
    },
    "closure-queued": {
      tone: "border-yellow-400/25 bg-yellow-500/10 text-[var(--gold)]",
      text: "Account closure queued. Your public profile was switched private while export-before-delete is pending.",
    },
    "confirm-close": {
      tone: "border-red-400/25 bg-red-500/10 text-red-100",
      text: "Type DELETE MY CUBE ID exactly before closing the account.",
    },
  };
  const message = messages[value];
  if (!message) return null;

  return (
    <p className={`mt-4 rounded-[8px] border px-3 py-2 text-sm font-black ${message.tone}`}>
      {message.text}
    </p>
  );
}
