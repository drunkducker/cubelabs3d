import { NextResponse } from "next/server";
import { authorizeAction } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { adminRequest, isAdminConfigured } from "@/lib/admin/service-client";
import { detectImageType, recordAsset, MEDIA_BUCKET, MAX_UPLOAD_BYTES } from "@/lib/admin/media";
import { handleActionError } from "@/app/admin/actions/shared";
import { normalizeText } from "@/lib/admin/validation";

export const dynamic = "force-dynamic";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/*
 * Admin media upload. Validates type (by magic bytes, not extension) and size
 * server-side, then stores the object in a PRIVATE Supabase Storage bucket via
 * the service role and records stable metadata. Gated on content.manage +
 * audited. Requires the `admin-media` bucket to exist in Supabase Storage.
 */
export async function POST(request: Request) {
  try {
    if (!isAdminConfigured()) return NextResponse.json({ error: "Admin service not configured." }, { status: 503 });
    const ctx = await authorizeAction("content.manage");

    const form = await request.formData();
    const file = form.get("file");
    const altText = normalizeText(form.get("alt_text"), 300) || null;
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "File exceeds 5 MB." }, { status: 413 });

    const buf = new Uint8Array(await file.arrayBuffer());
    const mime = detectImageType(buf);
    if (!mime) return NextResponse.json({ error: "Only PNG, JPEG, GIF, or WebP images are allowed." }, { status: 415 });

    const ext = mime.split("/")[1].replace("jpeg", "jpg");
    const objectKey = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

    // Upload to Supabase Storage (service role).
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${objectKey}`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": mime, "x-upsert": "false" },
      body: buf,
    });
    if (!up.ok) {
      const detail = await up.text();
      return NextResponse.json({ error: `Storage upload failed. Confirm the "${MEDIA_BUCKET}" bucket exists. ${detail.slice(0, 200)}` }, { status: 400 });
    }

    const id = await recordAsset({ bucket: MEDIA_BUCKET, objectKey, mime, size: file.size, altText, uploader: ctx.userId });
    await writeAudit(ctx, { action: "media.upload", targetType: "media_asset", targetId: id, newValue: { objectKey, mime, size: file.size }, reason: "Media upload" });

    return NextResponse.json({ id, bucket: MEDIA_BUCKET, object_key: objectKey, mime });
  } catch (error) {
    const message = await handleActionError(error, "media.upload");
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

// Owner/admin can generate a short-lived signed URL to preview a private object.
export async function GET(request: Request) {
  try {
    if (!isAdminConfigured()) return NextResponse.json({ error: "Admin service not configured." }, { status: 503 });
    await authorizeAction("content.manage");
    const key = new URL(request.url).searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key required." }, { status: 400 });
    const signed = await adminRequest<{ signedURL?: string }>(`/storage/v1/object/sign/${MEDIA_BUCKET}/${key}`, {
      method: "POST",
      body: JSON.stringify({ expiresIn: 300 }),
    });
    return NextResponse.json({ url: signed.signedURL ? `${SUPABASE_URL}/storage/v1${signed.signedURL}` : null });
  } catch (error) {
    const message = await handleActionError(error, "media.sign");
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
