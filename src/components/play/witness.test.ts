import { describe, expect, it } from "vitest";
import { witnessLine } from "./witness";

describe("witness", () => {
  it("names a visible change and stays quiet when nothing new happened", () => {
    expect(witnessLine("gatekeeper", { vaultOpen: "shut", scribeError: "ok" }, { vaultOpen: "open", scribeError: "ok" })).toBe("The vault is open.");
    expect(witnessLine("gatekeeper", { vaultOpen: "open" }, { vaultOpen: "open" })).toBeNull();
    expect(witnessLine("gatekeeper", null, { vaultOpen: "open" })).toBeNull();
    expect(witnessLine("newtons-cannon", { status: "flying", laps: 0.1 }, { status: "flying", laps: 0.6 })).toBe("It has not come down.");
    expect(witnessLine("rumour-town", { bank: "open" }, { bank: "collapsed" })).toBe("The bank has closed its doors.");
    expect(witnessLine("firebreak", { crossing: "no" }, { crossing: "yes" })).toBe("The far ridge is burning.");
    expect(witnessLine("peppered-forest", { meanDarkness: 0.2 }, { meanDarkness: 0.4 })).toBe("The moths are not the colour they were.");
  });

  it("does not smuggle a mechanism into the line", () => {
    const lines = [
      witnessLine("gatekeeper", { vaultOpen: "shut" }, { vaultOpen: "open" }),
      witnessLine("gatekeeper", { scribeError: "ok" }, { scribeError: "error" }),
      witnessLine("newtons-cannon", { status: "flying" }, { status: "escaped" }),
      witnessLine("firebreak", { crossing: "no" }, { crossing: "yes" }),
    ];
    for (const line of lines) {
      expect(line?.toLowerCase()).not.toMatch(/inject|quote|parameter|percolat|gravity|orbit|insurance/);
    }
  });
});
