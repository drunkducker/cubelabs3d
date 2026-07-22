import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";

type User = { id: string; email?: string };
type Profile = {
  username: string | null;
  display_name: string | null;
  cube_tag: string | null;
  public_slug: string | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  favorite_puzzle: string | null;
  created_at: string;
};
type Solve = { id: string; puzzle_type: string; solve_time_ms: number | null; move_count: number | null; is_dnf: boolean; created_at: string };
type Stats = { total_solves: number; solved_count: number; current_streak: number; longest_streak: number; best_times: Record<string, number> };
type CollectionItem = { id: string; brand: string | null; model: string; puzzle_type: string; is_favorite: boolean };
type Achievement = { achievement_id: string; unlocked_at: string; achievements?: { name: string; icon: string | null } | null };
type Challenge = { id: string; puzzle_type: string; status: string; sender_time_ms: number | null; created_at: string };
type Friendship = { id: string; status: string };

function formatTime(milliseconds?: number | null) {
  if (milliseconds == null) return "—";
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

export default async function ProfilePage() {
  const token = getAccessToken();
  if (!token) redirect("/auth");

  let user: User;
  try {
    user = await supabaseRequest<User>("/auth/v1/user", {}, token);
  } catch {
    redirect("/auth/email?error=Your%20session%20expired.%20Please%20log%20in%20again.");
  }

  const [profiles, solves, statsRows, collection, achievements, challenges, friendships] = await Promise.all([
    supabaseRequest<Profile[]>(`/rest/v1/profiles?id=eq.${user.id}&select=username,display_name,cube_tag,public_slug,avatar_url,title,bio,favorite_puzzle,created_at`, {}, token),
    supabaseRequest<Solve[]>(`/rest/v1/solve_results?user_id=eq.${user.id}&select=id,puzzle_type,solve_time_ms,move_count,is_dnf,created_at&order=created_at.desc&limit=5`, {}, token),
    supabaseRequest<Stats[]>(`/rest/v1/user_stats?user_id=eq.${user.id}&select=total_solves,solved_count,current_streak,longest_streak,best_times`, {}, token),
    supabaseRequest<CollectionItem[]>(`/rest/v1/cube_collection?user_id=eq.${user.id}&select=id,brand,model,puzzle_type,is_favorite&order=is_favorite.desc,created_at.desc&limit=4`, {}, token),
    supabaseRequest<Achievement[]>(`/rest/v1/user_achievements?user_id=eq.${user.id}&select=achievement_id,unlocked_at,achievements(name,icon)&order=unlocked_at.desc&limit=4`, {}, token),
    supabaseRequest<Challenge[]>(`/rest/v1/challenges?or=(sender_id.eq.${user.id},recipient_id.eq.${user.id})&select=id,puzzle_type,status,sender_time_ms,created_at&order=created_at.desc&limit=4`, {}, token),
    supabaseRequest<Friendship[]>(`/rest/v1/friendships?or=(requester_id.eq.${user.id},addressee_id.eq.${user.id})&status=eq.accepted&select=id,status`, {}, token),
  ]);

  const profile = profiles[0];
  const stats = statsRows[0];
  const displayName = profile?.display_name || profile?.username || "Cube Solver";
  const best3x3 = stats?.best_times?.["3x3"];

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[var(--bg)] px-4 py-6 sm:px-8 sm:py-10">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1] mx-auto w-full max-w-[1180px]">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 font-black">
            <svg viewBox="0 0 48 48" aria-hidden="true" className="h-10 w-10"><polygon points="24,3 43,13 24,23 5,13" fill="#f4f6f8"/><polygon points="5,13 24,23 24,45 5,35" fill="#1667e0"/><polygon points="24,23 43,13 43,35 24,45" fill="#e6352b"/><polygon points="24,3 33,8 14,18 5,13" fill="#ffd21f"/></svg>
            <span>CUBE LAB <span className="text-[var(--blue)]">3D</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/profile/settings" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-extrabold">Customize</Link>
            <form action={signOut}><button className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-extrabold text-[var(--muted)]">Sign out</button></form>
          </div>
        </header>

        <section className="glass overflow-hidden rounded-[28px] p-5 shadow-[var(--shadow)] sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="grid h-24 w-24 flex-none place-items-center overflow-hidden rounded-[26px] border border-[var(--border-2)] bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-4xl font-black">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold tracking-[0.22em] text-[var(--blue)]">MY CUBE ID</p>
              <h1 className="mt-2 truncate text-4xl font-black tracking-[-0.04em] sm:text-6xl">{displayName}</h1>
              <p className="mt-2 font-bold text-[var(--green)]">{profile?.title || "Cube Explorer"}</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{profile?.bio || "Your public bio, favorite puzzle, avatar, title, colors, and privacy choices will all be customizable here."}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4 sm:min-w-56">
              <p className="text-xs font-extrabold tracking-[0.18em] text-[var(--faint)]">PRIVATE IDENTIFIER</p>
              <p className="mt-2 break-all text-lg font-black">{profile?.cube_tag || "Generated after migration"}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Hidden during normal use. Share it only when another player needs to find the exact account.</p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total solves" value={String(stats?.total_solves ?? solves.length)} />
          <Stat label="Best 3×3" value={formatTime(best3x3)} />
          <Stat label="Current streak" value={`${stats?.current_streak ?? 0} days`} />
          <Stat label="Friends" value={String(friendships.length)} />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
          <div className="grid gap-5">
            <DashboardSection title="Recent solves" href="/profile/solves">
              {solves.length ? solves.map((solve) => (
                <article key={solve.id} className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div><strong>{solve.puzzle_type}</strong><p className="mt-1 text-xs text-[var(--muted)]">{new Date(solve.created_at).toLocaleString()}</p></div>
                  <div className="text-right"><strong>{solve.is_dnf ? "DNF" : formatTime(solve.solve_time_ms)}</strong><p className="mt-1 text-xs text-[var(--muted)]">{solve.move_count == null ? "" : `${solve.move_count} moves`}</p></div>
                </article>
              )) : <Empty text="Your completed solves will appear here." action="Open a playable cube" href="/play/3x3" />}
            </DashboardSection>

            <DashboardSection title="Cube collection" href="/profile/collection">
              {collection.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{collection.map((cube) => (
                <article key={cube.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="mb-3 text-2xl">◈</div><strong className="block truncate">{cube.model}</strong><p className="mt-1 text-xs text-[var(--muted)]">{cube.brand || cube.puzzle_type}</p></article>
              ))}</div> : <Empty text="Build a digital shelf of the puzzles you own." action="Add your first cube" href="/profile/collection" />}
            </DashboardSection>
          </div>

          <div className="grid content-start gap-5">
            <DashboardSection title="Challenges" href="/profile/challenges">
              {challenges.length ? challenges.map((challenge) => <article key={challenge.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex justify-between gap-3"><strong>{challenge.puzzle_type} challenge</strong><span className="text-xs font-bold text-[var(--blue)]">{challenge.status}</span></div><p className="mt-2 text-sm text-[var(--muted)]">Target: {formatTime(challenge.sender_time_ms)}</p></article>) : <Empty text="Send a scramble and dare a friend to beat it." action="Create challenge" href="/profile/challenges" />}
            </DashboardSection>

            <DashboardSection title="Achievements" href="/profile/achievements">
              {achievements.length ? achievements.map((item) => <article key={item.achievement_id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-yellow-400/15 text-xl">★</span><div><strong>{item.achievements?.name || item.achievement_id}</strong><p className="mt-1 text-xs text-[var(--muted)]">Unlocked {new Date(item.unlocked_at).toLocaleDateString()}</p></div></article>) : <Empty text="Achievements unlock as you solve, practice, collect, and compete." action="View achievement path" href="/profile/achievements" />}
            </DashboardSection>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="glass rounded-2xl p-4"><p className="text-xs font-bold text-[var(--muted)]">{label}</p><p className="mt-2 text-xl font-black sm:text-2xl">{value}</p></div>;
}

function DashboardSection({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return <section className="glass rounded-[24px] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">{title}</h2><Link href={href} className="text-sm font-extrabold text-[var(--blue)]">View all</Link></div><div className="grid gap-3">{children}</div></section>;
}

function Empty({ text, action, href }: { text: string; action: string; href: string }) {
  return <div className="rounded-2xl border border-dashed border-[var(--border-2)] p-5 text-sm leading-6 text-[var(--muted)]">{text}<div><Link href={href} className="mt-3 inline-block font-extrabold text-[var(--blue)]">{action} →</Link></div></div>;
}
