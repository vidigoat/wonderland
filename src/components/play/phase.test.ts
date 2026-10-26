import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ClientPipelineEvent } from "@/engine/client-event";
import { errorMessage, predictionRequest, readGrade, readJudge, readRival, readTranscript, statusRibbon, transferRequest } from "./http";
import {
  applyVerdict,
  commitFirstPrediction,
  commitSecondPrediction,
  commitTransfer,
  discoveryElapsed,
  formatElapsed,
  initialPlay,
  knobsLocked,
  leaveIntro,
  PHASE_ORDER,
  toHypothesise,
} from "./phase";
import { receiptCopy } from "./receipt";
import { runDuration, runSteps } from "./readings";
import { drainSse, heroHref, toMontageItem } from "./sse";
import { encodeWav } from "./wav";

describe("phase machine", () => {
  it("walks intro → predict → experiment with knobs locked until the first grade", () => {
    const intro = initialPlay();
    expect(intro.phase).toBe("intro");
    expect(knobsLocked(intro)).toBe(true);
    const predict = leaveIntro(intro, 1000);
    expect(predict.phase).toBe("predict");
    expect(predict.startedAtMs).toBe(1000);
    expect(knobsLocked(predict)).toBe(true);
    expect(commitFirstPrediction(intro, true)).toEqual(intro);
    const experiment = commitFirstPrediction(predict, false);
    expect(experiment.phase).toBe("experiment");
    expect(experiment.beforeCorrect).toBe(false);
    expect(experiment.knobsUnlocked).toBe(true);
    expect(knobsLocked(experiment)).toBe(false);
  });

  it("keeps a failed judge on the same phase by never applying a verdict", () => {
    const writing = toHypothesise(commitFirstPrediction(leaveIntro(initialPlay(), 10), false));
    expect(writing.phase).toBe("hypothesise");
    expect(applyVerdict(writing, "colder", 80).phase).toBe("loop");
    const discovered = applyVerdict(writing, "discovered", 90);
    expect(discovered.phase).toBe("transfer");
    expect(discovered.discoveredAtMs).toBe(90);
    expect(discoveryElapsed(discovered)).toBe(80);
    expect(knobsLocked(discovered)).toBe(true);
  });

  it("uses a second prediction as the after score, otherwise the transfer grade", () => {
    const transfer = applyVerdict(toHypothesise(commitFirstPrediction(leaveIntro(initialPlay(), 0), true)), "discovered", 5000);
    const asking = commitTransfer(transfer, false, 2);
    expect(asking.phase).toBe("transfer");
    expect(asking.askingPrediction).toBe(1);
    expect(asking.afterCorrect).toBeNull();
    const receipt = commitSecondPrediction(asking, true);
    expect(receipt.phase).toBe("receipt");
    expect(receipt.afterCorrect).toBe(true);
    expect(receipt.transferCorrect).toBe(false);

    const onlyTransfer = commitTransfer(transfer, true, 1);
    expect(onlyTransfer.phase).toBe("receipt");
    expect(onlyTransfer.afterCorrect).toBe(true);
  });

  it("names the phases in play order", () => {
    expect(PHASE_ORDER).toEqual(["intro", "predict", "experiment", "hypothesise", "loop", "transfer", "receipt"]);
  });

  it("formats elapsed time from a duration, not a clock", () => {
    expect(formatElapsed(0)).toBe("0s");
    expect(formatElapsed(90_400)).toBe("1m 30s");
  });

  it("gives a cannon shot enough steps to travel", () => {
    expect(runSteps("pipeline")).toBe(1);
    expect(runSteps("bodies")).toBeGreaterThanOrEqual(100);
    expect(runDuration(runSteps("bodies"))).toBeGreaterThan(runDuration(1));
    expect(runSteps("population")).toBe(30);
  });
});

describe("receipt copy", () => {
  it("labels the after column as the second prediction or the transfer", () => {
    expect(
      receiptCopy({
        title: "Peppered Forest",
        tagline: "The moths followed.",
        concept: "How does natural selection produce camouflage?",
        before: false,
        after: true,
        afterKind: "prediction",
        elapsedMs: 125_000,
      }),
    ).toMatchObject({ before: "Missed", after: "Held", afterKind: "Second prediction", elapsed: "2m 05s" });
  });
});

