"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/*
 * TOTP enrollment flow. Step 1: enroll → server returns a QR (SVG) + secret.
 * Step 2: user scans in their authenticator and enters the 6-digit code to
 * verify. The secret is shown once and never persisted client-side.
 */
export function MfaSetup({ enrolled }: { enrolled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "enrolling" | "verify">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return { ok: res.ok, data: (await res.json()) as Record<string, unknown> };
  }

  async function startEnroll() {
    setBusy(true); setMsg(null);
    const { ok, data } = await call({ action: "enroll", name: "Cube Labs Admin" });
    setBusy(false);
    if (!ok) { setMsg({ tone: "err", text: String(data.error ?? "Enrollment failed.") }); return; }
    setFactorId(String(data.id));
    setQr((data.qrSvg as string) ?? null);
    setSecret((data.secret as string) ?? null);
    setStep("verify");
  }

  async function verify() {
    if (!factorId) return;
    setBusy(true); setMsg(null);
    const { ok, data } = await call({ action: "verify", factor_id: factorId, code });
    setBusy(false);
    if (!ok) { setMsg({ tone: "err", text: String(data.error ?? "Invalid code.") }); return; }
    setMsg({ tone: "ok", text: "Two-factor is now enabled. Sign out and back in to get an aal2 session." });
    setStep("idle");
    router.refresh();
  }

  if (enrolled && step === "idle") {
    return <p className="text-sm text-emerald-400">✓ A verified authenticator is enrolled on your account.</p>;
  }

  return (
    <div className="grid gap-3">
      {step === "idle" && (
        <button onClick={startEnroll} disabled={busy} className="min-h-[44px] w-fit rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white disabled:opacity-60">
          {busy ? "Starting…" : "Set up authenticator app"}
        </button>
      )}

      {step === "verify" && (
        <div className="grid gap-3">
          <p className="text-sm text-[var(--muted)]">Scan this in Google Authenticator, 1Password, Authy, etc. — then enter the 6-digit code.</p>
          {qr && (qr.trim().startsWith("<svg")
            ? <div className="w-40 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={qr} alt="Authenticator QR code" className="w-40 rounded-xl bg-white p-2" />)}
          {secret && <p className="text-xs text-[var(--muted)]">Or enter this secret manually: <code className="break-all">{secret}</code></p>}
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="input w-40 tracking-[0.3em]"
              aria-label="6-digit code"
            />
            <button onClick={verify} disabled={busy || code.length !== 6} className="min-h-[44px] rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white disabled:opacity-60">
              {busy ? "Verifying…" : "Verify & enable"}
            </button>
          </div>
        </div>
      )}

      {msg && <p className={`text-sm font-bold ${msg.tone === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>}
    </div>
  );
}
