import Link from "next/link";
import { requireAdmin, hasAnyRole } from "@/app/lib/admin";
import { supabaseRequest } from "@/app/lib/supabase-rest";
import { ADMIN_NAV } from "./adminNav";

type SearchParams = { searchParams?: { error?: string } };

// Live count of registered players. Readable under the existing profiles RLS.
async function countPlayers(token: string): Promise<number | null> {
  try {
    const rows = await supabaseRequest<{ id: string }[]>(
      "/rest/v1/profiles?select=id&limit=10000",
      {},
      token,
    );
    return Array.isArray(rows) ? rows.length : null;
  } catch {
    return null;
  }
}

export default async function AdminDashboard({ searchParams = {} }: SearchParams) {
  const { role, token } = await requireAdmin();
  const players = await countPlayers(token);

  // Tiles marked live:false need a data pipeline (service-role reads or
  // security-definer aggregates) that arrives with their sections. Shown as
  // planned rather than faked.
  const tiles: { label: string; value: string; live: boolean }[] = [
    { label: "Players", value: players == null ? "—" : players.toLocaleString(), live: true },
    { label: "Solves", value: "—", live: false },
    { label: "Challenges", value: "—", live: false },
    { label: "Ad clicks", value: "—", live: false },
    { label: "Affiliate clicks", value: "—", live: false },
    { label: "Revenue", value: "—", live: false },
  ];

  return (
    <div className="grid gap-5">
      <header>
        <h1 className="text-2xl font-black tracking-[-0.02em]">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Owner-operated control center. You are signed in as <span className="font-bold text-[var(--blue)]">{role}</span>.</p>
      </header>

      {searchParams.error && (
        <div role="status" className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
          {searchParams.error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="cube-card rounded-2xl p-4">
            <div className="text-xs font-bold text-[var(--muted)]">{tile.label}</div>
            <div className="mt-2 text-2xl font-black">{tile.value}</div>
            {!tile.live && <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-[var(--faint)]">Data pending</div>}
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-[var(--muted)]">Control sections</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ADMIN_NAV.filter((item) => item.href !== "/admin" && (!item.roles || hasAnyRole(role, item.roles))).map((item) => (
            <div key={item.href} className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
              <div className="min-w-0">
                <div className="font-extrabold">{item.label}</div>
                {item.note && <div className="truncate text-xs text-[var(--muted)]">{item.note}</div>}
              </div>
              {item.ready ? (
                <Link href={item.href} className="flex-none rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-black text-[var(--blue)]">
                  Open
                </Link>
              ) : (
                <span className="flex-none rounded-lg bg-[var(--surface-2)] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--faint)]">Soon</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs leading-5 text-[var(--faint)]">
        Priority build order per the owner: managed ads, YouTube videos, and affiliate links, then user and test-lab tools. Global metrics beyond player count activate as each section&apos;s data pipeline lands.
      </p>
    </div>
  );
}
