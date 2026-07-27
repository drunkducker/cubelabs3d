import { describe, expect, it } from "vitest";
import {
  MAX_BLOCK_REASON,
  MAX_REPORT_DETAILS,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  buildReportReason,
  cleanBlockReason,
  isReportReason,
  isReportTargetType,
  isUuid,
} from "@/lib/safety";

describe("report reason building", () => {
  it("rejects unknown categories", () => {
    expect(buildReportReason("not-a-reason")).toBeNull();
    expect(buildReportReason("")).toBeNull();
  });

  it("uses the category label alone when no detail is given", () => {
    expect(buildReportReason("spam")).toBe("Spam or unwanted contact");
    expect(buildReportReason("spam", "   ")).toBe("Spam or unwanted contact");
  });

  it("appends trimmed detail text", () => {
    expect(buildReportReason("harassment", "  targeted DMs ")).toBe(
      "Harassment or bullying — targeted DMs",
    );
  });

  it("strips control characters and collapses whitespace", () => {
    const messy = "line one\nline\ttwo";
    expect(buildReportReason("other", messy)).toBe("Something else — line one line two");
  });

  it("caps detail length", () => {
    const long = "x".repeat(MAX_REPORT_DETAILS + 250);
    const built = buildReportReason("other", long) ?? "";
    // "Something else — " prefix plus exactly MAX_REPORT_DETAILS detail chars.
    expect(built.endsWith("x")).toBe(true);
    expect(built.length).toBe("Something else — ".length + MAX_REPORT_DETAILS);
  });

  it("recognizes every catalogued reason value", () => {
    for (const reason of REPORT_REASONS) {
      expect(isReportReason(reason.value)).toBe(true);
    }
    expect(isReportReason("bogus")).toBe(false);
  });
});

describe("target types", () => {
  it("accepts catalogued target types and rejects others", () => {
    for (const target of REPORT_TARGET_TYPES) {
      expect(isReportTargetType(target)).toBe(true);
    }
    expect(isReportTargetType("password")).toBe(false);
  });
});

describe("block reason cleaning", () => {
  it("returns null for empty input", () => {
    expect(cleanBlockReason(null)).toBeNull();
    expect(cleanBlockReason("")).toBeNull();
    expect(cleanBlockReason("   ")).toBeNull();
  });

  it("trims, collapses, and caps", () => {
    expect(cleanBlockReason("  keeps  spamming me ")).toBe("keeps spamming me");
    expect((cleanBlockReason("y".repeat(MAX_BLOCK_REASON + 50)) ?? "").length).toBe(MAX_BLOCK_REASON);
  });
});

describe("uuid guard", () => {
  it("accepts a v4-shaped id and rejects junk", () => {
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
    expect(isUuid(" 3f2504e0-4f89-41d3-9a0c-0305e82c3301 ")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301; drop table")).toBe(false);
  });
});
