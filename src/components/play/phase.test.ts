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
  verdictKicker,
  knobsLocked,
  leaveIntro,
  PHASE_ORDER,
  phaseMark,
  toHypothesise,
  TRAIL,
} from "./phase";
import { pictureFrame, receiptArtPaths, receiptCopy, receiptSummary } from "./receipt";
import { duneRunSteps, freshStart, pictureAction, raceLine, raceRows, restageParams, runDuration, runSteps, runVerb, speakTool, stripMoved, tickBatch } from "./readings";
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
    const experiment = commitFirstPrediction(predict, false, "Choke — the spell breaks");
    expect(experiment.phase).toBe("experiment");
    expect(experiment.beforeCorrect).toBe(false);
    expect(experiment.beforeWords).toBe("Choke — the spell breaks");
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
    const receipt = commitSecondPrediction(asking, true, "No — your words stay words");
    expect(receipt.phase).toBe("receipt");
    expect(receipt.afterCorrect).toBe(true);
    expect(receipt.afterWords).toBe("No — your words stay words");
    expect(receipt.transferCorrect).toBe(false);
    expect(asking.afterWords).toBeNull();

    const onlyTransfer = commitTransfer(transfer, true, 1, "They are falling together.");
    expect(onlyTransfer.phase).toBe("receipt");
    expect(onlyTransfer.afterCorrect).toBe(true);
    expect(onlyTransfer.afterWords).toBe("They are falling together.");
  });

  it("names the phases in play order", () => {
    expect(PHASE_ORDER).toEqual(["intro", "predict", "experiment", "hypothesise", "loop", "transfer", "receipt"]);
  });

  it("maps the loop onto Say and walks Mystery through Card", () => {
    expect(TRAIL.map((step) => step.label)).toEqual(["Mystery", "Guess", "Try", "Say", "Prove", "Card"]);
    expect(phaseMark("intro")).toBe(0);
    expect(phaseMark("predict")).toBe(1);
    expect(phaseMark("experiment")).toBe(2);
    expect(phaseMark("hypothesise")).toBe(3);
    expect(phaseMark("loop")).toBe(3);
    expect(phaseMark("transfer")).toBe(4);
    expect(phaseMark("receipt")).toBe(5);
  });

  it("formats elapsed time from a duration, not a clock", () => {
    expect(formatElapsed(0)).toBe("0s");
    expect(formatElapsed(90_400)).toBe("1m 30s");
    expect(verdictKicker("warmer")).toBe("Closer");
    expect(verdictKicker("colder")).toBe("Further off");
    expect(verdictKicker(null)).toBe("Your sentence");
  });

  it("gives a cannon shot enough steps to travel", () => {
    expect(runSteps("pipeline")).toBe(1);
    expect(runSteps("bodies")).toBeGreaterThanOrEqual(550);
    expect(runSteps("bodies", "hallway-lanes")).toBe(2000);
    expect(runVerb("hallway-lanes", "bodies")).toBe("Let them walk");
    expect(runVerb("phantom-jam-ring-road", "bodies")).toBe("Let them drive");
    expect(runVerb("newtons-cannon", "bodies")).toBe("Fire");
    expect(Math.ceil(2000 / tickBatch(2000, "hallway-lanes"))).toBeLessThanOrEqual(28);
    expect(runDuration(runSteps("bodies"))).toBeGreaterThan(runDuration(1));
    expect(runSteps("population")).toBe(30);
    expect(runSteps("field", "firebreak")).toBe(48);
    expect(runSteps("population", "firefly-sync-kuramoto")).toBe(2000);
    expect(runSteps("population", "predator-prey-valley")).toBe(400);
    expect(runSteps("population", "murmuration-sky")).toBe(400);
    expect(Math.ceil(400 / tickBatch(400, "murmuration-sky"))).toBeLessThanOrEqual(20);
    expect(Math.ceil(400 / tickBatch(400, "predator-prey-valley"))).toBeLessThanOrEqual(32);
    expect(Math.ceil(2000 / tickBatch(2000))).toBeLessThanOrEqual(24);
    expect(duneRunSteps(0, 10)).toBe(48);
    expect(duneRunSteps(5, 10)).toBeGreaterThan(1000);
    expect(duneRunSteps(5, 20)).toBeGreaterThan(duneRunSteps(5, 10));
    expect(tickBatch(560)).toBe(4);
    expect(Math.ceil(560 / tickBatch(560, "phantom-jam-ring-road"))).toBeLessThanOrEqual(28);
    expect(Math.ceil(560 / tickBatch(560, "hallway-lanes"))).toBeLessThanOrEqual(28);
    expect(Math.ceil(48 / tickBatch(48, "heat-diffusion-plate"))).toBeLessThanOrEqual(12);
    expect(Math.ceil(48 / tickBatch(48, "firebreak"))).toBeLessThanOrEqual(16);
    const duneSteps = runSteps("field", "dune-march", { windSpeed: 5, initialHeight: 10 });
    expect(Math.ceil(duneSteps / tickBatch(duneSteps))).toBeLessThanOrEqual(24);
    expect(freshStart("newtons-cannon", "bodies", { speed: 0.5 }, { speed: 0.5 })).toBe(true);
    expect(freshStart("rumour-town", "population", { rumourSeeds: 1, reserveRatio: 0.1 }, { rumourSeeds: 1, reserveRatio: 0.1 })).toBe(false);
    expect(freshStart("rumour-town", "population", { rumourSeeds: 1 }, { rumourSeeds: 6 })).toBe(true);
    expect(freshStart("peppered-forest", "population", { startDarkness: 0.2, barkDarkness: 0.2 }, { startDarkness: 0.2, barkDarkness: 0.9 })).toBe(false);
  });
});

