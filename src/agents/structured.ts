import { z } from "zod";
import { Archetype, Check } from "@/engine/spec";

/** What the scientist model must return. `law` stays on the server; the player sees ███. */
export const ScientistBrief = z.object({
  law: z.string(),
  plainStatement: z.string(),
  misconceptions: z.array(z.string()),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
  archetype: Archetype,
  checks: z.array(Check),
  refuse: z.boolean(),
  reason: z.string(),
});
export type ScientistBrief = z.infer<typeof ScientistBrief>;

/**
 * Turn a Zod schema into a JSON schema the model call can send.
 * Throws when Zod throws or the result is not a plain object schema — callers must not
 * replace that failure with a sample world.
 */
export function jsonSchemaFor(name: string, schema: z.ZodType): { name: string; schema: Record<string, unknown> } {
  const generated = z.toJSONSchema(schema) as Record<string, unknown>;
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(generated)) {
    if (key === "~standard") continue;
    rest[key] = value;
  }
  JSON.stringify(rest);
  if (rest.type !== "object" || rest.properties == null || typeof rest.properties !== "object") {
    throw new Error(`JSON schema for ${name} is not a usable object schema`);
  }
  return { name, schema: rest };
}
