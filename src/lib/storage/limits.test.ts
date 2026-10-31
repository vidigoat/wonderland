import { describe, expect, it } from "vitest";
import { admit, visitorKey } from "./limits";

describe("fair use", () => {
  it("lets a visitor build up to their share, then says why not", () => {
    let day = { total: 0, byVisitor: {} as Record<string, number> };
    for (let i = 0; i < 2; i++) {
      const decided = admit(day, "a", 2, 10);
      expect(decided.refusal).toBeNull();
      day = decided.day;
    }
    expect(admit(day, "a", 2, 10).refusal).toContain("daily share");
    expect(admit(day, "b", 2, 10).refusal).toBeNull();
  });

  it("stops everyone once the site's daily total is reached", () => {
    expect(admit({ total: 10, byVisitor: {} }, "a", 3, 10).refusal).toContain("budget is used up");
  });

  it("never keeps the address itself", () => {
    const key = visitorKey(new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } }));
    expect(key).toMatch(/^[0-9a-f]{16}$/);
    expect(key).not.toContain("203");
  });
});
