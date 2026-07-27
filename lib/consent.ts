/*
 * Cookie / storage consent model — single source of truth.
 *
 * Covers MASTER-CHECKLIST items P-006 (cookie inventory), P-007 (settings),
 * P-008 (consent banner / block nonessential before consent), and P-009
 * (honor Global Privacy Control).
 *
 * This module is import-safe from both server and client components: the pure
 * data (categories, inventory) has no runtime dependency, and every browser
 * access is guarded by `typeof`. The functions that read or write the decision
 * only do anything in the browser.
 */

export type ConsentCategory = "necessary" | "preferences" | "analytics" | "advertising";

/** Categories the user can toggle. `necessary` is always on and never listed here. */
export type OptionalCategory = Exclude<ConsentCategory, "necessary">;

export const OPTIONAL_CATEGORIES: OptionalCategory[] = ["preferences", "analytics", "advertising"];

export type ConsentCategories = Record<OptionalCategory, boolean>;

/**
 * Persisted decision. Kept intentionally small so it fits comfortably in a
 * cookie: `v` is the policy version (re-prompt on bump), `ts` the decision
 * time, `gpc` whether a Global Privacy Control signal was present when the
 * decision was recorded.
 */
export type ConsentRecord = {
  v: number;
  ts: number;
  gpc: boolean;
  categories: ConsentCategories;
};

/** Bump when the categories or their meaning change; forces a fresh decision. */
export const CONSENT_VERSION = 1;

export const CONSENT_COOKIE = "cl_consent";
/** Six months, a common re-confirmation window for cookie consent. */
export const CONSENT_MAX_AGE_DAYS = 180;

export type CategoryMeta = {
  id: ConsentCategory;
  title: string;
  required: boolean;
  summary: string;
};

export const CATEGORY_META: CategoryMeta[] = [
  {
    id: "necessary",
    title: "Strictly necessary",
    required: true,
    summary:
      "Security, authentication, session continuity, load balancing, and remembering your consent choice. These are always on because the site cannot function without them.",
  },
  {
    id: "preferences",
    title: "Preferences",
    required: false,
    summary:
      "Remembers choices such as theme, accessibility settings, cube preferences, and guest progress so the site feels the same on your next visit.",
  },
  {
    id: "analytics",
    title: "Analytics",
    required: false,
    summary:
      "Helps us understand page performance, feature usage, and crashes in aggregate so we can improve the product. No analytics run until you allow this.",
  },
  {
    id: "advertising",
    title: "Advertising & affiliate",
    required: false,
    summary:
      "Supports ad delivery, frequency limits, attribution, fraud prevention, and measuring affiliate referrals. No advertising or affiliate measurement runs until you allow this.",
  },
];

/**
 * Production cookie / local-storage inventory (P-006). Every first-party key
 * the app may store belongs here with its provider, purpose, category, and
 * retention. Add a row before enabling any new storage-writing provider.
 */
export type InventoryEntry = {
  name: string;
  provider: string;
  purpose: string;
  category: ConsentCategory;
  storage: "Cookie" | "Local storage" | "Session storage";
  duration: string;
};

export const COOKIE_INVENTORY: InventoryEntry[] = [
  {
    name: "cubelabs_access_token",
    provider: "Cube Lab 3D (Supabase auth)",
    purpose: "Signed-in session access token. Set only after you sign in.",
    category: "necessary",
    storage: "Cookie",
    duration: "Session (about 1 hour)",
  },
  {
    name: "cubelabs_refresh_token",
    provider: "Cube Lab 3D (Supabase auth)",
    purpose: "Renews your signed-in session without re-entering credentials.",
    category: "necessary",
    storage: "Cookie",
    duration: "Up to 30 days",
  },
  {
    name: "cl_consent",
    provider: "Cube Lab 3D",
    purpose: "Records your cookie consent choices so we do not ask on every page.",
    category: "necessary",
    storage: "Cookie",
    duration: `Up to ${CONSENT_MAX_AGE_DAYS} days`,
  },
];

/** All-off is the pre-consent default: nothing nonessential runs until opt-in. */
export function noOptionalConsent(): ConsentCategories {
  return { preferences: false, analytics: false, advertising: false };
}

export function allOptionalConsent(): ConsentCategories {
  return { preferences: true, analytics: true, advertising: true };
}

/**
 * Detect a Global Privacy Control signal in the browser (P-009). GPC is a
 * request to opt out of sale, sharing, and targeted advertising.
 */
export function detectGpc(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

function isValidRecord(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  if (typeof r.v !== "number" || typeof r.ts !== "number") return false;
  const c = r.categories as Record<string, unknown> | undefined;
  if (!c) return false;
  return OPTIONAL_CATEGORIES.every((k) => typeof c[k] === "boolean");
}

function readRawCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Read the stored decision on the client. Returns null when no decision has
 * been made or the stored policy version is older than the current one (which
 * means the banner should be shown again). Cookie is authoritative; local
 * storage is a fallback for environments that drop the cookie.
 */
export function readConsent(): ConsentRecord | null {
  let raw = readRawCookie();
  if (!raw && typeof localStorage !== "undefined") {
    try {
      raw = localStorage.getItem(CONSENT_COOKIE);
    } catch {
      raw = null;
    }
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!isValidRecord(parsed)) return null;
    if (parsed.v !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist a decision to both the cookie and local storage. */
export function writeConsent(categories: ConsentCategories, gpc: boolean): ConsentRecord {
  const record: ConsentRecord = {
    v: CONSENT_VERSION,
    ts: Date.now(),
    gpc,
    categories,
  };
  const raw = JSON.stringify(record);
  if (typeof document !== "undefined") {
    const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
    const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(raw)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(CONSENT_COOKIE, raw);
    } catch {
      /* storage may be unavailable; the cookie is the source of truth */
    }
  }
  return record;
}

/**
 * Whether a given category is currently permitted. `necessary` is always
 * allowed. Everything else fails closed: no stored decision means not allowed.
 * Safe to call from fire-and-forget client code (e.g. tracking beacons).
 */
export function consentAllows(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  const record = readConsent();
  if (!record) return false;
  return record.categories[category] === true;
}
