"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAvatarAction,
  submitAvatarAction,
  type AvatarActionResult,
} from "@/app/profile/settings/avatar-actions";

type LoadedImage = {
  element: HTMLImageElement;
  objectUrl: string;
  name: string;
};

export default function AvatarCropper({
  avatarUrl,
  avatarStatus,
}: {
  avatarUrl?: string | null;
  avatarStatus?: string | null;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [result, setResult] = useState<AvatarActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    drawPreview(canvasRef.current, loaded?.element ?? null, zoom, x, y);
  }, [loaded, zoom, x, y]);

  useEffect(() => {
    return () => {
      if (loaded?.objectUrl) URL.revokeObjectURL(loaded.objectUrl);
    };
  }, [loaded]);

  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setResult({ ok: false, message: "Use a JPEG, PNG, or WebP image." });
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setResult({ ok: false, message: "Choose an original image smaller than 12 MB." });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (loaded?.objectUrl) URL.revokeObjectURL(loaded.objectUrl);
      setLoaded({ element: image, objectUrl, name: file.name });
      setZoom(1);
      setX(0);
      setY(0);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setResult({ ok: false, message: "That image could not be opened." });
    };
    image.src = objectUrl;
  }

  function submitCrop() {
    if (!loaded) {
      setResult({ ok: false, message: "Choose an image before submitting." });
      return;
    }
    startTransition(async () => {
      try {
        const file = await canvasFile(canvasRef.current, loaded.name);
        const formData = new FormData();
        formData.set("avatar", file);
        formData.set("width", "512");
        formData.set("height", "512");
        formData.set("crop", JSON.stringify({ zoom, x, y }));
        const response = await submitAvatarAction(formData);
        setResult(response);
        if (response.ok) router.refresh();
      } catch (error) {
        setResult({
          ok: false,
          message: error instanceof Error ? error.message : "Unable to prepare the cropped image.",
        });
      }
    });
  }

  function removeAvatar() {
    startTransition(async () => {
      const response = await deleteAvatarAction();
      setResult(response);
      if (response.ok) {
        if (loaded?.objectUrl) URL.revokeObjectURL(loaded.objectUrl);
        setLoaded(null);
        router.refresh();
      }
    });
  }

  return (
    <section className="grid gap-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[var(--border-2)] bg-black/30">
          {avatarUrl ? <img src={avatarUrl} alt="Current avatar" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xl font-black text-[var(--muted)]">CL</div>}
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Profile avatar</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Crop a square image. New uploads enter private review and do not replace the approved avatar until moderation is complete.
          </p>
          {avatarStatus && avatarStatus !== "none" ? (
            <span className="mt-2 inline-flex rounded-full border border-[var(--border-2)] bg-black/20 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-[var(--blue)]">
              {avatarStatus}
            </span>
          ) : null}
        </div>
      </div>

      <label className="grid gap-2 text-sm font-black text-white">
        Choose image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={chooseFile}
          className="block w-full rounded-[8px] border border-[var(--border)] bg-black/25 p-3 text-sm font-semibold text-[var(--muted)] file:mr-3 file:rounded-[6px] file:border-0 file:bg-white/10 file:px-3 file:py-2 file:font-black file:text-white"
        />
      </label>

      <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[12px] border border-[var(--border-2)] bg-black/40 p-3">
        <canvas ref={canvasRef} width={512} height={512} className="aspect-square w-full rounded-full bg-[#070a12]" />
      </div>

      {loaded ? (
        <div className="grid gap-3">
          <Range label="Zoom" min={1} max={3} step={0.01} value={zoom} onChange={setZoom} />
          <Range label="Left / right" min={-1} max={1} step={0.01} value={x} onChange={setX} />
          <Range label="Up / down" min={-1} max={1} step={0.01} value={y} onChange={setY} />
        </div>
      ) : null}

      {result ? (
        <p className={`rounded-[8px] border px-3 py-2 text-sm font-bold ${result.ok ? "border-green-400/25 bg-green-500/10 text-green-200" : "border-red-400/25 bg-red-500/10 text-red-100"}`}>
          {result.message}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!loaded || pending}
          onClick={submitCrop}
          className="cta-purple min-h-11 rounded-[8px] px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? "Working..." : "Submit for review"}
        </button>
        <button
          type="button"
          disabled={pending || (!avatarUrl && avatarStatus !== "pending")}
          onClick={removeAvatar}
          className="min-h-11 rounded-[8px] border border-red-400/30 bg-red-500/10 px-3 text-sm font-black text-red-100 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Remove avatar
        </button>
      </div>
    </section>
  );
}

function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-xs font-black uppercase tracking-[.1em] text-[var(--muted)]">
        {label}
        <span>{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--purple)]"
      />
    </label>
  );
}

function drawPreview(
  canvas: HTMLCanvasElement | null,
  image: HTMLImageElement | null,
  zoom: number,
  x: number,
  y: number,
) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#070a12";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (!image) {
    context.fillStyle = "#8a93a6";
    context.font = "700 28px system-ui";
    context.textAlign = "center";
    context.fillText("Choose an image", canvas.width / 2, canvas.height / 2);
    return;
  }

  const baseScale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const scale = baseScale * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const overflowX = Math.max(0, width - canvas.width);
  const overflowY = Math.max(0, height - canvas.height);
  const left = (canvas.width - width) / 2 + x * overflowX / 2;
  const top = (canvas.height - height) / 2 + y * overflowY / 2;
  context.drawImage(image, left, top, width, height);
}

async function canvasFile(canvas: HTMLCanvasElement | null, originalName: string): Promise<File> {
  if (!canvas) throw new Error("Crop canvas is unavailable.");
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
  if (!blob) throw new Error("Unable to encode the cropped avatar.");
  const base = originalName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "avatar";
  return new File([blob], `${base}.webp`, { type: "image/webp" });
}
