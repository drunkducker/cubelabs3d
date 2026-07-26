import { describe, it, expect } from "vitest";
import { ADMIN_TODO, todoCounts } from "@/lib/admin/todo";

describe("admin TODO checklist", () => {
  it("has unique ids", () => {
    const ids = ADMIN_TODO.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a label + note + valid status", () => {
    for (const item of ADMIN_TODO) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.note.trim().length).toBeGreaterThan(0);
      expect(["done", "partial", "pending"]).toContain(item.status);
    }
  });

  it("done items link to a real admin route", () => {
    for (const item of ADMIN_TODO) {
      if (item.status === "done") {
        expect(item.href, `done item ${item.id} needs an href`).toBeTruthy();
        expect(item.href!.startsWith("/admin"), `${item.id} href should live under /admin`).toBe(true);
      }
    }
  });

  it("counts add up to the total", () => {
    const c = todoCounts();
    expect(c.done + c.partial + c.pending).toBe(ADMIN_TODO.length);
  });

  it("covers every item from the operator's request", () => {
    const required = [
      "anticheat.review",
      "leaderboard.moderate",
      "tournaments",
      "premium.subs",
      "announcements",
      "security.logs",
      "audit.log",
      "cookie.banner",
      "legal.pages",
      "daily.challenge",
      "puzzle.rotation",
    ];
    const ids = ADMIN_TODO.map((i) => i.id);
    for (const r of required) expect(ids).toContain(r);
  });
});
