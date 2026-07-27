/*
 * Pure helpers and constants for user-facing safety actions (blocking and
 * reporting). Kept free of any server or browser dependency so it can be unit
 * tested and shared between server actions and rendering.
 */

export const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "impersonation", label: "Impersonation" },
  { value: "cheating", label: "Cheating or fake results" },
  { value: "spam", label: "Spam or unwanted contact" },
  { value: "inappropriate", label: "Inappropriate or offensive content" },
  { value: "illegal", label: "Illegal or dangerous content" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReasonValue = (typeof REPORT_REASONS)[number]["value"];

/** Matches the target_type values catalogued on public.moderation_reports. */
export const REPORT_TARGET_TYPES = [
  "user",
  "display_name",
  "avatar",
  "message",
  "challenge",
  "solve",
  "leaderboard_row",
  "content",
] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const MAX_REPORT_DETAILS = 1000;
export const MAX_BLOCK_REASON = 200;

const REASON_VALUES = new Set<string>(REPORT_REASONS.map((r) => r.value));
const TARGET_TYPES = new Set<string>(REPORT_TARGET_TYPES);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// ASCII control characters (0x00-0x1F) and DEL (0x7F). Built via the RegExp
// constructor so no literal control byte appears in this source file.
const CONTROL_CHARS = new RegExp("[\\x00-\\x1f\\x7f]", "g");

export function isReportReason(value: string): value is ReportReasonValue {
  return REASON_VALUES.has(value);
}

export function isReportTargetType(value: string): value is ReportTargetType {
  return TARGET_TYPES.has(value);
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function reportReasonLabel(value: string): string | null {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? null;
}

/**
 * Compose the human-readable reason stored on a report from a chosen category
 * and optional free-text detail. Returns null when the category is unknown, so
 * callers can reject the submission. Free text is trimmed and length-capped;
 * control characters are stripped to keep the moderation queue clean.
 */
export function buildReportReason(category: string, details?: string | null): string | null {
  const label = reportReasonLabel(category);
  if (!label) return null;
  const clean = cleanText(details, MAX_REPORT_DETAILS);
  return clean ? `${label} — ${clean}` : label;
}

/** Trim and cap an optional block reason; returns null when effectively empty. */
export function cleanBlockReason(reason?: string | null): string | null {
  return cleanText(reason, MAX_BLOCK_REASON);
}

function cleanText(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  // Replace control characters (incl. newlines and DEL) with spaces, then
  // collapse whitespace runs so the moderation queue stays on one readable line.
  const stripped = value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return null;
  return stripped.slice(0, max);
}
