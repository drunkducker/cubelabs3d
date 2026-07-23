import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfileCollectionPageData, type ProfileCollectionItem } from "@/app/lib/profile-service";
import { ChevronRightIcon, CubeIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "My Cubes | Cube Lab 3D",
  description: "View your saved Cube Labs cube collection and favorite puzzles.",
};

export default async function ProfileCollectionPage() {
  let data;
  try {
    data = await getProfileCollectionPageData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Sign in required.") redirect("/auth");
    redirect("/auth/email?error=Your%20session%20expired.%20Please%20log%20in%20again.");
  }

  const cubes = data.collection;
  const favorites = cubes.filter((cube) => cube.is_favorite).length;
  const puzzleTypes = new Set(cubes.map((cube) => cube.puzzle_type)).size;

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <BackLink />

        <section className="relative mt-5 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.45)]">
          <div className="absolute right-[-18px] top-[-16px] h-32 w-32 rotate-45 rounded-[8px] border border-[rgba(139,92,246,.28)] bg-[rgba(139,92,246,.12)]" />
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--purple)]">Cube Shelf</p>
            <h1 className="mt-2 text-[38px] font-black leading-none text-white">My Cubes</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Live saved collection rows. Favorites feed the approved profile dashboard shelf.
            </p>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Cubes" value={String(cubes.length)} />
          <Metric label="Favorites" value={String(favorites)} />
          <Metric label="Types" value={String(puzzleTypes)} />
        </section>

        {cubes.length ? (
          <section className="mt-4 grid grid-cols-2 gap-3">
            {cubes.map((cube) => (
              <CubeCard key={cube.id} cube={cube} />
            ))}
          </section>
        ) : (
          <section className="mt-4 rounded-[8px] border border-dashed border-[var(--border-2)] bg-white/[.035] p-5 text-center">
            <CubeIcon className="mx-auto h-10 w-10 text-[var(--purple)]" />
            <h2 className="mt-3 text-xl font-black text-white">No cubes saved yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              The database connection is ready. Add/edit controls can write to `cube_collection` in the next pass.
            </p>
            <Link href="/play/3x3" className="cta-purple mt-4 grid min-h-11 place-items-center rounded-[8px] text-sm font-black text-white">
              Play 3x3
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

function BackLink() {
  return (
    <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
      <ChevronRightIcon className="h-4 w-4 rotate-180" />
      Back to profile
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-white/[.04] p-3 text-center">
      <p className="text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-[22px] font-black text-white">{value}</p>
    </article>
  );
}

function CubeCard({ cube }: { cube: ProfileCollectionItem }) {
  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-white/[.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
      {cube.image_url ? (
        <img src={cube.image_url} alt="" className="h-28 w-full rounded-[8px] object-cover" />
      ) : (
        <div className="grid h-28 place-items-center rounded-[8px] bg-black/25">
          <MiniCube puzzleType={cube.puzzle_type} />
        </div>
      )}
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black text-white">{cube.model}</p>
          <p className="mt-1 truncate text-[12px] font-semibold text-[var(--muted)]">{cube.nickname || cube.brand || cube.puzzle_type}</p>
        </div>
        {cube.is_favorite ? (
          <span className="rounded-full bg-purple-500/15 px-2 py-1 text-[10px] font-black text-[var(--purple)]">Main</span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-400">
        <span>{cube.puzzle_type}</span>
        <span>{cube.rating ? `${cube.rating}/5` : "unrated"}</span>
      </div>
    </article>
  );
}

function MiniCube({ puzzleType }: { puzzleType: string }) {
  const grid = Math.min(Math.max(Number.parseInt(puzzleType, 10) || 3, 2), 5);
  const colors = ["#f8fafc", "#2563eb", "#dc2626", "#16a34a", "#facc15", "#f97316"];

  return (
    <span className="grid h-[72px] w-[72px] rotate-[-8deg] grid-cols-3 gap-1 rounded-[8px] bg-[#070a12] p-1 shadow-[0_0_24px_rgba(46,166,255,.2)]">
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className="rounded-[3px] shadow-[inset_0_1px_2px_rgba(255,255,255,.24),inset_0_-2px_4px_rgba(0,0,0,.35)]"
          style={{ background: colors[(index + grid) % colors.length] }}
        />
      ))}
    </span>
  );
}
