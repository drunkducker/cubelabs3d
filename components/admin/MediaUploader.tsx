"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/*
 * Admin media uploader. Posts a single image to /api/admin/media (which
 * validates type by magic bytes + size server-side and stores it privately).
 * Client-side checks are convenience only; the server is the authority.
 */
export function MediaUploader() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMsg({ tone: "err", text: "Choose an image first." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: data });
      const json = (await res.json()) as { error?: string; object_key?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setMsg({ tone: "ok", text: `Uploaded ${json.object_key}.` });
      formEl.reset();
      router.refresh();
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <input type="file" name="file" accept="image/png,image/jpeg,image/gif,image/webp" required className="input py-2" />
      <input name="alt_text" placeholder="Alt text (accessibility)" className="input" />
      <button disabled={busy} className="min-h-[44px] rounded-xl bg-[var(--blue)] px-4 text-sm font-extrabold text-white disabled:opacity-60">
        {busy ? "Uploading…" : "Upload"}
      </button>
      {msg && (
        <p className={`sm:col-span-3 text-sm font-bold ${msg.tone === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>
      )}
    </form>
  );
}
