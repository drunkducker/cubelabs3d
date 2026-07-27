import { describe, expect, it } from "vitest";
import {
  CATEGORY_META,
  COOKIE_INVENTORY,
  OPTIONAL_CATEGORIES,
  allOptionalConsent,
  consentAllows,
  detectGpc,
  noOptionalConsent,
  readConsent,
} from "@/lib/consent";

/*
 * Runs in the node environment (no DOM), so this exercises the pure model and
 * the fail-closed defaults that matter for compliance: with no browser storage
 * present, nothing nonessential may run.
 */

describe("consent defaults", () => {
  it("treats necessary cookies as always allowed", () => {
    expect(consentAllows("necessary")).toBe(true);
  });

  it("fails closed for every optional category with no stored decision", () => {
    expect(readConsent()).toBeNull();
    for (const category of OPTIONAL_CATEGORIES) {
      expect(consentAllows(category)).toBe(false);
    }
  });

  it("reports no Global Privacy Control signal without a navigator", () => {
    expect(detectGpc()).toBe(false);
  });

  it("builds all-off and all-on optional sets", () => {
    expect(noOptionalConsent()).toEqual({ preferences: false, analytics: false, advertising: false });
    expect(allOptionalConsent()).toEqual({ preferences: true, analytics: true, advertising: true });
  });
});

describe("consent metadata", () => {
  it("marks exactly the necessary category as required", () => {
    const required = CATEGORY_META.filter((m) => m.required).map((m) => m.id);
    expect(required).toEqual(["necessary"]);
  });

  it("lists every optional category in metadata and nothing more", () => {
    const optionalMeta = CATEGORY_META.filter((m) => !m.required).map((m) => m.id).sort();
    expect(optionalMeta).toEqual([...OPTIONAL_CATEGORIES].sort());
  });

  it("gives every inventory entry a known category and complete fields", () => {
    const validCategories = new Set(CATEGORY_META.map((m) => m.id));
    expect(COOKIE_INVENTORY.length).toBeGreaterThan(0);
    for (const entry of COOKIE_INVENTORY) {
      expect(validCategories.has(entry.category)).toBe(true);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.provider.length).toBeGreaterThan(0);
      expect(entry.purpose.length).toBeGreaterThan(0);
      expect(entry.duration.length).toBeGreaterThan(0);
    }
  });
});
