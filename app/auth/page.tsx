import Link from "next/link";

const providers = [
  { label: "Continue with Google", icon: "G", href: "/auth/provider/google" },
  { label: "Continue with GitHub", icon: "◆", href: "/auth/provider/github" },
  { label: "Continue with Apple", icon: "●", href: "/auth/provider/apple" },
];

export default function AccountOptionsPage() {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[var(--bg)] px-5 py-8 sm:px-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1] mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[620px] flex-col justify-center">
        <Link href="/" className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-white">
          <span aria-hidden="true">←</span> Back to Cube Lab 3D
        </Link>

        <section className="glass rounded-[28px] p-6 shadow-[var(--shadow)] sm:p-10">
          <div className="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-2xl border border-[var(--border-2)] bg-[var(--surface-2)] shadow-[var(--glow-blue)]">
            <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
              <polygon points="24,3 43,13 24,23 5,13" fill="#f4f6f8" />
              <polygon points="5,13 24,23 24,45 5,35" fill="#1667e0" />
              <polygon points="24,23 43,13 43,35 24,45" fill="#e6352b" />
              <polygon points="24,3 33,8 14,18 5,13" fill="#ffd21f" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-xs font-extrabold tracking-[0.24em] text-[var(--blue)]">YOUR CUBE ID</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">Join Cube Lab 3D</h1>
            <p className="mx-auto mt-3 max-w-[430px] text-sm leading-6 text-[var(--muted)] sm:text-base">
              Save solves, customize your identity, challenge friends, collect cubes, and build your player history.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {providers.map((provider) => (
              <Link
                key={provider.label}
                href={provider.href}
                className="grid min-h-14 grid-cols-[34px_1fr_34px] items-center rounded-xl border border-[var(--border-2)] bg-[var(--surface)] px-4 text-center text-[15px] font-extrabold transition hover:border-[rgba(46,166,255,.55)] hover:bg-[var(--surface-2)]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white font-black text-black">{provider.icon}</span>
                <span>{provider.label}</span>
                <span aria-hidden="true" className="text-[var(--faint)]">›</span>
              </Link>
            ))}

            <div className="my-2 flex items-center gap-3 text-xs font-bold text-[var(--faint)]">
              <span className="h-px flex-1 bg-[var(--border)]" /> OR <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <Link href="/auth/email" className="cta-blue flex min-h-14 items-center justify-center rounded-xl px-5 text-[15px] font-black">
              Continue with Email
            </Link>
          </div>

          <p className="mt-7 text-center text-sm text-[var(--muted)]">
            Already have a Cube ID? <Link href="/auth/email?mode=login" className="font-extrabold text-[var(--blue)]">Log in</Link>
          </p>
        </section>

        <p className="mx-auto mt-6 max-w-[520px] text-center text-xs leading-5 text-[var(--faint)]">
          By continuing, you agree to the <Link href="/terms" className="underline">Terms</Link> and acknowledge the <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
