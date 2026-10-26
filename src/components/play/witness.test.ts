import { describe, expect, it } from "vitest";
import { rememberSeen, seenOnCard, witnessBeat, witnessLine } from "./witness";

describe("witness", () => {
  it("names a visible change and stays quiet when nothing new happened", () => {
    expect(witnessLine("gatekeeper", { vaultOpen: "shut", scribeError: "ok" }, { vaultOpen: "open", scribeError: "ok" })).toBe("The vault is open.");
    expect(witnessLine("gatekeeper", { vaultOpen: "open" }, { vaultOpen: "open" })).toBeNull();
    expect(witnessLine("gatekeeper", null, { vaultOpen: "open" })).toBeNull();
    expect(witnessLine("newtons-cannon", { status: "flying", laps: 0.1 }, { status: "flying", laps: 0.6 })).toBe("It has not come down.");
    expect(witnessLine("rumour-town", { bank: "open" }, { bank: "collapsed" })).toBe("The bank has closed its doors.");
    expect(witnessLine("firebreak", { crossing: "no" }, { crossing: "yes" })).toBe("The far ridge is burning.");
    expect(witnessLine("firebreak", { crossing: "no", stillBurning: "yes", burnedShare: 0.1 }, { crossing: "no", stillBurning: "no", burnedShare: 0.49 })).toBe("The fire stopped.");
    expect(witnessLine("firebreak", { crossing: "no", stillBurning: "no", burnedShare: 0 }, { crossing: "no", stillBurning: "no", burnedShare: 0 })).toBeNull();
    expect(witnessLine("peppered-forest", { meanDarkness: 0.2 }, { meanDarkness: 0.4 })).toBeNull();
    expect(witnessLine("peppered-forest", { meanDarkness: 0.2 }, { meanDarkness: 0.7 })).toBe("The moths are not the colour they were.");
  });

  it("keeps the lines you saw, and does not repeat one", () => {
    const once = rememberSeen([], "The vault is open.");
    const twice = rememberSeen(once, "The vault is open.");
    const both = rememberSeen(twice, "The scribe stopped.");
    expect(both).toEqual(["The vault is open.", "The scribe stopped."]);
    expect(seenOnCard(both)).toBe("The vault is open. The scribe stopped.");
    expect(seenOnCard([])).toBeNull();
    expect(rememberSeen(["a", "b", "c"], "d")).toEqual(["b", "c", "d"]);
  });

  it("gives each spoken line a stage beat and ignores anything else", () => {
    const spoken = [
      witnessLine("gatekeeper", { vaultOpen: "shut" }, { vaultOpen: "open" }),
      witnessLine("gatekeeper", { scribeError: "ok" }, { scribeError: "error" }),
      witnessLine("newtons-cannon", { status: "flying", laps: 0.2 }, { status: "escaped", laps: 0.2 }),
      witnessLine("newtons-cannon", { status: "flying", laps: 0.2 }, { status: "landed", laps: 0.2 }),
      witnessLine("newtons-cannon", { status: "flying", laps: 0.2 }, { status: "flying", laps: 0.6 }),
      witnessLine("rumour-town", { bank: "open" }, { bank: "collapsed" }),
      witnessLine("firebreak", { crossing: "no" }, { crossing: "yes" }),
      witnessLine("firebreak", { crossing: "no", stillBurning: "yes", burnedShare: 0.2 }, { crossing: "no", stillBurning: "no", burnedShare: 0.4 }),
      witnessLine("peppered-forest", { meanDarkness: 0.1 }, { meanDarkness: 0.7 }),
    ];
    expect(spoken.map(witnessBeat)).toEqual(["vault", "halt", "leave", "land", "orbit", "bank", "ridge", "held", "moths"]);
    expect(witnessBeat(null)).toBeNull();
    expect(witnessBeat("Ada's reading is not yours.")).toBe("race");
    expect(witnessBeat("quotes end the string")).toBeNull();
  });

  it("does not smuggle a mechanism into the line", () => {
    const lines = [
      witnessLine("gatekeeper", { vaultOpen: "shut" }, { vaultOpen: "open" }),
      witnessLine("gatekeeper", { scribeError: "ok" }, { scribeError: "error" }),
      witnessLine("newtons-cannon", { status: "flying" }, { status: "escaped" }),
      witnessLine("firebreak", { crossing: "no" }, { crossing: "yes" }),
      witnessLine("firebreak", { crossing: "no", stillBurning: "yes", burnedShare: 0.2 }, { crossing: "no", stillBurning: "no", burnedShare: 0.49 }),
    ];
    for (const line of lines) {
      expect(line?.toLowerCase()).not.toMatch(/inject|quote|parameter|percolat|gravity|orbit|insurance/);
    }
  });
});
