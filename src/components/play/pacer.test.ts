import { describe, expect, it } from "vitest";
import { createMontagePacer } from "./pacer";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("montage pacing", () => {
  it("shows a burst on one turn when motion is reduced", async () => {
    const seen: string[] = [];
    const pacer = createMontagePacer({ gapMs: 0, onItem: (item: string) => seen.push(item) });
    pacer.push(["law", "room", "science"]);
    pacer.close();
    await pacer.finished;
    expect(seen).toEqual(["law", "room", "science"]);
  });

  it("lights one station at a time and keeps lines that arrive while it waits", async () => {
    const seen: string[] = [];
    let release: () => void = () => undefined;
    const pacer = createMontagePacer({
      gapMs: 420,
      onItem: (item: string) => seen.push(item),
      wait: () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    });
    pacer.push(["law", "room"]);
    await flush();
    expect(seen).toEqual(["law"]);
    pacer.push(["science"]);
    release();
    await flush();
    expect(seen).toEqual(["law", "room"]);
    release();
    await flush();
    expect(seen).toEqual(["law", "room", "science"]);
    pacer.close();
    await pacer.finished;
  });
});
