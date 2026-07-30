import "server-only";

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export class PrivacyServiceConfigError extends Error {
  constructor() {
    super("Privacy service is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    this.name = "PrivacyServiceConfigError";
  }
}

export function isPrivacyServiceConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

function requireConfig() {
  if (!isPrivacyServiceConfigured()) throw new PrivacyServiceConfigError();
}

function serviceHeaders(extra?: HeadersInit): Headers {
  requireConfig();
  const headers = new Headers(extra);
  headers.set("apikey", SERVICE_ROLE_KEY);
  headers.set("Authorization", `Bearer ${SERVICE_ROLE_KEY}`);
  return headers;
}

export async function serviceFetch(path: string, init: RequestInit = {}): Promise<Response> {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: serviceHeaders(init.headers),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase service request failed with ${response.status}.`);
  }
  return response;
}

export async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await serviceFetch(path, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function encodeObjectPath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function uploadObject(input: {
  bucket: string;
  path: string;
  bytes: Uint8Array;
  contentType: string;
  upsert?: boolean;
}): Promise<void> {
  await serviceFetch(
    `/storage/v1/object/${encodeURIComponent(input.bucket)}/${encodeObjectPath(input.path)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": input.contentType,
        "x-upsert": input.upsert ? "true" : "false",
        "cache-control": "3600",
      },
      body: input.bytes,
    },
  );
}

export async function downloadObject(bucket: string, path: string): Promise<Uint8Array> {
  const response = await serviceFetch(
    `/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`,
  );
  return new Uint8Array(await response.arrayBuffer());
}

export async function deleteObjects(bucket: string, paths: string[]): Promise<void> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return;
  for (let index = 0; index < unique.length; index += 1000) {
    await adminJson(`/storage/v1/object/${encodeURIComponent(bucket)}`, {
      method: "DELETE",
      body: JSON.stringify({ prefixes: unique.slice(index, index + 1000) }),
    });
  }
}

export async function createSignedObjectUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number,
): Promise<string> {
  const result = await adminJson<{ signedURL?: string; signedUrl?: string }>(
    `/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`,
    {
      method: "POST",
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    },
  );
  const signedPath = result.signedURL ?? result.signedUrl;
  if (!signedPath) throw new Error("Supabase did not return a signed export URL.");
  if (/^https?:\/\//i.test(signedPath)) return signedPath;
  return `${SUPABASE_URL}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`;
}

export function publicObjectUrl(bucket: string, path: string): string {
  requireConfig();
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`;
}

export async function listOwnedStorageObjects(userId: string): Promise<Array<{ bucket_id: string; name: string }>> {
  return adminJson<Array<{ bucket_id: string; name: string }>>(
    "/rest/v1/rpc/privacy_owned_storage_objects",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ target_user: userId }),
    },
  );
}
