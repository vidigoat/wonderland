import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { heroWorlds } from "./index";
import { standardOf } from "./standards";

describe("curriculum standards", () => {
  it("places every hand-built and committed world", () => {
    const committed = readdirSync(path.join(process.cwd(), "data", "worlds"))
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""));
    for (const id of [...heroWorlds.map((world) => world.id), ...committed]) expect(standardOf(id), id).not.toBeNull();
  });

  it("leaves a new world unplaced rather than guessing", () => {
    expect(standardOf("world-1234")).toBeNull();
  });

  it("only uses codes in the NGSS or CSTA shape", () => {
    for (const world of heroWorlds) {
      const code = standardOf(world.id)?.code;
      if (code) expect(code).toMatch(/^(MS-(LS|PS|ESS)\d-\d|CSTA \d-[A-Z]+-\d{2})$/);
    }
  });
});
