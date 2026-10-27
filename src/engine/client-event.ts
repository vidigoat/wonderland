import type { CheckResult } from "./checks";
import { toPublic, type PublicWorldSpec, type WorldSpec } from "./spec";
import type { DataSource } from "@/lib/samples/mark";

/**
 * Events that are allowed to cross to the browser.
 * Science, answer keys, and measured check details stay on the server.
 */

export type ClientStage = "scientist" | "designer" | "checker" | "repair" | "artist" | "playtester" | "done";

export type ArtPiece = { background?: string; sprite?: { id: string; url: string } };

export type ClientPipelineEvent =
  | { type: "stage"; stage: ClientStage; message: string; source?: DataSource; notice?: string }
  | { type: "checks"; results: { id: string; passed: boolean }[]; passed: number; total: number; source?: DataSource; notice?: string }
  | { type: "world"; spec: PublicWorldSpec; source?: DataSource; notice?: string }
  | { type: "art"; background?: string; sprite?: { id: string; url: string }; source?: DataSource; notice?: string }
  | { type: "choose"; message: string; worlds: { id: string; title: string; concept: string }[]; source: "sample"; notice: string }
  | { type: "error"; message: string; source?: DataSource; notice?: string };

type Incoming = {
  type: string;
  stage?: ClientStage;
  message?: string;
  results?: CheckResult[];
  spec?: WorldSpec;
  worlds?: { id: string; title: string; concept: string }[];
  background?: unknown;
  sprite?: unknown;
  source?: DataSource;
  notice?: string;
};

const ART_FILE = /^\/art\/[a-z0-9-]+\/[A-Za-z0-9-]+\.(webp|png|jpg|svg)$/;
const SPRITE_ID = /^[A-Za-z][A-Za-z0-9-]*$/;

/** A painting or a cut-out. Anything that is not a local art URL is dropped. */
export function readArtPiece(input: { background?: unknown; sprite?: unknown }): ArtPiece | null {
  const piece: ArtPiece = {};
  if (typeof input.background === "string" && ART_FILE.test(input.background)) piece.background = input.background;
  if (input.sprite && typeof input.sprite === "object") {
    const id = (input.sprite as { id?: unknown }).id;
    const url = (input.sprite as { url?: unknown }).url;
    if (typeof id === "string" && SPRITE_ID.test(id) && typeof url === "string" && ART_FILE.test(url)) {
      piece.sprite = { id, url };
    }
  }
  return piece.background || piece.sprite ? piece : null;
}

const LAW_LEAK = /hiddenLaw|answerKey|plainStatement/;

export function scrubClientText(text: string): string {
  if (LAW_LEAK.test(text)) return "That detail stays on the server.";
  return text.slice(0, 400);
}

function assertPublic(spec: WorldSpec, pub: PublicWorldSpec) {
  const blob = JSON.stringify(pub);
  if (LAW_LEAK.test(blob)) throw new Error("Refusing to stream a world event that names hidden fields");
  const law = spec.science.hiddenLaw;
  if (law.length > 24 && blob.includes(law)) throw new Error("Refusing to stream a world that still contains the hidden law");
  const answers = [spec.transfer.answerKey, ...spec.predictions.map((p) => p.answerKey)];
  for (const key of answers) {
    if (typeof key === "string" && key.length > 24 && blob.includes(key)) {
      throw new Error("Refusing to stream a world that still contains an answer");
    }
  }
}

/** Strip anything the player must discover themselves. */
export function toClientPipelineEvent(event: Incoming): ClientPipelineEvent {
  const source = event.source;
  const notice = event.notice;
  if (event.type === "world") {
    if (!event.spec) throw new Error("world event missing spec");
    const spec = toPublic(event.spec);
    assertPublic(event.spec, spec);
    return { type: "world", spec, source, notice };
  }
  if (event.type === "checks") {
    const results = (event.results ?? []).map((r) => ({ id: r.id, passed: r.passed }));
    return {
      type: "checks",
      results,
      passed: results.filter((r) => r.passed).length,
      total: results.length,
      source,
      notice,
    };
  }
  if (event.type === "art") {
    const piece = readArtPiece(event);
    if (!piece) throw new Error("Refusing to stream an art event without a local picture");
    return { type: "art", ...piece, source, notice };
  }
  if (event.type === "stage") {
    return { type: "stage", stage: event.stage ?? "designer", message: scrubClientText(event.message ?? ""), source, notice };
  }
  if (event.type === "choose") {
    return {
      type: "choose",
      message: scrubClientText(event.message ?? ""),
      worlds: event.worlds ?? [],
      source: "sample",
      notice: notice ?? "",
    };
  }
  if (event.type === "error") {
    return { type: "error", message: scrubClientText(event.message ?? "Something went wrong"), source, notice };
  }
  throw new Error(`Unknown pipeline event: ${event.type}`);
}
