import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toPublic } from "@/engine/spec";
import { gatekeeperSpec } from "@/worlds/gatekeeper/spec";
import { listPublic, loadWorld, saveWorld } from "./worlds";

describe("world storage", () => {
  it("round-trips a spec in a temp directory and keeps the law out of the public form", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "wonderland-worlds-"));
    await saveWorld(gatekeeperSpec, dir);
    const loaded = await loadWorld(gatekeeperSpec.id, dir);
    expect(loaded.science.hiddenLaw).toBe(gatekeeperSpec.science.hiddenLaw);

    const pub = toPublic(loaded);
    const listed = await listPublic(dir);
    for (const view of [pub, listed[0]]) {
      expect(view).not.toHaveProperty("science");
      expect(view).not.toHaveProperty("checks");
      const blob = JSON.stringify(view);
      expect(blob).not.toContain("hiddenLaw");
      expect(blob).not.toContain(gatekeeperSpec.science.hiddenLaw);
      expect(blob).not.toContain("answerKey");
    }
    expect(listed.map((spec) => spec.id)).toEqual(["gatekeeper"]);
  });

  it("rejects ids that are not a safe slug and does not write them", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "wonderland-worlds-"));
    await expect(saveWorld({ ...gatekeeperSpec, id: "../secret" }, dir)).rejects.toThrow(/id/i);
    await expect(saveWorld({ ...gatekeeperSpec, id: "Nope" }, dir)).rejects.toThrow(/id/i);
    await expect(loadWorld("a/b", dir)).rejects.toThrow(/id/i);
    expect(await readdir(dir)).toEqual([]);
    expect(await listPublic(dir)).toEqual([]);
  });
});
