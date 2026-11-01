import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";

describe("GET /api/worlds", () => {
  it("lists the heroes and the written worlds, and never the answers", async () => {
    const body = (await (await GET(new Request("http://test/api/worlds"))).json()) as { id: string }[];
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

  it("returns one world by id, painted art and no answers, or 404", async () => {
    const one = (await (await GET(new Request("http://test/api/worlds?id=dune-march"))).json()) as { id: string; art: { painted?: unknown } };
    expect(one.id).toBe("dune-march");
    expect(one.art.painted).toBeTruthy();
    expect(JSON.stringify(one)).not.toContain("hiddenLaw");
    expect((await GET(new Request("http://test/api/worlds?id=nope"))).status).toBe(404);
  });
});
