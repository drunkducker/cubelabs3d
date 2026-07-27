import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfileSession } from "@/app/lib/profile-service";
import { getBlockedProfiles, type BlockedProfile } from "@/app/lib/safety-service";
import { unblockUser } from "@/app/safety/actions";
import { ChevronRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Blocked Accounts | Cube Lab 3D",
  description: "Review and unblock accounts you have blocked on Cube Labs.",
};

export default async function BlockedAccountsPage() {
  let blocked: BlockedProfile[] = [];
  try {
    const { token, user } = await requireProfileSession();
    blocked = await getBlockedProfiles(token, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Sign in required.") redirect("/auth");
    redirect("/auth/email?error=Your%20session%20expired.%20Please%20log%20in%20again.");
  }

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <Link href="/profile/friends" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
          Back to friends
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.45)]">
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--gold)]">Safety</p>
            <h1 className="mt-2 text-[34px] font-black leading-none text-white">Blocked Accounts</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Blocked accounts are removed from your friends and hidden from your search and suggestions.
              Unblock anyone to make them visible again.
            </p>
          </div>
        </section>

        {blocked.length ? (
          <section className="mt-4 grid gap-3">
            {blocked.map((entry) => (
              <BlockedRow key={entry.block_id} entry={entry} />
            ))}
          </section>
        ) : (
          <section className="mt-4 rounded-[8px] border border-dashed border-[var(--border-2)] bg-white/[.035] p-5 text-center">
            <h2 className="text-xl font-black text-white">No blocked accounts</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              You have not blocked anyone. You can block or report a player from their profile.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function BlockedRow({ entry }: { entry: BlockedProfile }) {
  const name = entry.display_name || entry.username || entry.cube_tag || "Cube Player";
  const handle = entry.cube_tag || entry.username || entry.public_slug || entry.blocked_id.slice(0, 8);

  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-black/20 p-3">
      <div className="grid grid-cols-[44px_1fr] items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[conic-gradient(from_220deg,#64748b,#334155,#64748b)] p-[2px]">
          <span className="grid h-full w-full place-items-center rounded-full bg-[#111827] text-[13px] font-black text-white">
            {initials(name)}
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black text-white">{name}</p>
          <p className="mt-1 truncate text-[12px] font-semibold text-[var(--muted)]">@{handle}</p>
        </div>
      </div>
      {entry.reason ? <p className="mt-2 text-xs font-semibold text-[var(--muted)]">Note: {entry.reason}</p> : null}
      <form action={unblockUser} className="mt-3">
        <input type="hidden" name="target_id" value={entry.blocked_id} />
        <button className="min-h-10 w-full rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[13px] font-black text-white">
          Unblock
        </button>
      </form>
    </article>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CP"
  );
}
