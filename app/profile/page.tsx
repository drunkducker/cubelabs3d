import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";

type User = { id: string; email?: string };
type Profile = { username: string | null; display_name: string | null; avatar_url: string | null };
type Solve = {
  id: string;
  puzzle_type: string;
  solve_time_ms: number | null;
  move_count: number | null;
  solved: boolean;
  is_dnf: boolean;
  created_at: string;
};

export default async function ProfilePage() {
  const token = getAccessToken();
  if (!token) redirect("/auth");

  let user: User;
  try {
    user = await supabaseRequest<User>("/auth/v1/user", {}, token);
  } catch {
    redirect("/auth?error=Your%20session%20expired.%20Please%20sign%20in%20again.");
  }

  const profiles = await supabaseRequest<Profile[]>(
    `/rest/v1/profiles?id=eq.${user.id}&select=username,display_name,avatar_url`,
    {},
    token,
  );
  const solves = await supabaseRequest<Solve[]>(
    `/rest/v1/solve_results?user_id=eq.${user.id}&select=id,puzzle_type,solve_time_ms,move_count,solved,is_dnf,created_at&order=created_at.desc&limit=25`,
    {},
    token,
  );
  const profile = profiles[0];

  return (
    <main style={{ minHeight: "100vh", padding: "28px 18px", background: "#090b10", color: "white" }}>
      <div style={{ width: "min(900px, 100%)", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#f5c84b", textDecoration: "none", fontWeight: 800 }}>Cube Labs 3D</Link>
          <form action={signOut}><button style={secondaryButton}>Sign out</button></form>
        </div>

        <section style={{ marginTop: 34, padding: 24, borderRadius: 20, background: "#121722", border: "1px solid #293142" }}>
          <p style={{ margin: 0, color: "#9ca3af" }}>PLAYER PROFILE</p>
          <h1 style={{ fontSize: "clamp(2rem, 7vw, 4rem)", margin: "8px 0" }}>{profile?.display_name || profile?.username || "Cube Solver"}</h1>
          <p style={{ margin: 0, color: "#b7bec9" }}>{user.email}</p>
        </section>

        <section style={{ marginTop: 30 }}>
          <h2>Recent solves</h2>
          {solves.length === 0 ? (
            <div style={emptyStyle}>Your completed solves will appear here after the playable cube sends its first result.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {solves.map((solve) => (
                <article key={solve.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: 16, borderRadius: 14, background: "#121722", border: "1px solid #293142" }}>
                  <div><strong>{solve.puzzle_type}</strong><div style={{ color: "#9ca3af", marginTop: 5 }}>{new Date(solve.created_at).toLocaleString()}</div></div>
                  <div style={{ textAlign: "right" }}><strong>{solve.is_dnf ? "DNF" : solve.solve_time_ms == null ? "-" : `${(solve.solve_time_ms / 1000).toFixed(2)}s`}</strong><div style={{ color: "#9ca3af", marginTop: 5 }}>{solve.move_count == null ? "" : `${solve.move_count} moves`}</div></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const secondaryButton = { border: "1px solid #3a4559", borderRadius: 999, padding: "10px 16px", background: "transparent", color: "white", cursor: "pointer", fontWeight: 800 } as const;
const emptyStyle = { padding: 22, borderRadius: 16, background: "#121722", color: "#b7bec9", border: "1px dashed #3a4559" } as const;
