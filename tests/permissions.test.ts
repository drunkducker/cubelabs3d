import { describe, it, expect } from "vitest";
import { hasPermission, permissionsForRole, isOwnerOnly, OWNER_ONLY } from "@/lib/admin/permissions";

describe("permission matrix", () => {
  it("owner has every permission, including owner-only", () => {
    expect(hasPermission("owner", "roles.manage")).toBe(true);
    expect(hasPermission("owner", "users.delete")).toBe(true);
    expect(hasPermission("owner", "migration.manage")).toBe(true);
    expect(hasPermission("owner", "admin.overview.read")).toBe(true);
  });

  it("admin cannot perform owner-only actions", () => {
    expect(hasPermission("admin", "roles.manage")).toBe(false);
    expect(hasPermission("admin", "users.delete")).toBe(false);
    expect(hasPermission("admin", "leaderboards.reset")).toBe(false);
    expect(hasPermission("admin", "migration.manage")).toBe(false);
  });

  it("admin can perform its granted permissions", () => {
    expect(hasPermission("admin", "users.suspend")).toBe(true);
    expect(hasPermission("admin", "ads.publish")).toBe(true);
    expect(hasPermission("admin", "content.manage")).toBe(true);
  });

  it("moderator is limited to moderation surfaces", () => {
    expect(hasPermission("moderator", "challenges.moderate")).toBe(true);
    expect(hasPermission("moderator", "leaderboards.moderate")).toBe(true);
    expect(hasPermission("moderator", "ads.manage")).toBe(false);
    expect(hasPermission("moderator", "users.delete")).toBe(false);
  });

  it("editor only touches content/ads", () => {
    expect(hasPermission("editor", "content.manage")).toBe(true);
    expect(hasPermission("editor", "ads.manage")).toBe(true);
    expect(hasPermission("editor", "users.read")).toBe(false);
  });

  it("support is minimal and analyst is read-only", () => {
    expect(hasPermission("support", "users.read")).toBe(true);
    expect(hasPermission("support", "users.suspend")).toBe(false);
    expect(hasPermission("analyst", "audit.read")).toBe(true);
    expect(hasPermission("analyst", "users.suspend")).toBe(false);
    expect(hasPermission("analyst", "ads.manage")).toBe(false);
  });

  it("null/undefined role has no permission (fail closed)", () => {
    expect(hasPermission(null, "admin.overview.read")).toBe(false);
    expect(hasPermission(undefined, "users.read")).toBe(false);
  });

  it("owner-only set is enforced globally", () => {
    for (const p of OWNER_ONLY) {
      expect(isOwnerOnly(p)).toBe(true);
      // no non-owner role may hold an owner-only permission
      for (const role of ["admin", "moderator", "editor", "support", "analyst"] as const) {
        expect(permissionsForRole(role)).not.toContain(p);
      }
    }
  });
});
