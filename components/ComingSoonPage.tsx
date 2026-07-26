import Link from "next/link";

const blocks = [
  ["10%", "18%", "48px", "#356cff"],
  ["33%", "6%", "72px", "#9b4dff"],
  ["61%", "14%", "54px", "#ff3f8e"],
  ["71%", "45%", "78px", "#7b2cff"],
  ["23%", "52%", "62px", "#00cf83"],
  ["48%", "42%", "92px", "#d7dff3"],
] as const;

export default function ComingSoonPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#04040a] px-5 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(116,51,225,.34),transparent_35%),radial-gradient(circle_at_50%_75%,rgba(49,18,105,.38),transparent_45%)]" />

      <section className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col items-center justify-center text-center">
        <div className="relative h-[310px] w-full max-w-[680px]" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rotate-[28deg] rounded-[34px] border border-white/20 bg-gradient-to-br from-white/95 via-[#7f5dd4] to-[#34106f] shadow-[0_0_90px_rgba(139,63,251,.45)]" />
          {blocks.map(([left, top, size, color], index) => (
            <span
              key={`${left}-${top}`}
              className="absolute rotate-[28deg] rounded-[18px] border border-white/20 shadow-[0_0_38px_currentColor]"
              style={{ left, top, width: size, height: size, background: color, color, animationDelay: `${index * 160}ms` }}
            />
          ))}
          <div className="absolute bottom-5 left-1/2 h-4 w-[78%] -translate-x-1/2 rounded-full bg-[#bb69ff] opacity-70 blur-md" />
          <div className="absolute bottom-8 left-1/2 h-[3px] w-[48%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white to-transparent" />
        </div>

        <p className="mb-3 text-xs font-black uppercase tracking-[.34em] text-[#c77dff]">Beyond the limits</p>
        <h1 className="whitespace-nowrap text-[clamp(2.6rem,12vw,6.8rem)] font-black leading-none tracking-[-.06em]">
          <span className="bg-gradient-to-b from-white to-[#98a6c2] bg-clip-text text-transparent">CUBE</span>
          <span className="bg-gradient-to-r from-[#318cff] via-[#7758ff] to-[#bc47ff] bg-clip-text text-transparent">LAB</span>
          <span className="bg-gradient-to-b from-white to-[#9187d0] bg-clip-text text-transparent">3D</span>
        </h1>

        <div className="mt-8 max-w-xl rounded-[28px] border border-white/10 bg-white/[.055] p-6 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#9d8bc7]">Site under construction</p>
          <h2 className="mt-3 text-2xl font-black">Something powerful is taking shape.</h2>
          <p className="mt-3 text-sm leading-6 text-[#c3bad8]">
            Cube Labs 3D is building interactive puzzle solvers, daily challenges, friend play, saved puzzle memory, and competitive leaderboards.
          </p>
          <p className="mt-4 text-sm font-bold text-white">Launch details will appear here when the platform is ready.</p>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-[#8f82aa]">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/cookies" className="hover:text-white">Cookies</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </div>

        <p className="mt-6 text-[11px] uppercase tracking-[.16em] text-[#5e5277]">A FeralImage company · Cube Labs 3D</p>
      </section>
    </main>
  );
}
