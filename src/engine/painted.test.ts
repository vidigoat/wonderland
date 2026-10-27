import { describe, expect, it } from "vitest";
import { PaintedArt } from "./spec";

describe("PaintedArt", () => {
  it("accepts local art files", () => {
    const art = { background: "/art/dune-march/background.webp", sprites: { leaderFirefly: "/art/firefly-sync-kuramoto/leaderFirefly.webp" } };
    expect(PaintedArt.parse(art)).toEqual(art);
  });

  it("rejects anything that is not a file under /art", () => {
    expect(() => PaintedArt.parse({ background: "https://example.com/x.webp", sprites: {} })).toThrow();
    expect(() => PaintedArt.parse({ sprites: { car: "/art/../secrets.webp" } })).toThrow();
    expect(() => PaintedArt.parse({ sprites: { car: "/art/ring/car.webp?x=1" } })).toThrow();
  });
});
