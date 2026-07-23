import { describe, it, expect } from "vitest";
import { redactValue } from "@/lib/admin/redact";

describe("audit redaction", () => {
  it("redacts sensitive keys by name", () => {
    const out = redactValue({ password: "hunter2", access_token: "abc", note: "ok" }) as Record<string, unknown>;
    expect(out.password).toBe("[REDACTED]");
    expect(out.access_token).toBe("[REDACTED]");
    expect(out.note).toBe("ok");
  });

  it("redacts nested sensitive keys", () => {
    const out = redactValue({ user: { refresh_token: "x", id: "1" } }) as { user: Record<string, unknown> };
    expect(out.user.refresh_token).toBe("[REDACTED]");
    expect(out.user.id).toBe("1");
  });

  it("redacts JWT-looking strings", () => {
    expect(redactValue("eyJhbGciOiJIUzI1NiJ9.payload.sig")).toBe("[REDACTED_TOKEN]");
  });

  it("passes through primitives and arrays", () => {
    expect(redactValue(42)).toBe(42);
    expect(redactValue(true)).toBe(true);
    expect(redactValue(["a", "b"])).toEqual(["a", "b"]);
  });

  it("caps recursion depth", () => {
    const deep: Record<string, unknown> = {};
    let cur = deep;
    for (let i = 0; i < 10; i++) {
      cur.next = {};
      cur = cur.next as Record<string, unknown>;
    }
    // should not throw and should truncate somewhere
    expect(() => redactValue(deep)).not.toThrow();
  });
});
