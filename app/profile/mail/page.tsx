import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";

type User = { id: string; email?: string };
type MailMessage = {
  id: string;
  category: string;
  subject: string;
  status: string;
  provider: string;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
};
type Preferences = {
  email_account: boolean;
  email_security: boolean;
  email_friend_requests: boolean;
  email_challenges: boolean;
  email_achievements: boolean;
  email_product_updates: boolean;
  email_marketing: boolean;
  push_enabled: boolean;
};

export default async function CubeLabsMailPage() {
  const token = getAccessToken();
  if (!token) redirect("/auth");

  let user: User;
  try {
    user = await supabaseRequest<User>("/auth/v1/user", {}, token);
  } catch {
    redirect("/auth/email?error=Your%20session%20expired.%20Please%20log%20in%20again.");
  }

  const [messages, preferences] = await Promise.all([
    supabaseRequest<MailMessage[]>(`/rest/v1/mail_messages?user_id=eq.${user.id}&select=id,category,subject,status,provider,queued_at,sent_at,delivered_at,error_message&order=queued_at.desc&limit=30`, {}, token).catch(() => []),
    supabaseRequest<Preferences[]>(`/rest/v1/notification_preferences?user_id=eq.${user.id}&select=email_account,email_security,email_friend_requests,email_challenges,email_achievements,email_product_updates,email_marketing,push_enabled`, {}, token).catch(() => []),
  ]);

  const prefs = preferences[0];

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[var(--bg)] px-4 py-6 sm:px-8 sm:py-10">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1] mx-auto w-full max-w-[980px]">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[0.22em] text-[var(--blue)]">CUBE LABS CORE</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-6xl">Cube Labs Mail</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Your branded account, security, social, challenge, and achievement notifications in one place.</p>
          </div>
          <Link href="/profile" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-extrabold">Profile</Link>
        </header>

        <section className="glass rounded-[24px] p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div><h2 className="text-2xl font-black">Notification preferences</h2><p className="mt-1 text-sm text-[var(--muted)]">Security and account messages remain enabled to protect your Cube ID.</p></div>
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-extrabold text-green-200">Software active</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Preference label="Account emails" enabled={prefs?.email_account ?? true} locked />
            <Preference label="Security emails" enabled={prefs?.email_security ?? true} locked />
            <Preference label="Friend requests" enabled={prefs?.email_friend_requests ?? true} />
            <Preference label="Challenges" enabled={prefs?.email_challenges ?? true} />
            <Preference label="Achievements" enabled={prefs?.email_achievements ?? true} />
            <Preference label="Product updates" enabled={prefs?.email_product_updates ?? false} />
            <Preference label="Marketing" enabled={prefs?.email_marketing ?? false} />
            <Preference label="Push notifications" enabled={prefs?.push_enabled ?? false} />
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--faint)]">Editable controls are the next connection step. The database and privacy model are live now.</p>
        </section>

        <section className="glass mt-5 rounded-[24px] p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-2xl font-black">Mail activity</h2><span className="text-sm font-bold text-[var(--muted)]">{messages.length} recent</span></div>
          <div className="grid gap-3">
            {messages.length ? messages.map((message) => (
              <article key={message.id} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--blue)]">{message.category}</p><h3 className="mt-1 font-black">{message.subject}</h3><p className="mt-2 text-xs text-[var(--muted)]">Queued {new Date(message.queued_at).toLocaleString()} · {message.provider}</p>{message.error_message ? <p className="mt-2 text-xs text-red-300">{message.error_message}</p> : null}</div>
                <Status value={message.status} />
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-2)] p-6 text-sm leading-6 text-[var(--muted)]">No Cube Labs Mail records yet. Verification, password reset, friend, challenge, and achievement messages will appear here after the delivery adapter is connected.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Preference({ label, enabled, locked = false }: { label: string; enabled: boolean; locked?: boolean }) {
  return <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div><strong>{label}</strong>{locked ? <p className="mt-1 text-xs text-[var(--muted)]">Required for account safety</p> : null}</div><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${enabled ? "bg-green-500/15 text-green-200" : "bg-white/5 text-[var(--faint)]"}`}>{enabled ? "On" : "Off"}</span></div>;
}

function Status({ value }: { value: string }) {
  const success = value === "sent" || value === "delivered";
  const failed = value === "failed" || value === "bounced" || value === "complained";
  return <span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold capitalize ${success ? "bg-green-500/15 text-green-200" : failed ? "bg-red-500/15 text-red-200" : "bg-blue-500/15 text-blue-200"}`}>{value}</span>;
}
