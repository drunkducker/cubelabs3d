import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfileFriendsPageData, type ProfileFriend, type ProfileSuggestion } from "@/app/lib/profile-service";
import { acceptFriendRequest, declineFriendRequest, removeFriendship, sendFriendRequest } from "@/app/profile/friends/actions";
import { ChevronRightIcon, UserIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Friends | Cube Lab 3D",
  description: "View Cube Labs friends, pending requests, and challenge shortcuts.",
};

export default async function ProfileFriendsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const query = typeof searchParams?.q === "string" ? searchParams.q.slice(0, 48) : "";
  let data;
  try {
    data = await getProfileFriendsPageData(query);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Sign in required.") redirect("/auth");
    redirect("/auth/email?error=Your%20session%20expired.%20Please%20log%20in%20again.");
  }

  const friends = data.friends;
  const accepted = friends.filter((friend) => friend.status === "accepted");
  const incoming = friends.filter((friend) => friend.status === "pending" && friend.direction === "incoming");
  const outgoing = friends.filter((friend) => friend.status === "pending" && friend.direction === "outgoing");
  const discovery = data.searchQuery ? data.searchResults : data.suggestions;

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <BackLink />

        <section className="relative mt-5 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.45)]">
          <div className="absolute right-[-18px] top-[-18px] h-32 w-32 rotate-45 rounded-[8px] border border-[rgba(52,208,88,.28)] bg-[rgba(52,208,88,.12)]" />
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--green)]">Friends</p>
            <h1 className="mt-2 text-[38px] font-black leading-none text-white">Cube Friends</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Search public Cube IDs, review smart suggestions, send friend requests, and jump straight into challenges.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
          <form action="/profile/friends" className="grid gap-3">
            <label className="grid gap-2">
              <span className="text-[12px] font-black uppercase tracking-[.12em] text-[var(--muted)]">Find players</span>
              <input
                name="q"
                defaultValue={data.searchQuery}
                placeholder="Cube Tag, username, or display name"
                className="min-h-11 rounded-[8px] border border-[var(--border)] bg-black/25 px-3 text-sm font-semibold text-white outline-none"
              />
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button className="cta-purple min-h-11 rounded-[8px] text-sm font-black text-white">Search</button>
              <Link href="/profile/friends" className="grid min-h-11 place-items-center rounded-[8px] border border-[var(--border-2)] bg-black/20 px-4 text-sm font-black text-white">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Friends" value={String(accepted.length)} />
          <Metric label="Incoming" value={String(incoming.length)} />
          <Metric label="Sent" value={String(outgoing.length)} />
        </section>

        {discovery.length ? (
          <SuggestionGroup
            title={data.searchQuery ? "Search Results" : "Suggested Players"}
            subtitle={data.searchQuery ? "Public Cube IDs matching your search." : "Based on puzzle type, ranked scrambles, solve times, and public profile signals."}
            suggestions={discovery}
          />
        ) : data.searchQuery ? (
          <section className="mt-4 rounded-[8px] border border-dashed border-[var(--border-2)] bg-white/[.035] p-5 text-center">
            <h2 className="text-xl font-black text-white">No players found</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Try the exact Cube Tag, username, or public profile slug.</p>
          </section>
        ) : null}

        {friends.length ? (
          <section className="mt-4 grid gap-3">
            {accepted.length ? <FriendGroup title="Friends" friends={accepted} /> : null}
            {incoming.length ? <FriendGroup title="Incoming Requests" friends={incoming} /> : null}
            {outgoing.length ? <FriendGroup title="Sent Requests" friends={outgoing} /> : null}
          </section>
        ) : (
          <section className="mt-4 rounded-[8px] border border-dashed border-[var(--border-2)] bg-white/[.035] p-5 text-center">
            <UserIcon className="mx-auto h-10 w-10 text-[var(--green)]" />
            <h2 className="mt-3 text-xl font-black text-white">No friends yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Search for a Cube ID above or use the suggested players list to start building your challenge circle.
            </p>
            <Link href="/leaderboard/3x3/play" className="cta-purple mt-4 grid min-h-11 place-items-center rounded-[8px] text-sm font-black text-white">
              Send Challenge
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

function FriendGroup({ title, friends }: { title: string; friends: ProfileFriend[] }) {
  return (
    <section className="rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
      <h2 className="mb-3 text-[18px] font-black text-white">{title}</h2>
      <div className="grid gap-3">
        {friends.map((friend) => (
          <FriendRow key={friend.id} friend={friend} />
        ))}
      </div>
    </section>
  );
}

function SuggestionGroup({ title, subtitle, suggestions }: { title: string; subtitle: string; suggestions: ProfileSuggestion[] }) {
  return (
    <section className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
      <div className="mb-3">
        <h2 className="text-[18px] font-black text-white">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{subtitle}</p>
      </div>
      <div className="grid gap-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.user_id} suggestion={suggestion} />
        ))}
      </div>
    </section>
  );
}

