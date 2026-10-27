import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Hard spend caps for the hackathon credits.
 * Every request to Meta or Baseten goes through `guardedFetch`, which refuses the call once the
 * provider's ledger total reaches its cap, and records the real cost from the response's usage.
 *
 * Caps: SPEND_CAP_META_USD (default 6.5), SPEND_CAP_BASETEN_USD (default 4.5).
 * Ledger: .spend/ledger.json locally (gitignored); /tmp on Vercel, where it is per-instance only.
 */

export type Provider = "meta" | "baseten";

export class BudgetExceededError extends Error {
  constructor(public provider: Provider, public spent: number, public cap: number) {
    super(`Spend cap reached for ${provider}: $${spent.toFixed(4)} of $${cap.toFixed(2)}. No further calls are made.`);
    this.name = "BudgetExceededError";
  }
}

/** USD per 1M tokens (input, output). Unknown models are priced as the most expensive known one. */
const TOKEN_PRICES: Record<string, [number, number]> = {
  "muse-wonder-1.0": [4, 20],
  "muse-spark-1.3": [1.25, 4.25],
  "muse-spark-1.2": [1.25, 4.25],
  "muse-spark-1.1": [1.25, 4.25],
  "muse-spark-1.3-contributor": [0.1, 0.2],
  "muse-spark-1.2-contributor": [0.1, 0.2],
  "meta-models/muse-spark-open-1026": [1.25, 4.25],
};
const FALLBACK_PRICE: [number, number] = [4, 20];
const IMAGE_USD = 0.01;
const SAM_IMAGE_USD = 0.0025;
/** Transcription is $0.18/hour; a short hold-to-speak clip is priced at a flat ceiling. */
const TRANSCRIBE_CLIP_USD = 0.01;

type Entry = { at: string; provider: Provider; model: string; usd: number; input?: number; output?: number };
type Ledger = { totals: Record<Provider, number>; entries: Entry[] };

function ledgerPath(): string {
  if (process.env.SPEND_LEDGER_PATH) return process.env.SPEND_LEDGER_PATH;
  const base = process.env.VERCEL ? "/tmp" : path.join(/* turbopackIgnore: true */ process.cwd(), ".spend");
  return path.join(base, "ledger.json");
}

let cache: Ledger | null = null;

function load(): Ledger {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ ledgerPath(), "utf8")) as Ledger;
  } catch {
    cache = { totals: { meta: 0, baseten: 0 }, entries: [] };
  }
  return cache;
}

function save(ledger: Ledger) {
  try {
    fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(ledgerPath()), { recursive: true });
    fs.writeFileSync(/* turbopackIgnore: true */ ledgerPath(), JSON.stringify(ledger, null, 2));
  } catch {
    // Read-only disk: the in-memory total still enforces the cap for this process.
  }
}

export function capFor(provider: Provider): number {
  const raw = provider === "meta" ? process.env.SPEND_CAP_META_USD : process.env.SPEND_CAP_BASETEN_USD;
  const value = Number(raw);
  if (Number.isFinite(value) && value >= 0) return value;
  return provider === "meta" ? 6.5 : 4.5;
}

export function spendSummary() {
  const { totals } = load();
  return {
    meta: { spent: round(totals.meta), cap: capFor("meta") },
    baseten: { spent: round(totals.baseten), cap: capFor("baseten") },
  };
}

function round(n: number) {
  return Math.round(n * 10_000) / 10_000;
}

export function assertBudget(provider: Provider) {
  const spent = load().totals[provider];
  const cap = capFor(provider);
  if (spent >= cap) throw new BudgetExceededError(provider, spent, cap);
}

export function recordSpend(provider: Provider, model: string, usd: number, input?: number, output?: number) {
  const ledger = load();
  ledger.totals[provider] += usd;
  ledger.entries.push({ at: new Date().toISOString(), provider, model, usd: round(usd), input, output });
  if (ledger.entries.length > 2000) ledger.entries = ledger.entries.slice(-2000);
  save(ledger);
}

type Usage = { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number };

/** Cost of one response body, from its own usage numbers. Exported for tests. */
export function costOf(url: string, requestModel: string | undefined, body: Record<string, unknown>): { model: string; usd: number; input?: number; output?: number } {
  const model = String(body.model ?? requestModel ?? "unknown");
  if (url.includes("/images/")) {
    const n = Array.isArray(body.data) ? body.data.length : 1;
    return { model, usd: n * IMAGE_USD };
  }
  if (url.includes("/audio/")) return { model, usd: TRANSCRIBE_CLIP_USD };
  if (model.startsWith("sam")) return { model, usd: SAM_IMAGE_USD };
  if (model.startsWith("muse-image")) {
    const output = Array.isArray(body.output) ? (body.output as Array<{ type?: string }>) : [];
    const images = output.filter((o) => o.type === "image_generation_call").length || 1;
    return { model, usd: images * IMAGE_USD };
  }
  const usage = (body.usage ?? {}) as Usage;
  const input = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const output = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const [pin, pout] = TOKEN_PRICES[model] ?? FALLBACK_PRICE;
  return { model, usd: (input * pin + output * pout) / 1_000_000, input, output };
}

/** A fetch for the OpenAI SDK that enforces the cap before the call and records cost after it. */
export function guardedFetch(provider: Provider): typeof fetch {
  return async (input, init) => {
    assertBudget(provider);
    let requestModel: string | undefined;
    if (typeof init?.body === "string") {
      try {
        requestModel = (JSON.parse(init.body) as { model?: string }).model;
      } catch {
        requestModel = undefined;
      }
    }
    const res = await fetch(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const type = res.headers.get("content-type") ?? "";
    if (res.ok && type.includes("application/json")) {
      try {
        const body = (await res.clone().json()) as Record<string, unknown>;
        const c = costOf(url, requestModel, body);
        recordSpend(provider, c.model, c.usd, c.input, c.output);
      } catch {
        recordSpend(provider, requestModel ?? "unknown", 0.01);
      }
    } else if (res.ok) {
      // Streams and audio: no usage to read; record a small ceiling so they still count.
      recordSpend(provider, requestModel ?? "unknown", url.includes("/audio/") ? TRANSCRIBE_CLIP_USD : 0.01);
    }
    return res;
  };
}
