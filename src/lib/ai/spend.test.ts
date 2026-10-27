import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ledger = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "spend-")), "ledger.json");
process.env.SPEND_LEDGER_PATH = ledger;

const spend = await import("./spend");

describe("costOf", () => {
  it("prices chat usage by model", () => {
    const c = spend.costOf("https://inference.baseten.co/v1/chat/completions", "meta-models/muse-spark-open-1026", {
      model: "meta-models/muse-spark-open-1026",
      usage: { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 },
    });
    expect(c.usd).toBeCloseTo(5.5);
  });

  it("prices Responses usage and falls back to the most expensive rate for unknown models", () => {
    const c = spend.costOf("https://api.meta.ai/v1/responses", "mystery", { usage: { input_tokens: 1_000_000, output_tokens: 0 } });
    expect(c.usd).toBeCloseTo(4);
  });

  it("prices images per image", () => {
    expect(spend.costOf("https://api.meta.ai/v1/images/generations", "muse-image-1.0", { data: [{}, {}] }).usd).toBeCloseTo(0.02);
  });
});

describe("guardedFetch", () => {
  beforeEach(() => {
    fs.rmSync(ledger, { force: true });
  });

  it("refuses the call once the cap is reached and never hits the network", async () => {
    process.env.SPEND_CAP_BASETEN_USD = "0.001";
    spend.recordSpend("baseten", "meta-models/muse-spark-open-1026", 0.002);
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    await expect(spend.guardedFetch("baseten")("https://inference.baseten.co/v1/chat/completions", { body: "{}" })).rejects.toBeInstanceOf(
      spend.BudgetExceededError,
    );
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
