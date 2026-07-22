import Link from "next/link";
import { signIn, signUp } from "./actions";

type AuthPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { error, message } = await searchParams;

  return (
    <main style={{ minHeight: "100vh", padding: "32px 18px", background: "#090b10", color: "white" }}>
      <div style={{ width: "min(920px, 100%)", margin: "0 auto" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>
          ← Back to Cube Labs
        </Link>
        <h1 style={{ fontSize: "clamp(2rem, 7vw, 4rem)", marginBottom: 8 }}>Your Cube Labs account</h1>
        <p style={{ color: "#b7bec9", maxWidth: 680 }}>
          Save solves, build a personal history, and challenge friends using the exact same scramble.
        </p>

        {(error || message) && (
          <p style={{ padding: 14, borderRadius: 12, background: error ? "#3b1016" : "#102e22" }}>
            {error ?? message}
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, marginTop: 28 }}>
          <form action={signIn} style={cardStyle}>
            <h2>Sign in</h2>
            <label style={labelStyle}>Email<input style={inputStyle} name="email" type="email" required autoComplete="email" /></label>
            <label style={labelStyle}>Password<input style={inputStyle} name="password" type="password" required autoComplete="current-password" /></label>
            <button style={buttonStyle} type="submit">Sign in</button>
          </form>

          <form action={signUp} style={cardStyle}>
            <h2>Create account</h2>
            <label style={labelStyle}>Display name<input style={inputStyle} name="display_name" maxLength={60} autoComplete="name" /></label>
            <label style={labelStyle}>Email<input style={inputStyle} name="email" type="email" required autoComplete="email" /></label>
            <label style={labelStyle}>Password<input style={inputStyle} name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
            <button style={buttonStyle} type="submit">Create account</button>
          </form>
        </div>
      </div>
    </main>
  );
}

const cardStyle = { background: "#121722", border: "1px solid #293142", borderRadius: 18, padding: 22, display: "grid", gap: 14 } as const;
const labelStyle = { display: "grid", gap: 7, fontWeight: 700 } as const;
const inputStyle = { width: "100%", boxSizing: "border-box", borderRadius: 10, border: "1px solid #3a4559", background: "#090c12", color: "white", padding: "12px 13px", fontSize: 16 } as const;
const buttonStyle = { border: 0, borderRadius: 999, padding: "13px 18px", fontWeight: 900, fontSize: 16, cursor: "pointer", background: "#f5c84b", color: "#16120a" } as const;