function FriendRow({ friend }: { friend: ProfileFriend }) {
  const profile = friend.friend;
  const name = profile?.display_name || profile?.username || profile?.cube_tag || "Cube Friend";
  const handle = profileHandle(profile, friend.friend_id);

  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-black/20 p-3">
      <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[conic-gradient(from_220deg,var(--blue),var(--purple),var(--green),var(--blue))] p-[2px]">
          <span className="grid h-full w-full place-items-center rounded-full bg-[#111827] text-[13px] font-black text-white">
            {initials(name)}
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black text-white">{name}</p>
          <p className="mt-1 truncate text-[12px] font-semibold text-[var(--muted)]">@{handle}</p>
        </div>
        <span className={["rounded-full px-2 py-1 text-[10px] font-black capitalize", friend.status === "accepted" ? "bg-green-500/15 text-[var(--green)]" : "bg-yellow-500/15 text-[var(--gold)]"].join(" ")}>
          {friend.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {friend.status === "pending" && friend.direction === "incoming" ? (
          <>
            <form action={acceptFriendRequest}>
              <input type="hidden" name="friendship_id" value={friend.id} />
              <button className="cta-purple min-h-10 w-full rounded-[8px] text-[13px] font-black text-white">Accept</button>
            </form>
            <form action={declineFriendRequest}>
              <input type="hidden" name="friendship_id" value={friend.id} />
              <button className="min-h-10 w-full rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[13px] font-black text-white">Decline</button>
            </form>
          </>
        ) : friend.status === "accepted" ? (
          <>
            <Link href={challengeHref(profile, friend.friend_id)} className="cta-purple grid min-h-10 place-items-center rounded-[8px] text-[13px] font-black text-white">
              Challenge
            </Link>
            <form action={removeFriendship}>
              <input type="hidden" name="friendship_id" value={friend.id} />
              <button className="min-h-10 w-full rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[13px] font-black text-white">Remove</button>
            </form>
          </>
        ) : (
          <>
            <span className="grid min-h-10 place-items-center rounded-[8px] border border-[var(--border)] bg-white/[.04] text-[13px] font-black text-[var(--muted)]">
              Request sent
            </span>
            <form action={removeFriendship}>
              <input type="hidden" name="friendship_id" value={friend.id} />
              <button className="min-h-10 w-full rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[13px] font-black text-white">Cancel</button>
            </form>
          </>
        )}
      </div>
      <Link href={publicHref(profile)} className="mt-2 grid min-h-10 place-items-center rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[13px] font-black text-white">
        View Profile
      </Link>
    </article>
  );
}

function SuggestionCard({ suggestion }: { suggestion: ProfileSuggestion }) {
  const profile = suggestion.profile;
  const name = profile.display_name || profile.username || profile.cube_tag || "Cube Player";
  const handle = profileHandle(profile, suggestion.user_id);

  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-black/20 p-3">
      <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[conic-gradient(from_220deg,var(--purple),var(--blue),var(--green),var(--purple))] p-[2px]">
          <span className="grid h-full w-full place-items-center rounded-full bg-[#111827] text-[13px] font-black text-white">
            {initials(name)}
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black text-white">{name}</p>
          <p className="mt-1 truncate text-[12px] font-semibold text-[var(--muted)]">@{handle}</p>
        </div>
        <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-black text-[var(--blue)]">
          {suggestion.puzzle_type}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold leading-5 text-white">{suggestion.reason}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <MiniMetric label="Best" value={suggestion.best_time_ms ? formatClock(suggestion.best_time_ms) : "--"} />
        <MiniMetric label="Shared" value={String(suggestion.shared_scramble_count)} />
        <MiniMetric label="Solves" value={suggestion.total_solves ? String(suggestion.total_solves) : "--"} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <form action={sendFriendRequest}>
          <input type="hidden" name="target_id" value={suggestion.user_id} />
          <button className="cta-purple min-h-10 w-full rounded-[8px] text-[12px] font-black text-white">Add</button>
        </form>
        <Link href={challengeHref(profile, suggestion.user_id)} className="grid min-h-10 place-items-center rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[12px] font-black text-white">
          Challenge
        </Link>
        <Link href={publicHref(profile)} className="grid min-h-10 place-items-center rounded-[8px] border border-[var(--border-2)] bg-black/20 text-[12px] font-black text-white">
          View
        </Link>
      </div>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-[8px] border border-[var(--border)] bg-white/[.035] px-2 py-2">
      <span className="block text-[10px] font-black uppercase tracking-[.1em] text-[var(--muted)]">{label}</span>
      <span className="mt-1 block truncate text-[13px] font-black text-white">{value}</span>
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CF";
}

function profileHandle(profile: ProfileFriend["friend"] | ProfileSuggestion["profile"] | null | undefined, fallbackId: string) {
  return profile?.cube_tag || profile?.username || profile?.public_slug || fallbackId.slice(0, 8);
}

function publicHref(profile: ProfileFriend["friend"] | ProfileSuggestion["profile"] | null | undefined) {
  return profile?.public_slug ? `/u/${encodeURIComponent(profile.public_slug)}` : "/profile";
}

function challengeHref(profile: ProfileFriend["friend"] | ProfileSuggestion["profile"] | null | undefined, fallbackId: string) {
  const handle = profile?.cube_tag || profile?.username || profile?.public_slug || fallbackId;
  return `/leaderboard/3x3/play?recipient=${encodeURIComponent(handle)}`;
}

function formatClock(ms: number) {
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}
