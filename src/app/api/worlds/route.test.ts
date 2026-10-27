import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/worlds", () => {
  it("lists the heroes and the written worlds, and never the answers", async () => {
    const body = (await (await GET()).json()) as { id: string }[];
    const ids = body.map((world) => world.id);
    expect(ids).toContain("gatekeeper");
    expect(ids).toContain("dune-march");
    expect(ids).toContain("murmuration-sky");
    expect(ids).toContain("phantom-jam-ring-road");
    const text = JSON.stringify(body);
    expect(text).not.toContain("hiddenLaw");
    expect(text).not.toContain("answerKey");
    expect(text).not.toContain("pasting your text inside quotes");
  });
});
