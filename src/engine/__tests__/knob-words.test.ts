import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("generated controls", () => {
  it("names every slider in sentence case, with no unit tucked in parentheses", () => {
    const files = readdirSync("data/worlds").filter((name) => name.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const spec = JSON.parse(readFileSync(`data/worlds/${file}`, "utf8")) as { knobs: { label: string; hint?: string }[] };
      for (const knob of spec.knobs) {
        expect(knob.label, file).not.toMatch(/[()]/);
        const later = knob.label.split(" ").slice(1).filter((word) => /^[A-Z][a-z]/.test(word));
        expect(later, `${file}: ${knob.label}`).toEqual([]);
        if (knob.hint) expect(knob.hint[0], `${file}: ${knob.hint}`).toMatch(/[A-Z]/);
      }
    }
  });
});
