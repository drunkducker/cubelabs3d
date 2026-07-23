import { describe, it, expect } from "vitest";
import { safeUrl, optionalSafeUrl, isSafeUrl, clampInt, oneOf, requireText, ValidationError } from "@/lib/admin/validation";

describe("URL safety", () => {
  it("accepts http/https", () => {
    expect(safeUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(isSafeUrl("http://a.b")).toBe(true);
  });

  it("rejects unsafe protocols", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html;base64,xxx")).toBe(false);
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
    expect(() => safeUrl("javascript:alert(1)")).toThrow(ValidationError);
  });

  it("optionalSafeUrl returns null for empty and validates non-empty", () => {
    expect(optionalSafeUrl("")).toBeNull();
    expect(() => optionalSafeUrl("ftp://x")).toThrow();
  });
});

describe("scalars", () => {
  it("clampInt bounds and falls back", () => {
    expect(clampInt("5", 0, 10, 1)).toBe(5);
    expect(clampInt("999", 0, 10, 1)).toBe(10);
    expect(clampInt("-3", 0, 10, 1)).toBe(0);
    expect(clampInt("abc", 0, 10, 7)).toBe(7);
  });

  it("oneOf restricts to the allowed set", () => {
    expect(oneOf("active", ["draft", "active"] as const, "draft")).toBe("active");
    expect(oneOf("evil", ["draft", "active"] as const, "draft")).toBe("draft");
  });

  it("requireText rejects empty", () => {
    expect(requireText("hello", "x")).toBe("hello");
    expect(() => requireText("   ", "Reason")).toThrow(ValidationError);
  });
});
