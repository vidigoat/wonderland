import { describe, expect, it } from "vitest";
import { readSeedQuery, withSeed } from "./session";

describe("session seed", () => {
  it("reads a seed from the address and refuses anything else", () => {
    expect(readSeedQuery("?seed=42")).toBe(42);
    expect(readSeedQuery("?other=1&seed=7")).toBe(7);
    expect(readSeedQuery("")).toBeNull();
    expect(readSeedQuery("?seed=0")).toBeNull();
    expect(readSeedQuery("?seed=-3")).toBeNull();
    expect(readSeedQuery("?seed=1.5")).toBeNull();
    expect(readSeedQuery("?seed=1000000001")).toBeNull();
  });

  it("names the seed without dropping the server notice", () => {
    expect(withSeed("Shared with Ada.", 42)).toBe("Shared with Ada. Seed 42.");
    expect(withSeed("Seed 42. This page asked for it.", 42)).toBe("Seed 42. This page asked for it.");
    expect(withSeed(null, 3)).toBe("Seed 3.");
  });
});
