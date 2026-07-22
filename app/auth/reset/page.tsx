"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import PasswordField from "@/components/PasswordField";

// Public Supabase config. NEXT_PUBLIC_* vars are inlined at build time and are
// safe to expose; the fallbacks keep the reset page working if they are unset.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fvcjufbyjkjyorrmpgrm.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_M7xCkwqOO3GxL7VhZcdv7A_cVxbHy9s";

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState("");
  const [message, setMessage] = useState("Reading your secure reset link…");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("access_token") ?? "";
    const type = params.get("type");

    if (!token || type !== "recovery") {
      setError("This reset link is missing, expired, or was already used. Request a new reset email.");
      setMessage("");
      return;
    }

    setAccessToken(token);
    setReady(true);
    setMessage("");
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("Updating your password…");

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");

    if (password.length < 8) {
      setMessage("");
      setError("Your password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("");
      setError("The two passwords do not match.");
      return;
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage("");
      setError(result?.msg ?? result?.message ?? "Unable to update your password. Request a new reset link.");
      return;
    }

    window.location.href = "/auth/email?mode=login&message=Password%20updated.%20Log%20in%20with%20your%20new%20password.";
  }

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[var(--bg)] px-5 py-8 sm:px-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1] mx-auto w-full max-w-[520px]">
        <Link href="/auth/email?mode=login" className="mb-8 inline-flex text-sm font-bold text-[var(--muted)]">← Back to login</Link>
        <section className="glass grid gap-5 rounded-[26px] p-6 sm:p-8">
          <div>
            <p className="text-xs font-extrabold tracking-[0.22em] text-[var(--blue)]">CUBE LAB 3D</p>
            <h1 className="mt-3 text-3xl font-black">Choose a new password</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use at least 8 characters. The eye control lets you verify what you entered before saving.</p>
          </div>

          {message && <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm font-bold text-blue-100">{message}</div>}
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}

          {ready && (
            <form onSubmit={updatePassword} className="grid gap-4">
              <PasswordField name="password" autoComplete="new-password" minLength={8} label="New password" />
              <PasswordField name="confirm_password" autoComplete="new-password" minLength={8} label="Confirm new password" />
              <button className="cta-blue min-h-12 rounded-xl px-5 font-black" type="submit">Save new password</button>
            </form>
          )}

          {!ready && error && <Link href="/auth/email?mode=login" className="text-center font-black text-[var(--blue)]">Request another reset email</Link>}
        </section>
      </div>
    </main>
  );
}
