import { describe, expect, it } from "vitest";
import { z } from "zod";
import { WorldSpec } from "@/engine/spec";
import { jsonSchemaFor, ScientistBrief } from "./structured";

describe("json schema", () => {
  it("builds a usable object schema for the scientist and the world", () => {
    const scientist = jsonSchemaFor("ScientistBrief", ScientistBrief);
    const world = jsonSchemaFor("WorldSpec", WorldSpec);
    expect(scientist.name).toBe("ScientistBrief");
    expect(world.name).toBe("WorldSpec");
    expect(scientist.schema.type).toBe("object");
    expect(world.schema.type).toBe("object");
    expect(JSON.stringify(scientist.schema)).not.toContain("~standard");
    expect(JSON.stringify(world.schema)).not.toContain("~standard");
    const properties = scientist.schema.properties as Record<string, unknown>;
    for (const key of ["law", "plainStatement", "misconceptions", "sources", "archetype", "checks", "refuse", "reason"]) {
      expect(properties).toHaveProperty(key);
    }
  });

  it("lets an unusable schema throw", () => {
    expect(() => jsonSchemaFor("Bad", z.bigint())).toThrow();
  });
});
