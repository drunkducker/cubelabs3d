import Link from "next/link";
import { signIn, signUp } from "../actions";

type EmailAuthPageProps = {
  searchParams?: { error?: string; message?: string; mode?: string };
};

export default function EmailAuthPage({ searchParams = {} }: EmailAuthPageProps) {
  const { error, message, mode } = searchParams;
  const startOnLogin = mode === "login";

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[var(--bg)] px-5 py-8 sm:px-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1] mx-auto w-full max-w-[980px]">
        <Link href="/auth" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-white">← Sign-in options</Link>

        <header className="mb-8 text-center">
          <p className="text-xs font-extrabold tracking-[0.24em] text-[var(--blue)]">CUBE LAB 3D</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-5xl">{startOnLogin ? "Welcome back" : "Create your Cube ID"}</h1>
          <p className="mx-auto mt-3 max-w-xl text-[var(--muted)]">Your display name stays clean and personal. A unique Cube ID is kept in the background so friends can always find the right you.</p>
        </header>

        {(error || message) && (
          <div className={`mx-auto mb-6 max-w-2xl rounded-xl border p-4 text-sm font-bold ${error ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-green-500/30 bg-green-500/10 text-green-200"}`}>
            {error ?? message}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <form action={signIn} className="glass grid content-start gap-4 rounded-[24px] p-6 sm:p-8">
            <div>
              <p className="text-xs font-extrabold tracking-[0.2em] text-[var(--blue)]">EXISTING PLAYER</p>
              <h2 className="mt-2 text-2xl font-black">Log in</h2>
            </div>
            <label className="grid gap-2 text-sm font-bold">Email<input className="min-h-12 rounded-xl border border-[var(--border-2)] bg-black/20 px-4 text-base text-white" name="email" type="email" required autoComplete="email" /></label>
            <label className="grid gap-2 text-sm font-bold">Password<input className="min-h-12 rounded-xl border border-[var(--border-2)] bg-black/20 px-4 text-base text-white" name="password" type="password" required autoComplete="current-password" /></label>
            <button className="cta-blue mt-2 min-h-12 rounded-xl px-5 font-black" type="submit">Log in to Cube Labs</button>
            <button type="button" className="text-left text-sm font-bold text-[var(--muted)]">Forgot password? <span className="text-[var(--blue)]">Reset flow coming next</span></button>
          </form>

          <form action={signUp} className="glass grid content-start gap-4 rounded-[24px] p-6 sm:p-8">
            <div>
              <p className="text-xs font-extrabold tracking-[0.2em] text-[var(--green)]">NEW PLAYER</p>
              <h2 className="mt-2 text-2xl font-black">Create account</h2>
            </div>
            <label className="grid gap-2 text-sm font-bold">Display name<input className="min-h-12 rounded-xl border border-[var(--border-2)] bg-black/20 px-4 text-base text-white" name="display_name" maxLength={40} required autoComplete="nickname" placeholder="Ducker" /></label>
            <p className="-mt-2 text-xs leading-5 text-[var(--muted)]">This is what everyone sees. Your private unique tag, such as Ducker#1234, is generated automatically.</p>
            <label className="grid gap-2 text-sm font-bold">Email<input className="min-h-12 rounded-xl border border-[var(--border-2)] bg-black/20 px-4 text-base text-white" name="email" type="email" required autoComplete="email" /></label>
            <label className="grid gap-2 text-sm font-bold">Password<input className="min-h-12 rounded-xl border border-[var(--border-2)] bg-black/20 px-4 text-base text-white" name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
            <button className="cta-green mt-2 min-h-12 rounded-xl px-5 font-black" type="submit">Create my Cube ID</button>
          </form>
        </div>
      </div>
    </main>
  );
}
