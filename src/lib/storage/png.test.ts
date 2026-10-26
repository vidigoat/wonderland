import { describe, expect, it } from "vitest";
import { decodePng, encodeRgbaPng } from "./png";

describe("png", () => {
  it("round-trips an RGBA image, including a transparent pixel", () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 0, 0, 0, 0, 128, 32, 200, 10, 20, 30, 255]);
    const decoded = decodePng(encodeRgbaPng({ width: 2, height: 2, rgba }));
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(2);
    expect([...decoded.rgba]).toEqual([...rgba]);
  });

  it("rejects a buffer that is not a PNG", () => {
    expect(() => decodePng(Buffer.from("not a png"))).toThrow(/PNG/);
  });
});
