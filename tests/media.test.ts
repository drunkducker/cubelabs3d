import { describe, it, expect } from "vitest";
import { detectImageType } from "@/lib/admin/image-detect";

function bytes(...b: number[]): Uint8Array {
  const arr = new Uint8Array(16);
  b.forEach((v, i) => (arr[i] = v));
  return arr;
}

describe("image magic-byte detection", () => {
  it("detects PNG", () => {
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("image/png");
  });
  it("detects JPEG", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff))).toBe("image/jpeg");
  });
  it("detects GIF", () => {
    expect(detectImageType(bytes(0x47, 0x49, 0x46, 0x38))).toBe("image/gif");
  });
  it("detects WebP (RIFF….WEBP)", () => {
    expect(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });
  it("rejects an HTML/script payload disguised as an image", () => {
    // "<script>" leading bytes — must not be accepted regardless of extension.
    expect(detectImageType(bytes(0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74))).toBeNull();
  });
  it("rejects too-short input", () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
});