describe("Ada's words", () => {
  it("names the instrument instead of the knob id", () => {
    expect(speakTool([{ id: "barkDarkness", label: "Soot on the bark" }, { id: "birds", label: "Birds present" }], "set knob barkDarkness → 1")).toBe(
      "set knob Soot on the bark → 1",
    );
    expect(speakTool([{ id: "name", label: "Name on your scroll" }], "set knob name → visitor")).toBe("set knob Name on your scroll → visitor");
  });
});

describe("the proof's opening picture", () => {
  it("applies the new situation and leaves an empty one alone", () => {
    expect(restageParams({ barkDarkness: 0.9, startDarkness: 0.2 }, { barkDarkness: 0.05, startDarkness: 0.7 })).toEqual({
      barkDarkness: 0.05,
      startDarkness: 0.7,
    });
    expect(restageParams({ name: "traveller" }, {})).toBeNull();
    expect(restageParams({ name: "traveller" }, undefined)).toBeNull();
  });

  it("remembers the trial and puts those knobs back for the follow-up", () => {
    const trial = { barkDarkness: 0.9, startDarkness: 0.2, birds: true };
    const tundra = { barkDarkness: 0.05, startDarkness: 0.7 };
    const opening = pictureAction(null, trial, tundra, null);
    expect(opening).toEqual({
      kind: "restage",
      params: { barkDarkness: 0.05, startDarkness: 0.7, birds: true },
      remember: trial,
    });
    const again = pictureAction(null, opening.kind === "restage" ? opening.params : trial, tundra, trial);
    expect(again).toEqual({
      kind: "restage",
      params: { barkDarkness: 0.05, startDarkness: 0.7, birds: true },
      remember: trial,
    });
    expect(pictureAction(1, tundra, { barkDarkness: 0.05 }, trial)).toEqual({ kind: "resume", params: trial });
    expect(pictureAction(1, trial, tundra, null)).toEqual({ kind: "stay" });
    expect(pictureAction(null, { name: "traveller" }, {}, null)).toEqual({ kind: "stay" });
  });

  it("keeps the other knobs when a penciled suggestion is applied, and replants only when the strip moves", () => {
    const forest = { birds: true, barkDarkness: 0.2, startDarkness: 0.2 };
    const quiet = restageParams(forest, { birds: false, barkDarkness: 0.9 });
    expect(quiet).toEqual({ birds: false, barkDarkness: 0.9, startDarkness: 0.2 });
    expect(stripMoved("peppered-forest", forest, quiet ?? forest)).toBe(false);
    const valley = { density: 0.55, firebreak: false, wind: 0 };
    const penciled = restageParams(valley, { density: 0.9, firebreak: true });
    expect(penciled).toEqual({ density: 0.9, firebreak: true, wind: 0 });
    expect(stripMoved("firebreak", valley, penciled ?? valley)).toBe(true);
    expect(stripMoved("firebreak", penciled ?? valley, restageParams(penciled ?? valley, { density: 0.4 }) ?? valley)).toBe(false);
    expect(stripMoved("firebreak", { firebreak: true }, { firebreak: false })).toBe(true);
  });

  it("opens the valley packed, with no strip, then returns the planting the player left", () => {
    const left = { density: 0.55, firebreak: true, wind: 0.4 };
    const packed = { density: 0.9, wind: 0, firebreak: false };
    const opening = pictureAction(null, left, packed, null);
    expect(opening).toMatchObject({
      kind: "restage",
      params: { density: 0.9, wind: 0, firebreak: false },
      remember: left,
    });
    expect(pictureAction(1, packed, packed, left)).toEqual({ kind: "resume", params: left });
  });
});

