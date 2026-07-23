/*
 * Input validation + normalization helpers. Pure and unit-testable.
 * The admin layer validates and normalizes ALL input server-side; the browser
 * is never trusted for shape, size, or safety.
 */

const MAX_TEXT = 5000;

export function normalizeText(value: unknown, max = MAX_TEXT): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.trim().slice(0, max);
}

export function requireText(value: unknown, field: string, max = MAX_TEXT): string {
  const s = normalizeText(value, max);
  if (!s) throw new ValidationError(`${field} is required.`);
  return s;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:"]);

/*
 * Accept only http/https absolute URLs. Blocks javascript:, data:, file:,
 * vbscript:, etc. Returns the normalized href or throws.
 */
export function safeUrl(value: unknown, field = "URL"): string {
  const s = normalizeText(value, 2048);
  if (!s) throw new ValidationError(`${field} is required.`);
  let parsed: URL;
  try {
    parsed = new URL(s);
  } catch {
    throw new ValidationError(`${field} must be a valid absolute URL.`);
  }
  if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
    throw new ValidationError(`${field} must use http or https.`);
  }
  return parsed.href;
}

export function optionalSafeUrl(value: unknown, field = "URL"): string | null {
  const s = normalizeText(value, 2048);
  if (!s) return null;
  return safeUrl(s, field);
}

export function isSafeUrl(value: unknown): boolean {
  try {
    safeUrl(value);
    return true;
  } catch {
    return false;
  }
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const s = normalizeText(value, 64);
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}
