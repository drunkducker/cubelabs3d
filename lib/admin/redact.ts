/*
 * Redaction for audit/security records. Sensitive values must never be written
 * to the audit log or security events. This runs before every insert.
 *
 * Pure and dependency-free so it can be unit tested without a database.
 */

const SENSITIVE_KEY = /(password|token|secret|service[_-]?role|api[_-]?key|authorization|cookie|refresh|access[_-]?token|recovery|otp|smtp|credential)/i;

export function redactValue(input: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (input === null || input === undefined) return input;
  if (typeof input === "string") {
    // Redact things that look like JWTs or long opaque tokens.
    if (/^ey[A-Za-z0-9_-]{10,}\./.test(input)) return "[REDACTED_TOKEN]";
    if (input.length > 4096) return input.slice(0, 4096) + "…[TRUNCATED]";
    return input;
  }
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) return input.map((v) => redactValue(v, depth + 1));
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactValue(value, depth + 1);
    }
    return out;
  }
  return "[UNSERIALIZABLE]";
}