describe("the race", () => {
  const spec = {
    observables: [
      { id: "vaultOpen", label: "Vault", display: "text" as const },
      { id: "query", label: "The spell the scribe cast", display: "text" as const },
    ],
  };

  it("names only the readings that differ, and stays quiet when they match", () => {
    expect(raceRows(spec, { vaultOpen: "open", query: "SELECT 1" }, { vaultOpen: "shut", query: "SELECT 1" })).toEqual([
      { id: "vaultOpen", label: "Vault", yours: "open", hers: "shut", spell: true },
    ]);
    expect(raceRows(spec, { vaultOpen: "shut" }, { vaultOpen: "shut" })).toEqual([]);
    expect(raceRows(spec, null, { vaultOpen: "open" })).toEqual([]);
    expect(raceRows(spec, { vaultOpen: "open" }, null)).toEqual([]);
  });

  it("names the split without repeating either reading", () => {
    expect(raceLine(0)).toBeNull();
    expect(raceLine(2)).toBe("Ada's reading is not yours.");
    expect(raceLine(2)).not.toContain("open");
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
    const said = receiptSummary({
      title: "The Gatekeeper's Ledger",
      tagline: "The scribe copies exactly what you write.",
      concept: "Why does SQL injection work?",
      before: true,
      after: true,
      afterKind: "prediction",
      elapsedMs: 4000,
      beforeWords: "Choke — the spell breaks",
      afterWords: "No — your words stay words",
      seen: "The vault is open.",
    });
    expect(said).toContain("Choke — the spell breaks");
    expect(said).toContain("The law is not printed on this card.");
    expect(said.toLowerCase()).not.toMatch(/hiddenlaw|answerkey/);
  });

  it("puts the shelf painting on a hero card and leaves an unknown world as type", () => {
    expect(receiptArtPaths("gatekeeper")).toEqual({
      ground: "/art/gatekeeper/background.webp",
      figure: "/art/gatekeeper/scribe.webp",
    });
    expect(receiptArtPaths("made-up")).toBeNull();
    const open = pictureFrame(1280, false);
    const pictured = pictureFrame(1280, true);
    expect(open.textTop).toBe(160);
    expect(pictured.h).toBeGreaterThan(0);
    expect(pictured.textTop).toBeGreaterThan(pictured.y + pictured.h);
    expect(pictured.x).toBeGreaterThan(58);
    expect(pictured.x + pictured.w).toBeLessThan(1280 - 58);
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

  it("links a verified generated world, and refuses an unsafe id", () => {
    const world = (id: string) =>
      toMontageItem({ type: "world", spec: { id, title: "The Meadow That Blinks As One", tagline: "t", concept: "c" }, source: "live" } as never);
    expect(world("firefly-sync-kuramoto")).toMatchObject({ type: "world", href: "/w/firefly-sync-kuramoto" });
    expect(world("../etc/passwd")).toMatchObject({ type: "world", href: null });
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
    // The law in plain words is only accepted alongside a discovered verdict.
    expect(readJudge({ verdict: "discovered", reply: "Yes.", law: "Fear of a run causes the run." })?.law).toBe("Fear of a run causes the run.");
    expect(readJudge({ verdict: "warmer", reply: "Closer.", law: "Fear of a run causes the run." })?.law).toBeUndefined();
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
