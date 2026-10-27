import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readStudy, savePlay, saveStudy } from "./store";

describe("study storage", () => {
  it("keeps a test reply out of the real file", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "study-"));
    await saveStudy(
      { id: "11111111-1111-1111-1111-111111111111", arm: "read", choices: [1, 1, 1, 1], confidence: 5, test: true },
      dir,
    );
    await saveStudy(
      { id: "22222222-2222-2222-2222-222222222222", arm: "play", choices: [1, 0, 1, 1], confidence: 3, test: false },
      dir,
    );
    const real = await readStudy(dir);
    expect(real).toHaveLength(1);
    expect(real[0]?.correct).toBe(3);
    expect(real[0]?.test).toBe(false);
    const testFile = await readFile(path.join(dir, "test.jsonl"), "utf8");
    expect(testFile).toContain("11111111-1111-1111-1111-111111111111");
  });

  it("appends a play line without a name", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "plays-"));
    await savePlay({ worldId: "peppered-forest", firstCorrect: true, verdict: "warmer", transferCorrect: false, minutes: 4.5 }, dir);
    const text = await readFile(path.join(dir, "plays.jsonl"), "utf8");
    expect(text).toContain("peppered-forest");
    expect(text).not.toMatch(/name|email/i);
    await expect(savePlay({ worldId: "../x", firstCorrect: false, verdict: "colder", transferCorrect: false, minutes: 1 }, dir)).rejects.toThrow(/id/);
  });
});
