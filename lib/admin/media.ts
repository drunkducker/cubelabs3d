import "server-only";

import { adminRequest } from "./service-client";
import { MEDIA_BUCKET, MAX_UPLOAD_BYTES, detectImageType } from "./image-detect";

export { MEDIA_BUCKET, MAX_UPLOAD_BYTES, detectImageType };

export type MediaAsset = {
  id: string;
  bucket: string;
  object_key: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  moderation_status: string;
  created_at: string;
};

export async function listMedia(limit = 40): Promise<MediaAsset[]> {
  try {
    return await adminRequest<MediaAsset[]>(
      `/rest/v1/media_assets?select=id,bucket,object_key,mime_type,size_bytes,width,height,alt_text,moderation_status,created_at&order=created_at.desc&limit=${Math.min(100, limit)}`,
    );
  } catch {
    return [];
  }
}

export async function recordAsset(input: {
  bucket: string;
  objectKey: string;
  mime: string;
  size: number;
  altText: string | null;
  uploader: string;
}): Promise<string | null> {
  const rows = await adminRequest<Array<{ id: string }>>(`/rest/v1/media_assets?select=id`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      bucket: input.bucket,
      object_key: input.objectKey,
      mime_type: input.mime,
      size_bytes: input.size,
      alt_text: input.altText,
      uploader: input.uploader,
    }),
  });
  return rows?.[0]?.id ?? null;
}
