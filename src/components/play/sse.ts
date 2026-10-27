import type { ClientPipelineEvent, ClientStage } from "@/engine/client-event";
import { safeText } from "./http";

export const HERO_IDS = ["gatekeeper", "peppered-forest", "newtons-cannon", "rumour-town", "firebreak"] as const;

export type HeroId = (typeof HERO_IDS)[number];

const STAGES = new Set<ClientStage>(["scientist", "designer", "checker", "repair", "artist", "playtester", "done"]);

export function heroHref(id: string): string | null {
  return (HERO_IDS as readonly string[]).includes(id) ? `/w/${encodeURIComponent(id)}` : null;
}

export type MontageItem =
  | { type: "stage"; stage: ClientStage; message: string; notice?: string }
  | { type: "checks"; passed: number; total: number; notice?: string }
  | { type: "world"; id: string; title: string; tagline: string; concept: string; href: string | null; notice?: string }
  | { type: "choose"; message: string; worlds: { id: string; title: string; concept: string; href: string }[]; notice?: string }
  | { type: "error"; message: string; notice?: string };

export function isPipelineEvent(value: unknown): value is ClientPipelineEvent {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "stage" || type === "checks" || type === "world" || type === "choose" || type === "error";
}

function noticeOf(event: { source?: string; notice?: string }): string | undefined {
  if (event.source !== "sample") return undefined;
  return typeof event.notice === "string" && event.notice ? event.notice : undefined;
}

function readCard(spec: unknown): { id: string; title: string; tagline: string; concept: string } | null {
  if (!spec || typeof spec !== "object") return null;
  const raw = spec as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : "";
  const title = typeof raw.title === "string" ? safeText(raw.title) : "";
  const tagline = typeof raw.tagline === "string" ? safeText(raw.tagline) : "";
  const concept = typeof raw.concept === "string" ? safeText(raw.concept) : "";
  if (!id || !title) return null;
  return { id, title, tagline, concept };
}

/** Public montage only. Hidden-law fields are dropped even if a stream smuggles them. */
export function toMontageItem(event: ClientPipelineEvent): MontageItem | null {
  const notice = noticeOf(event);
  if (event.type === "stage") {
    const stage = STAGES.has(event.stage) ? event.stage : "designer";
    return { type: "stage", stage, message: safeText(event.message), notice };
  }
  if (event.type === "checks") {
    const passed = typeof event.passed === "number" ? event.passed : 0;
    const total = typeof event.total === "number" ? event.total : 0;
    return { type: "checks", passed, total, notice };
  }
  if (event.type === "world") {
    const card = readCard(event.spec);
    if (!card) return null;
    // Hero worlds, and generated worlds that were verified and saved to the shelf by the pipeline.
    return { type: "world", ...card, href: heroHref(card.id) ?? (/^[a-z0-9-]+$/.test(card.id) ? `/w/${card.id}` : null), notice };
  }
  if (event.type === "choose") {
    return {
      type: "choose",
      message: safeText(event.message),
      notice: event.notice || notice,
      worlds: (event.worlds ?? []).map((world) => ({
        id: world.id,
        title: safeText(world.title),
        concept: safeText(world.concept),
        href: `/w/${encodeURIComponent(world.id)}`,
      })),
    };
  }
  if (event.type === "error") return { type: "error", message: safeText(event.message), notice };
  return null;
}

export function drainSse(buffer: string): { events: ClientPipelineEvent[]; rest: string } {
  const events: ClientPipelineEvent[] = [];
  let rest = buffer.replace(/\r\n/g, "\n");
  while (true) {
    const idx = rest.indexOf("\n\n");
    if (idx === -1) break;
    const frame = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data || data === "[DONE]") continue;
    try {
      const parsed: unknown = JSON.parse(data);
      if (isPipelineEvent(parsed)) events.push(parsed);
    } catch {
      continue;
    }
  }
  return { events, rest };
}
