import { describe, expect, it } from "vitest";
import { posterCopy } from "./poster";

describe("share poster", () => {
  it("uses the public title and the room colour, and nothing else", () => {
    const copy = posterCopy({
      id: "firebreak",
      title: "The Firebreak",
      tagline: "A valley of saplings, a lightning strike, and a gap you can walk through.",
      archetype: "field",
    });
    expect(copy).toEqual({
      id: "firebreak",
      title: "The Firebreak",
      tagline: "A valley of saplings, a lightning strike, and a gap you can walk through.",
      motif: "field",
      room: "#12162a",
      ink: "#e7e2d4",
      accent: "#e07a3d",
      paper: "#1a2038",
    });
    expect(Object.keys(copy).sort()).toEqual(["accent", "id", "ink", "motif", "paper", "room", "tagline", "title"]);
  });

  it("paints each hero room and falls back without inventing a law", () => {
    expect(posterCopy({ id: "gatekeeper", title: "The Gatekeeper's Ledger", tagline: "The scribe copies.", archetype: "pipeline" }).room).toBe("#efe2c8");
    expect(posterCopy({ id: "peppered-forest", title: "Peppered Forest", tagline: "The moths followed.", archetype: "population" }).motif).toBe("population");
    expect(posterCopy({ id: "newtons-cannon", title: "Newton's Cannon", tagline: "Fire hard enough.", archetype: "bodies" }).ink).toBe("#efe6d4");
    expect(posterCopy({ id: "rumour-town", title: "Rumour Town", tagline: "One whisper.", archetype: "population" }).accent).toBe("#d98a4a");
    const unknown = posterCopy({ id: "made-up", title: "A new room", tagline: "Still hidden.", archetype: "bodies" });
    expect(unknown.motif).toBe("bodies");
    expect(unknown.room).toBe("#f3ead7");
    expect(JSON.stringify(unknown)).not.toMatch(/hiddenLaw|answerKey|science/);
  });
});
