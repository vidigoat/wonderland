import { describe, expect, it } from "vitest";
import { missKind, missSentence, suggestWorlds, wordOverlap } from "./suggest";

const shelf = [
  { id: "gatekeeper", title: "The Gatekeeper's Ledger", concept: "Why does SQL injection work?" },
  { id: "peppered-forest", title: "Peppered Forest", concept: "How does natural selection make camouflage?" },
  { id: "rumour-town", title: "Rumour Town", concept: "Why do bank runs happen to healthy banks?" },
];

describe("suggested questions", () => {
  it("ranks a world by shared words and keeps the order stable", () => {
    expect(wordOverlap("Why does SQL injection work?", "Why does SQL injection work?")).toBeGreaterThan(
      wordOverlap("Why does SQL injection work?", "How does natural selection make camouflage?"),
    );
    const picked = suggestWorlds("Why do banks fail when a rumour spreads?", shelf);
    expect(picked?.closest.id).toBe("rumour-town");
    expect(picked?.questions).toHaveLength(3);
    expect(picked?.questions[0]).toContain("bank");
    const meadow = suggestWorlds("Why do fireflies start flashing in sync?", [
      ...shelf,
      { id: "firefly-sync-kuramoto", title: "The Meadow That Blinks As One", concept: "Why do fireflies start flashing in sync?" },
    ]);
    expect(meadow?.closest.id).toBe("firefly-sync-kuramoto");
  });

  it("says why a question cannot become a world, in one sentence", () => {
    expect(missKind("refused: medical advice")).toBe("banned");
    expect(missKind("No verified world matched. The model did not write a new one.")).toBe("shelf");
    expect(missSentence("shelf")).toBe("The model did not write a new world. These questions already have one.");
    expect(missKind("3 checks failed")).toBe("failed");
    expect(missKind("Couldn't produce a world that passes its science checks, playability lint and honest-readings check.")).toBe("failed");
    expect(missKind("401 Unauthorized")).toBe("trouble");
    expect(missKind("You've built 3 worlds today, which is the daily share for each visitor.")).toBe("limit");
    expect(missSentence("banned")).toBe("Wonderland does not build that. It stays with how things work.");
    expect(missSentence("failed")).not.toMatch(/hiddenLaw|answer/i);
  });
});
