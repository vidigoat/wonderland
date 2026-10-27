import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { heroWorlds } from "@/worlds";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";
import { generateSample, heroChoices, matchHeroId, type SampleEvent } from "./sample-match";

describe("hero keyword match", () => {
  it.each([
    ["Why does SQL injection work?", "gatekeeper"],
    ["the ledger", "gatekeeper"],
    ["Gatekeeper", "gatekeeper"],
    ["How does natural selection produce camouflage?", "peppered-forest"],
    ["moths", "peppered-forest"],
    ["Peppered Forest", "peppered-forest"],
    ["How do orbits work?", "newtons-cannon"],
    ["gravity", "newtons-cannon"],
    ["Newton's Cannon", "newtons-cannon"],
    ["Why do bank runs happen?", "rumour-town"],
    ["a rumor", "rumour-town"],
    ["deposit insurance", "rumour-town"],
    ["Why does one spark take the valley?", "firebreak"],
    ["percolation", "firebreak"],
    ["The Firebreak", "firebreak"],
    ["Why do traffic jams appear out of nowhere?", null],
    ["How does DNS turn a name into an address?", null],
  ] as const)("%s → %s", (concept, id) => {
    expect(matchHeroId(concept)).toBe(id);
  });

  it("prefers the hero with more keyword hits, and the earlier hero on a tie", () => {
    expect(matchHeroId("orbit gravity cannon fire")).toBe("newtons-cannon");
    expect(matchHeroId("bank fire")).toBe("rumour-town");
    expect(matchHeroId("cannon spark")).toBe("newtons-cannon");
  });

  it("lists the five heroes without their science", () => {
    const choices = heroChoices();
    expect(choices.map((world) => world.id)).toEqual([
      "gatekeeper",
      "peppered-forest",
      "newtons-cannon",
      "rumour-town",
      "firebreak",
    ]);
    const blob = JSON.stringify(choices);
    for (const hero of heroWorlds) {
      expect(blob).not.toContain(hero.science.hiddenLaw);
      expect(blob).not.toContain(hero.science.plainStatement);
    }
  });
});

describe("sample generation", () => {
  it("does not import the model client", () => {
    const source = readFileSync(new URL("./sample-match.ts", import.meta.url), "utf8");
    expect(source).not.toContain("@/lib/ai/meta");
    expect(source).not.toContain("think(");
  });

  it("runs real checks for a match and labels the stand-in", async () => {
    const concept = "Why does SQL injection work?";
    const fetchMock = vi.fn(() => {
      throw new Error("sample path called the network");
    });
    vi.stubGlobal("fetch", fetchMock);
    const events: SampleEvent[] = [];
    try {
      for await (const event of generateSample(concept)) events.push(event);
    } finally {
      vi.unstubAllGlobals();
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(events.every((event) => event.source === "sample")).toBe(true);
    const hero = heroWorlds.find((world) => world.id === "gatekeeper");
    if (!hero) throw new Error("missing gatekeeper");
    for (const event of events) {
      expect(event.notice.startsWith(SAMPLE_NOTICE)).toBe(true);
      expect(event.notice).toContain(concept);
      expect(event.notice).toContain(hero.title);
      expect(event.notice.toLowerCase()).toContain("model did not write");
      expect(event.notice).not.toContain(hero.science.hiddenLaw);
      expect(event.notice).not.toContain(hero.science.plainStatement);
      if (event.type === "stage" || event.type === "error" || event.type === "choose") {
        expect(event.message).not.toContain(hero.science.hiddenLaw);
        expect(event.message).not.toContain(hero.science.plainStatement);
      }
    }
    const world = events.find((event) => event.type === "world");
    const checks = events.find((event) => event.type === "checks");
    expect(world && world.type === "world" ? world.spec.id : "").toBe("gatekeeper");
    expect(checks && checks.type === "checks" ? checks.results.every((result) => result.passed) : false).toBe(true);
    expect(events.some((event) => event.type === "choose")).toBe(false);
    expect(events.filter((event) => event.type !== "art").map((event) => event.type)).toEqual([
      "stage",
      "stage",
      "stage",
      "checks",
      "stage",
      "world",
      "stage",
    ]);
    expect(events.some((event) => event.type === "art" && event.background?.includes("background"))).toBe(true);
  });

  it("asks for a hero on no match and does not invent a spec", async () => {
    const concept = "Why do traffic jams appear out of nowhere?";
    const events: SampleEvent[] = [];
    for await (const event of generateSample(concept)) events.push(event);
    expect(events.map((event) => event.type)).toEqual(["stage", "choose"]);
    const choose = events[1];
    if (choose?.type !== "choose") throw new Error("expected choose");
    expect(choose.source).toBe("sample");
    expect(choose.notice.startsWith(SAMPLE_NOTICE)).toBe(true);
    expect(choose.notice).toContain(concept);
    expect(choose.notice.toLowerCase()).toContain("model did not write");
    expect(choose.worlds).toEqual(heroChoices());
    expect(events.some((event) => event.type === "world")).toBe(false);
  });
});
