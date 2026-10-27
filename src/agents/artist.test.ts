import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";
import { decodePng, encodeRgbaPng } from "@/lib/storage/png";
import { heroWorlds } from "@/worlds";
import { rumourTownSpec } from "@/worlds/rumour-town/spec";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/meta", () => ({
  paint: vi.fn(),
  segment: vi.fn(),
}));

import { paint, segment } from "@/lib/ai/meta";
import { illustrate, segmentPrompts } from "./artist";

const KEY = "MODEL_API_KEY";
const previousKey = process.env[KEY];

afterEach(() => {
  if (previousKey === undefined) delete process.env[KEY];
  else process.env[KEY] = previousKey;
  vi.mocked(paint).mockReset();
  vi.mocked(segment).mockReset();
});

const SAMPLE_MARK = "<!-- sample art: not Muse Image output -->";

const SAMPLE_FILES: Record<string, string[]> = {
  gatekeeper: ["scribe.svg", "scroll.svg", "vault.svg", "background.svg"],
  "peppered-forest": ["moth.svg", "bird.svg", "background.svg"],
  "newtons-cannon": ["cannon.svg", "planet.svg", "background.svg"],
  "rumour-town": ["citizen.svg", "citizen-queue.svg", "bank.svg", "background.svg"],
  firebreak: ["tree.svg", "flame.svg", "background.svg"],
};

describe("illustrate sample lane", () => {
  it("returns labeled handmade urls and does not call Muse or SAM", async () => {
    delete process.env[KEY];
    const rumour = heroWorlds.find((world) => world.id === "rumour-town");
    expect(rumour).toBeTruthy();
    await expect(illustrate(rumour!)).resolves.toEqual({
      source: "sample",
      notice: SAMPLE_NOTICE,
      sprites: {
        citizen: "/art/rumour-town/citizen.svg",
        bank: "/art/rumour-town/bank.svg",
        "citizen-queue": "/art/rumour-town/citizen-queue.svg",
      },
      background: "/art/rumour-town/background.svg",
    });
    expect(paint).not.toHaveBeenCalled();
    expect(segment).not.toHaveBeenCalled();

    for (const world of heroWorlds) {
      const art = await illustrate(world);
      expect(art.source).toBe("sample");
      expect(art.notice).toBe(SAMPLE_NOTICE);
      expect(art.background).toBe(`/art/${world.id}/background.svg`);
      for (const entity of world.entities) expect(art.sprites[entity.id]).toBe(`/art/${world.id}/${entity.id}.svg`);
      for (const file of SAMPLE_FILES[world.id] ?? []) {
        const text = await readFile(path.join(process.cwd(), "public", "art", world.id, file), "utf8");
        expect(text.startsWith(`${SAMPLE_MARK}\n`)).toBe(true);
        expect(text).toContain("<svg");
        expect(text).not.toMatch(/model output/i);
        if (file === "background.svg") expect(text).toContain("<rect");
      }
    }
  });

  it("rejects an unsafe id", async () => {
    delete process.env[KEY];
    const world = heroWorlds[0]!;
    await expect(illustrate({ ...world, id: "../nope" })).rejects.toThrow(/id/i);
    expect(paint).not.toHaveBeenCalled();
  });
});

describe("illustrate live lane", () => {
  const rgba = new Uint8Array(4 * 3 * 4);
  const put = (x: number, y: number, r: number, g: number, b: number) => {
    const index = (y * 4 + x) * 4;
    rgba[index] = r;
    rgba[index + 1] = g;
    rgba[index + 2] = b;
    rgba[index + 3] = 255;
  };
  put(0, 0, 220, 20, 20);
  put(1, 0, 20, 180, 40);
  put(2, 0, 20, 40, 200);
  put(3, 0, 250, 250, 250);
  put(2, 1, 70, 80, 90);
  put(3, 1, 100, 110, 120);
  put(0, 2, 1, 2, 3);
  put(2, 2, 7, 8, 9);
  const png = encodeRgbaPng({ width: 4, height: 3, rgba });
  const b64 = png.toString("base64");
  const maskLine =
    "<0f>0<|box;x1=0;y1=0;x2=3;y2=2;w=4;h=3|><|mask;x=0;y=0;data=3,4,!!!!!'eq8{+dc|>";

  it("paints, segments, and writes a transparent PNG", async () => {
    process.env[KEY] = "present";
    const calls: string[] = [];
    vi.mocked(paint).mockImplementation(async () => {
      calls.push("paint");
      return [b64];
    });
    vi.mocked(segment).mockImplementation(async (opts) => {
      calls.push(`segment:${opts.prompt}`);
      expect(opts.imageUrl.startsWith("data:image/png;base64,")).toBe(true);
      return maskLine;
    });
    const dir = await mkdtemp(path.join(tmpdir(), "wonderland-art-"));
    const art = await illustrate(rumourTownSpec, dir);
    expect(art.source).toBe("live");
    expect(art.notice).toBeUndefined();
    expect(art.background).toBe("/art/rumour-town/background.png");
    expect(art.sprites.citizen).toBe("/art/rumour-town/citizen.png");
    expect(art.sprites.bank).toBe("/art/rumour-town/bank.png");
    expect(art.sprites["citizen-queue"]).toBe(art.sprites.citizen);
    expect(calls).toEqual(["paint", "paint", "segment:person", "paint", "segment:building"]);

    const cut = decodePng(await readFile(path.join(dir, "rumour-town", "citizen.png")));
    expect(cut.width).toBe(4);
    expect(cut.height).toBe(3);
    const pixel = (x: number, y: number) => [...cut.rgba.slice((y * 4 + x) * 4, (y * 4 + x) * 4 + 4)];
    expect(pixel(0, 0)).toEqual([220, 20, 20, 255]);
    expect(pixel(2, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(2, 1)).toEqual([70, 80, 90, 255]);
    expect(pixel(1, 2)).toEqual([0, 0, 0, 0]);
  });

  it("rethrows a live failure and does not return sample art", async () => {
    process.env[KEY] = "present";
    vi.mocked(paint).mockRejectedValue(new Error("muse down"));
    const dir = await mkdtemp(path.join(tmpdir(), "wonderland-art-"));
    await expect(illustrate(rumourTownSpec, dir)).rejects.toThrow("muse down");
    expect(segment).not.toHaveBeenCalled();

    vi.mocked(paint).mockResolvedValue([b64]);
    vi.mocked(segment).mockRejectedValue(new Error("sam down"));
    await expect(illustrate(rumourTownSpec, dir)).rejects.toThrow("sam down");
  });
});

describe("segmentPrompts", () => {
  it("shortens a long phrase down to its noun", () => {
    expect(segmentPrompts("person seen from above walking east")).toEqual(["person seen from above walking east", "person"]);
    expect(segmentPrompts("glowing firefly body with light")).toEqual(["glowing firefly body with light", "glowing firefly body", "body", "glowing"]);
    expect(segmentPrompts("hare silhouette")).toEqual(["hare silhouette", "silhouette", "hare"]);
    expect(segmentPrompts("hare")).toEqual(["hare"]);
  });
});

