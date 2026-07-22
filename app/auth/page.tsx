import Link from "next/link";
import AccountHeader from "@/components/AccountHeader";
import { signIn, signUp } from "./actions";

type AuthPageProps = {
  searchParams?: { error?: string; message?: string };
};

/**
 * Cube Labs account gateway.
 *
 * Both sign-in and account creation stay on one mobile-first page so the user
 * can enter from the homepage and immediately choose the correct path. Server
 * actions handle Supabase authentication and redirect successful users to the
 * profile page.
 */
export default function AuthPage({ searchParams = {} }: AuthPageProps) {
  const { error, message } = searchParams;

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <AccountHeader />

        <section className="mb-6">
          <div className="mb-2 text-[11px] font-extrabold tracking-[2.3px] text-[var(--blue)]">PLAYER ACCOUNT</div>
          <h1 className="text-[34px] font-black leading-[1.04] tracking-[-1.2px]">
            Keep every solve.
            <span className="accent-text block">Pick up anywhere.</span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Save times, track your progress, challenge friends, and sync Cube Lab 3D across your devices.
          </p>
        </section>

        {(error || message) && (
          <div
            role="status"
            className={`mb-5 rounded-2xl border p-4 text-sm font-semibold ${
              error
                ? "border-red-400/30 bg-red-500/10 text-red-200"
                : "border-green-400/30 bg-green-500/10 text-green-200"
            }`}
          >
            {error ?? message}
          </div>
        )}

        <section className="cube-card rounded-[24px] p-5 shadow-[var(--shadow)]">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgba(46,166,255,0.15)] text-[var(--blue)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div>
              <h2 className="text-xl font-extrabold">Welcome back</h2>
              <p className="text-xs text-[var(--muted)]">Sign in to your Cube Labs profile.</p>
            </div>
          </div>

          <form action={signIn} className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold">
              Email
              <input className={inputClass} name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Password
              <input className={inputClass} name="password" type="password" required autoComplete="current-password" placeholder="Your password" />
            </label>
            <button className="cta-blue mt-1 rounded-[13px] px-5 py-[14px] text-base font-extrabold" type="submit">
              Sign In
            </button>
          </form>
        </section>

        <div className="my-5 flex items-center gap-3 text-[11px] font-bold tracking-[1.5px] text-[var(--faint)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          NEW PLAYER
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <section className="glass rounded-[24px] p-5">
          <h2 className="text-xl font-extrabold">Create your profile</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Your display name appears on future challenges and leaderboards.</p>

          <form action={signUp} className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-bold">
              Display name
              <input className={inputClass} name="display_name" maxLength={60} autoComplete="name" placeholder="Cube Solver" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Email
              <input className={inputClass} name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Password
              <input className={inputClass} name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="At least 8 characters" />
            </label>
            <button className="cta-green mt-1 rounded-[13px] px-5 py-[14px] text-base font-extrabold" type="submit">
              Create Free Account
            </button>
          </form>
        </section>

        <div className="mt-6 text-center text-xs leading-5 text-[var(--muted)]">
          Not ready for an account?{" "}
          <Link href="/" className="font-bold text-[var(--blue)]">Continue solving as a guest.</Link>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-[13px] border border-[var(--border-2)] bg-black/20 px-4 py-[13px] text-base text-[var(--text)] placeholder:text-[var(--faint)] transition focus:border-[var(--blue)] focus:outline-none";