describe("pipeline events", () => {
  it("parses SSE frames and keeps a partial tail", () => {
    const raw = `data: ${JSON.stringify({ type: "stage", stage: "scientist", message: "Looking." })}\n\ndata: {"type":"checks","passed":2,"total":3}\n\ndata: {"type":"wor`;
    const drained = drainSse(raw);
    expect(drained.events).toHaveLength(2);
    expect(drained.rest).toContain("wor");
    expect(toMontageItem(drained.events[1] ?? drained.events[0]!)?.type).toBe("checks");
  });

  it("shows counts only, and a sample notice verbatim", () => {
    const item = toMontageItem({
      type: "checks",
      results: [{ id: "injection-opens", passed: true }],
      passed: 4,
      total: 4,
      source: "sample",
      notice: "Sample — labeled on purpose.",
    });
    expect(item).toEqual({ type: "checks", passed: 4, total: 4, notice: "Sample — labeled on purpose." });
    expect(JSON.stringify(item)).not.toContain("injection");
  });

  it("does not render a hidden law even if one is smuggled onto a world event", () => {
    const event = {
      type: "world",
      spec: {
        id: "gatekeeper",
        title: "The Gatekeeper's Ledger",
        tagline: "The scribe copies exactly what you write.",
        concept: "Why does SQL injection work?",
        science: { hiddenLaw: "quotes end the string and the rest runs" },
        hiddenLaw: "quotes end the string and the rest runs",
        checks: [{ description: "Injection opens the vault" }],
      },
      source: "sample",
      notice: "Sample notice stays.",
    } as unknown as ClientPipelineEvent;
    const item = toMontageItem(event);
    const blob = JSON.stringify(item);
    expect(blob).not.toContain("hiddenLaw");
    expect(blob).not.toContain("quotes end the string");
    expect(blob).not.toContain("answerKey");
    expect(blob).not.toContain("Injection opens");
    expect(item).toMatchObject({
      type: "world",
      href: "/w/gatekeeper",
      notice: "Sample notice stays.",
    });
    expect(heroHref("not-a-hero")).toBeNull();
  });

  it("drops messages that name hidden fields", () => {
    const item = toMontageItem({ type: "error", message: "bad hiddenLaw in the log", source: "live" });
    expect(item).toMatchObject({ type: "error", message: "" });
  });
});

describe("api readers", () => {
  it("shapes grade and rival requests without an answer key", () => {
    expect(predictionRequest("firebreak", "dense", 1)).toEqual({ worldId: "firebreak", kind: "prediction", predictionId: "dense", choice: 1 });
    expect(transferRequest("firebreak", "Leave a gap.", "Leave a gap.")).toEqual({
      worldId: "firebreak",
      kind: "transfer",
      statement: "Leave a gap.",
      choice: "Leave a gap.",
    });
    expect(JSON.stringify(predictionRequest("gatekeeper", "apostrophe", 0))).not.toContain("answerKey");
  });

  it("reads a grade boolean and refuses to invent one", () => {
    expect(readGrade({ correct: false, source: "local" })).toBe(false);
    expect(readGrade({ source: "local" })).toBeNull();
  });

  it("keeps a null transcript and shows a sample notice", () => {
    expect(readTranscript({ source: "sample", text: null, notice: "Type it." })).toEqual({
      text: null,
      notice: "Type it.",
      source: "sample",
    });
  });

  it("accepts a judge verdict and ignores a leaky reply", () => {
    const body = readJudge({ verdict: "warmer", reply: "Try the strip.", source: "sample", notice: "Sample.", nextExperiment: { density: 0.9, secret: { nope: true } } }, ["density"]);
    expect(body?.verdict).toBe("warmer");
    expect(body?.nextExperiment).toEqual({ density: 0.9 });
    expect(readJudge({ verdict: "warmer", reply: "the hiddenLaw is x" })?.reply).toBe("");
    expect(readJudge({ error: "not implemented" })).toBeNull();
  });

  it("reads Ada only when she actually sent a thought", () => {
    expect(readRival({ source: "sample", notice: "Sample.", thought: "I will lower the reserves.", tool: { name: "set_knob", id: "reserveRatio", value: 0.2 }, params: { reserveRatio: 0.2 }, observation: { bank: "open" } })?.turn.tool).toBe("set knob reserveRatio → 0.2");
    expect(readRival({ source: "sample", notice: "Sample.", thought: "I will lower the reserves.", tool: "set_knob", params: { reserveRatio: 0.2 }, observation: { bank: "open" } })).toMatchObject({
      turn: { thought: "I will lower the reserves.", tool: "set_knob" },
    });
    expect(readRival({ error: "not implemented" })).toBeNull();
    expect(errorMessage(`{"error":"not implemented"}`, 501)).toBe("not implemented");
  });

  it("shows the status notice only when models are on the sample lane", () => {
    expect(statusRibbon({ models: "sample", openWeights: "sample", notice: "Sample — no API key." })).toBe("Sample — no API key.");
    expect(statusRibbon({ models: "live", notice: "Sample — no API key." })).toBeNull();
  });
});

describe("wav", () => {
  it("writes a mono PCM header", async () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5]), 8000);
    const bytes = new Uint8Array(await wav.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WAVE");
    expect(wav.type).toBe("audio/wav");
    expect(bytes.length).toBe(44 + 6);
  });
});

describe("client boundary", () => {
  it("does not import hidden-law modules into the play UI", () => {
    const root = path.resolve("src/components/play");
    const files = walk(root).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/from ["']@\/worlds["']/);
      expect(source, file).not.toMatch(/@\/lib\/ai\/mode/);
      expect(source, file).not.toMatch(/Date\.now\(/);
    }
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
