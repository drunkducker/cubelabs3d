export const AGE_BANDS = ["under_13", "13_17", "18_plus"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export type AgeScreeningOutcome =
  | "blocked_parent_path"
  | "teen_defaults"
  | "standard_account";

export function evaluateAgeBand(value: string): {
  ageBand: AgeBand;
  outcome: AgeScreeningOutcome;
  canCreateAccount: boolean;
  defaultProfileVisibility: "private" | "public";
} {
  if (!AGE_BANDS.includes(value as AgeBand)) {
    throw new Error("Choose an age range before continuing.");
  }

  const ageBand = value as AgeBand;
  if (ageBand === "under_13") {
    return {
      ageBand,
      outcome: "blocked_parent_path",
      canCreateAccount: false,
      defaultProfileVisibility: "private",
    };
  }

  if (ageBand === "13_17") {
    return {
      ageBand,
      outcome: "teen_defaults",
      canCreateAccount: true,
      defaultProfileVisibility: "private",
    };
  }

  return {
    ageBand,
    outcome: "standard_account",
    canCreateAccount: true,
    defaultProfileVisibility: "public",
  };
}

export function privacyDeadlineDays(jurisdiction?: string | null): number {
  const normalized = (jurisdiction ?? "").trim().toUpperCase();
  return ["EU", "EEA", "UK"].includes(normalized) ? 30 : 45;
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export type AvatarValidation = {
  ok: boolean;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  error?: string;
};

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export function validateAvatarBytes(
  bytes: Uint8Array,
  claimedType: string,
): AvatarValidation {
  if (!bytes.length) return { ok: false, error: "Choose an image first." };
  if (bytes.length > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Avatar must be 3 MB or smaller." };
  }

  const detected = detectStaticImageType(bytes);
  if (!detected) {
    return { ok: false, error: "Use a JPEG, PNG, or WebP image." };
  }
  if (claimedType && claimedType !== detected) {
    return { ok: false, error: "The file content does not match its image type." };
  }

  return { ok: true, mimeType: detected };
}

function detectStaticImageType(
  bytes: Uint8Array,
): AvatarValidation["mimeType"] | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function safeStorageSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120);
}

export function isDestructiveRequest(requestType: string): boolean {
  return ["close_account", "delete_data", "anonymize"].includes(requestType);
}
