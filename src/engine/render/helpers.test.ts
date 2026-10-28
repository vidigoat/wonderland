import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isGlowSprite } from "./palette";
import {
  CANNON_STEP_DT,
  clampCenter,
  crowdToDraw,
  FIELD_COLORS,
  fieldColor,
  bilinearSample,
  fieldScale,
  bodyFacing,
  thumbBodyPx,
  thumbFigurePx,
  thumbJamHalo,
  thumbJamInk,
  thumbCrowd,
  thumbSample,
  thumbSky,
  thumbSpritePx,
  thumbSteps,
  figureBody,
  figureTint,
  flockFacing,
  sealedDataLine,
  scribeStopLine,
  shutVaultNote,
  splitSealedSpell,
  heightSilhouette,
  smoothField,
  landedApart,
  injectionHighlightRange,
  phaseOffset,
  populationCrowd,
  resolveShotPath,
  separateSpeech,
  duneRise,
  ridgeWindow,
  softenRidge,
  SCROLL_TRIP_MS,
  scrollRest,
  scrollTravel,
  stepScroll,
  smoothstep,
  cannonLook,
  launchPreview,
  onSurface,
  clearedStrip,
  townFoot,
  trailGhostPoints,
} from "./helpers";

function spell(name: string, pass = ""): string {
  return `SELECT * FROM vault WHERE name = '${name}' AND pass = '${pass}'`;
}

function sealed(name: string, pass = ""): string {
  const query = "SELECT * FROM vault WHERE name = ? AND pass = ?";
  return `${query}   -- sealed: [${JSON.stringify(name)}, ${JSON.stringify(pass)}]`;
}

function luminance(color: number): number {
  const red = (color >> 16) & 255;
  const green = (color >> 8) & 255;
  const blue = color & 255;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

describe("injectionHighlightRange", () => {
  it("marks the identifier that fell out of O'Brien", () => {
    const query = spell("O'Brien");
    const range = injectionHighlightRange(query);
    expect(range).not.toBeNull();
    expect(query.slice(range!.start, range!.end)).toBe("Brien");
    expect(query.slice(0, range!.start)).toContain("name = 'O'");
  });

  it("marks the classic breakout ' OR '1'='1", () => {
    const query = spell("' OR '1'='1");
    const range = injectionHighlightRange(query);
    expect(range).not.toBeNull();
    expect(query.slice(range!.start, range!.end)).toBe(" OR '1'='1");
    expect(query.slice(0, range!.start)).not.toContain("OR");
  });

  it("covers a breakout in both the name and the password", () => {
    const query = spell("' OR '1'='1", "' OR '1'='1");
    const range = injectionHighlightRange(query);
    expect(range).not.toBeNull();
    const slice = query.slice(range!.start, range!.end);
    expect(slice).toBe(" OR '1'='1' AND pass = '' OR '1'='1");
    expect(query.slice(0, range!.start).endsWith("name = ''")).toBe(true);
  });

  it("leaves a sealed scroll unmarked, even when the payload contains quotes", () => {
    expect(injectionHighlightRange(sealed("O'Brien"))).toBeNull();
    expect(injectionHighlightRange(sealed("' OR '1'='1", "' OR '1'='1"))).toBeNull();
  });

  it("leaves a well-formed spell unmarked", () => {
    expect(injectionHighlightRange(spell("traveller"))).toBeNull();
    expect(injectionHighlightRange(spell("queen", "crown-of-thorns-9"))).toBeNull();
    expect(injectionHighlightRange(spell("O''Brien", "fine"))).toBeNull();
    expect(injectionHighlightRange("O'Brien")).toBeNull();
  });
});

describe("onSurface", () => {
  it("lifts a buried shot onto the rim and leaves a flying one", () => {
    expect(onSurface(0, 0.4)).toEqual({ x: 0, y: 1 });
    expect(onSurface(0.3, 0.4).y).toBeCloseTo(0.8);
    expect(onSurface(0, 1.4)).toEqual({ x: 0, y: 1.4 });
    expect(onSurface(0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("launchPreview", () => {
  it("drops a slow shot and keeps a circular one off the ground", () => {
    const slow = launchPreview(0.45);
    const round = launchPreview(1);
    expect(slow.length).toBeGreaterThan(4);
    expect(Math.hypot(slow[slow.length - 1]!.x, slow[slow.length - 1]!.y)).toBeLessThan(1.05);
    expect(round.length).toBeGreaterThan(40);
    for (const point of round.slice(0, 40)) {
      expect(Math.hypot(point.x, point.y)).toBeGreaterThan(0.98);
    }
  });

  it("frames a short fall on the mountain and a lap on the whole planet", () => {
    const hop = cannonLook(launchPreview(0.5));
    const lap = cannonLook(launchPreview(1));
    expect(hop.focus).toBeLessThan(0.6);
    expect(hop.aim.y).toBeGreaterThan(0.9);
    expect(lap.focus).toBeGreaterThanOrEqual(1.72);
    expect(lap.aim).toEqual({ x: 0, y: 0 });
    expect(cannonLook([])).toEqual({ aim: { x: 0, y: 0 }, focus: 1.72 });
  });
});

describe("trailGhostPoints", () => {
  it("needs two samples", () => {
    expect(trailGhostPoints([])).toEqual([]);
    expect(trailGhostPoints([[0, 1.02]])).toEqual([]);
    expect(trailGhostPoints([{ x: 0, y: 1.02 }], 0)).toEqual([]);
  });

  it("accepts tuples and point objects", () => {
    const fromTuples = trailGhostPoints(
      [
        [-0.02, 1.02],
        [0, 1.02],
      ],
      8,
    );
    const fromObjects = trailGhostPoints(
      [
        { x: -0.02, y: 1.02 },
        { x: 0, y: 1.02 },
      ],
      8,
    );
    expect(fromObjects).toEqual(fromTuples);
    expect(fromTuples.length).toBeGreaterThan(0);
  });

  it("is deterministic and finite", () => {
    const trail = [
      [-0.5 * CANNON_STEP_DT, 1.02],
      [0, 1.02],
    ] as const;
    const once = trailGhostPoints(trail, 24);
    const twice = trailGhostPoints(trail, 24);
    expect(twice).toEqual(once);
    for (const point of once) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });

  it("lets a slow shot fall and a fast shot climb", () => {
    const slow = trailGhostPoints(
      [
        [-0.45 * CANNON_STEP_DT, 1.02],
        [0, 1.02],
      ],
      30,
    );
    const fast = trailGhostPoints(
      [
        [-1.5 * CANNON_STEP_DT, 1.02],
        [0, 1.02],
      ],
      30,
    );
    expect(slow.length).toBeGreaterThan(5);
    expect(Math.hypot(slow[slow.length - 1]!.x, slow[slow.length - 1]!.y)).toBeLessThan(1.02);
    expect(Math.hypot(fast[fast.length - 1]!.x, fast[fast.length - 1]!.y)).toBeGreaterThan(1.2);
  });

  it("keeps a circular launch aloft for the first moments", () => {
    const speed = 0.99;
    const ghost = trailGhostPoints(
      [
        [-speed * CANNON_STEP_DT, 1.02],
        [0, 1.02],
      ],
      20,
    );
    expect(ghost).toHaveLength(20);
    for (const point of ghost) {
      const radius = Math.hypot(point.x, point.y);
      expect(radius).toBeGreaterThan(0.96);
      expect(radius).toBeLessThan(1.25);
    }
  });

  it("drops a resting ball toward the planet", () => {
    const ghost = trailGhostPoints(
      [
        [0, 1.4],
        [0, 1.4],
      ],
      15,
    );
    const start = 1.4;
    const end = Math.hypot(ghost[ghost.length - 1]!.x, ghost[ghost.length - 1]!.y);
    expect(end).toBeLessThan(start);
  });
});

describe("fieldColor", () => {
  it("paints the four firebreak levels as night, ash, moss, and ember", () => {
    expect(fieldColor(0, "firebreak")).toBe(FIELD_COLORS.night);
    expect(fieldColor(0.12, "firebreak")).toBe(FIELD_COLORS.ash);
    expect(fieldColor(0.35, "firebreak")).toBe(FIELD_COLORS.moss);
    expect(fieldColor(1, "firebreak")).toBe(FIELD_COLORS.ember);

    const ash = FIELD_COLORS.ash;
    const moss = FIELD_COLORS.moss;
    const ember = FIELD_COLORS.ember;
    const night = FIELD_COLORS.night;
    expect(Math.abs((((ash >> 16) & 255) - (ash & 255)))).toBeLessThan(30);
    expect((moss >> 8) & 255).toBeGreaterThan((moss >> 16) & 255);
    expect((ember >> 16) & 255).toBeGreaterThan((ember >> 8) & 255);
    expect(luminance(night)).toBeLessThan(luminance(ash));
    expect(luminance(ember)).toBeGreaterThan(luminance(night));
  });

  it("blends any other value, and any continuous field, from ink to gold", () => {
    expect(fieldColor(0, "continuous")).toBe(FIELD_COLORS.ink);
    expect(fieldColor(1, "continuous")).toBe(FIELD_COLORS.gold);
    expect(fieldColor(0.5, "continuous")).not.toBe(fieldColor(0, "continuous"));
    expect(luminance(fieldColor(0.25, "continuous"))).toBeLessThan(luminance(fieldColor(0.75, "continuous")));
    expect(fieldColor(0.2, "firebreak")).toBe(fieldColor(0.2, "continuous"));
    expect(fieldColor(0.12 + 1e-4, "firebreak")).not.toBe(FIELD_COLORS.ash);
  });

  it("smooths a coarse field and recognises a dune silhouette", () => {
    expect(bilinearSample([[0, 1], [0, 1]], 0.5, 0)).toBeCloseTo(0.5);
    const smoothed = smoothField(
      [
        [0, 0],
        [0, 1],
      ],
      8,
    );
    expect(smoothed.length).toBeGreaterThan(2);
    expect(smoothed[0]?.[0]).toBeCloseTo(0);
    const dune = Array.from({ length: 8 }, (_, y) =>
      Array.from({ length: 10 }, (_, x) => (y >= 7 - (5 - Math.abs(x - 4)) ? 1 : 0)),
    );
    const silhouette = heightSilhouette(dune);
    expect(silhouette).not.toBeNull();
    expect(silhouette?.heights[4]).toBeGreaterThan(silhouette?.heights[0] ?? 1);
    const heat = Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => (x === 3 && y === 3 ? 1 : 0.1)));
    expect(heightSilhouette(heat)).toBeNull();
  });

  it("chooses a scale from the world or from the values actually present", () => {
    expect(fieldScale("firebreak", [0, 0, 0])).toBe("firebreak");
    expect(fieldScale("other", [0, 0.12, 0.35, 1])).toBe("firebreak");
    expect(fieldScale("other", [0, 1, 0.5])).toBe("continuous");
    expect(fieldScale("other", [0, 1, 0, 1])).toBe("continuous");
  });
});

describe("speech bubbles", () => {
  it("lifts a bubble that sits on another and leaves a distant one", () => {
    const placed = separateSpeech(
      [
        { x: 100, y: 200, w: 120, h: 32 },
        { x: 108, y: 204, w: 120, h: 32 },
        { x: 420, y: 200, w: 120, h: 32 },
      ],
      500,
    );
    expect(Math.abs(placed[0].y - placed[1].y)).toBeGreaterThan(20);
    expect(placed[2]).toEqual({ x: 420, y: 200 });
  });
});

describe("a dune ridge", () => {
  it("lifts a low ridge high enough to read, and keeps a taller dune taller", () => {
    expect(duneRise(0)).toBe(0);
    expect(duneRise(1 / 3)).toBeGreaterThan(0.6);
    expect(duneRise(1 / 3)).toBeLessThan(duneRise(0.5));
    expect(duneRise(1)).toBeLessThanOrEqual(0.9);
  });

  it("rounds a staircase and keeps the crest where it was", () => {
    const stairs = [0, 0, 0.1, 0.1, 0.2, 0.2, 0.3, 0.3, 0.15, 0, 0];
    const soft = softenRidge(stairs);
    const jump = (values: number[]) => Math.max(...values.slice(1).map((value, index) => Math.abs(value - (values[index] ?? 0))));
    expect(jump(soft)).toBeLessThan(jump(stairs));
    const crest = (values: number[]) => values.indexOf(Math.max(...values));
    expect(Math.abs(crest(soft) - crest(stairs))).toBeLessThanOrEqual(1);
    expect(soft[0]).toBeLessThan(soft[crest(soft)] ?? 0);
  });

  it("keeps the long windward slope when the flats are cut away", () => {
    const heights = Array.from({ length: 66 }, () => 0);
    for (let i = 0; i < 20; i++) heights[6 + i] = (i + 1) / 20;
    for (let i = 0; i < 10; i++) heights[26 + i] = 1 - (i + 1) / 10;
    const span = ridgeWindow(heights);
    const body = heights.slice(span.start, span.end + 1);
    const peakAt = body.indexOf(Math.max(...body));
    expect(body.length).toBeLessThan(heights.length);
    expect(peakAt / (body.length - 1)).toBeGreaterThan(0.55);
  });
});

describe("a phone forest keeps moths visible", () => {
  it("draws fewer moths, each at least half a figure, and still includes the bird", () => {
    const phone = populationCrowd({ width: 390, height: 520, count: 121, painted: true, rumour: false, hero: true });
    expect(phone.cap).toBe(36);
    expect(phone.scale).toBeGreaterThanOrEqual(0.52);
    const desk = populationCrowd({ width: 1100, height: 640, count: 121, painted: true, rumour: false, hero: true });
    expect(desk.cap).toBe(121);
    const drawn = crowdToDraw(
      [...Array.from({ length: 120 }, () => ({ sprite: "moth" })), { sprite: "bird" }],
      phone.cap,
    );
    expect(drawn).toHaveLength(36);
    expect(drawn.filter((agent) => agent.sprite === "bird")).toHaveLength(1);
    expect(drawn.filter((agent) => agent.sprite === "moth")).toHaveLength(35);
  });

  it("keeps a generated valley's predators large enough to tell from the hares", () => {
    const desk = populationCrowd({ width: 900, height: 520, count: 118, painted: true, rumour: false, hero: false });
    expect(desk.cap).toBeLessThan(40);
    expect(desk.scale).toBeGreaterThanOrEqual(0.48);
    const drawn = crowdToDraw(
      [...Array.from({ length: 111 }, () => ({ sprite: "prey" })), ...Array.from({ length: 7 }, () => ({ sprite: "predator" }))],
      desk.cap,
    );
    expect(drawn.filter((agent) => agent.sprite === "predator")).toHaveLength(7);
    expect(drawn.filter((agent) => agent.sprite === "prey").length).toBeGreaterThan(0);
  });

  it("on a phone still draws hares when the lynx would fill the picture", () => {
    const phone = populationCrowd({ width: 390, height: 320, count: 138, painted: true, rumour: false, hero: false });
    expect(phone.cap).toBe(36);
    expect(phone.scale).toBeGreaterThanOrEqual(0.5);
    const drawn = crowdToDraw(
      [...Array.from({ length: 112 }, () => ({ sprite: "prey" })), ...Array.from({ length: 26 }, () => ({ sprite: "predator" }))],
      phone.cap,
    );
    expect(drawn.filter((agent) => agent.sprite === "prey").length).toBeGreaterThan(8);
    expect(drawn.filter((agent) => agent.sprite === "predator").length).toBeGreaterThan(4);
    expect(figureBody("prey", 0.5, true, 1)).toBeGreaterThan(figureBody("predator", 0, true, 1) * 0.75);
    expect(figureBody("predator", 0, false, 1)).toBeGreaterThan(figureBody("prey", 1, false, 1));
  });
});

describe("the scribe's spell", () => {
  it("lifts a sealed scroll's words out of the command", () => {
    const query = `SELECT * FROM vault WHERE name = ? AND pass = ?   -- sealed: ${JSON.stringify(["' OR '1'='1", "' OR '1'='1"])}`;
    const split = splitSealedSpell(query);
    expect(split.spell).toBe("SELECT * FROM vault WHERE name = ? AND pass = ?");
    expect(sealedDataLine(split.data ?? "")).toBe("Sealed. Kept as data: ' OR '1'='1  ·  ' OR '1'='1");
    expect(splitSealedSpell("SELECT * FROM vault").data).toBeNull();
  });

  it("names a broken quote in plain words", () => {
    expect(scribeStopLine('near "Brien": syntax error')).toBe("The scribe stopped. The quote closed too soon.");
    expect(scribeStopLine("disk full")).toBe("The scribe stopped. disk full");
  });

  it("says the vault stayed shut when the spell ran and returned nothing", () => {
    expect(shutVaultNote("SELECT * FROM vault", null, 0)).toBe("The spell ran. The vault stayed shut.");
    expect(shutVaultNote("SELECT * FROM vault", null, 2)).toBeNull();
    expect(shutVaultNote("SELECT * FROM vault", "near quote", 0)).toBeNull();
    expect(shutVaultNote("", null, 0)).toBeNull();
  });
});

describe("a murmuration", () => {
  it("turns a bird that points up until it faces its heading", () => {
    expect(flockFacing(0)).toBeCloseTo(Math.PI / 2);
    expect(flockFacing(-Math.PI / 2)).toBeCloseTo(0);
    expect(flockFacing(Math.PI / 2)).toBeCloseTo(Math.PI);
  });

  it("keeps a starling a bird, and a firefly a light", () => {
    expect(isGlowSprite("starling")).toBe(false);
    expect(isGlowSprite("firefly")).toBe(true);
    expect(isGlowSprite("star")).toBe(true);
  });
});

describe("a shelf card", () => {
  it("lets a jam bunch before the picture is taken", () => {
    expect(thumbSteps("phantom-jam-ring-road")).toBeGreaterThan(thumbSteps("dune-march"));
    expect(thumbSteps("hallway-lanes")).toBeGreaterThan(40);
    expect(thumbSteps("firefly-sync-kuramoto")).toBe(1000);
    expect(thumbSteps("murmuration-sky")).toBe(400);
    expect(thumbSteps("predator-prey-valley")).toBe(200);
    expect(thumbCrowd(500, true)).toBe(64);
    expect(thumbCrowd(30, true)).toBe(30);
    expect(thumbCrowd(500, false)).toBe(400);
    const sample = thumbSample([0, 1, 2, 3, 4, 5, 6, 7], true);
    expect(sample.length).toBeLessThanOrEqual(64);
    expect(sample[0]).toBe(0);
    expect(sample[sample.length - 1]).toBe(7);
    expect(thumbBodyPx("phantom-jam-ring-road", 0)).toBeGreaterThan(thumbBodyPx("phantom-jam-ring-road", 12));
    expect(thumbJamHalo("phantom-jam-ring-road", 0)).toBeGreaterThan(thumbBodyPx("phantom-jam-ring-road", 0) / 2);
    expect(thumbJamHalo("phantom-jam-ring-road", 12)).toBe(0);
    expect(thumbJamInk("phantom-jam-ring-road", 0)).toBe("#6e1020");
    expect(thumbJamInk("hallway-lanes", -1)).toBeNull();
    expect(thumbBodyPx("hallway-lanes", -1)).toBe(thumbBodyPx("hallway-lanes", 1));
  });

  it("keeps the world in the sky above the title", () => {
    const sky = thumbSky(320, 400);
    expect(sky.y + sky.h).toBeLessThanOrEqual(400 * 0.48);
    expect(sky.w).toBeGreaterThan(320 * 0.8);
    const flock = thumbSpritePx(Math.min(sky.w, sky.h), 64, true);
    const gap = Math.min(sky.w, sky.h) / Math.sqrt(64);
    expect(flock).toBeGreaterThan(gap * 0.8);
    expect(flock).toBeLessThan(gap * 1.4);
    const animals = thumbSpritePx(Math.min(sky.w, sky.h), 32, false);
    expect(animals).toBeGreaterThan(flock);
    const moving = thumbFigurePx(Math.min(sky.w, sky.h), false);
    const stopped = thumbFigurePx(Math.min(sky.w, sky.h), true);
    expect(stopped).toBeGreaterThan(moving);
    expect(stopped * 0.78).toBeGreaterThan(stopped / 2);
  });
});

describe("which way a body faces", () => {
  it("turns a tall vehicle along the lane and mirrors a walker going the other way", () => {
    expect(bodyFacing(4, true)).toEqual({ turn: Math.PI / 2, flip: false });
    expect(bodyFacing(-1, false)).toEqual({ turn: 0, flip: true });
    expect(bodyFacing(1, false)).toEqual({ turn: 0, flip: false });
  });
});

describe("a ring-road jam", () => {
  it("paints a stopped car red and leaves every other figure as it was painted", () => {
    expect(figureTint("phantom-jam-ring-road", 0.2)).toBe(0xff3344);
    expect(figureTint("phantom-jam-ring-road", 11)).toBe(0xffffff);
    expect(figureTint("hallway-lanes", -1)).toBe(0xffffff);
  });

  it("names the controls in plain words", () => {
    const spec = JSON.parse(readFileSync("data/worlds/phantom-jam-ring-road.json", "utf8")) as { knobs: { label: string }[] };
    const labels = spec.knobs.map((knob) => knob.label);
    expect(labels).toEqual(["How many cars", "Length of the track", "Time to notice", "Speed they aim for", "Gap they keep", "Brake tap"]);
    expect(labels.join(" ")).not.toMatch(/[()]/);
  });
});

describe("station labels stay on a narrow stage", () => {
  it("pulls a card that would hang off the right edge back inside", () => {
    expect(clampCenter(360, 120, 390)).toBe(322);
    expect(clampCenter(40, 120, 390)).toBe(68);
    expect(clampCenter(200, 80, 390)).toBe(200);
  });
});

describe("helpers stay deterministic", () => {
  it("does not call Math.random", () => {
    const source = readFileSync(new URL("./helpers.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/Math\.random\s*\(/);
  });

  it("drops a remembered orbit when the world starts a new shot", () => {
    const orbit = [
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ];
    expect(resolveShotPath([{ x: 0, y: 1.02 }], orbit)).toEqual([{ x: 0, y: 1.02 }]);
    expect(resolveShotPath(orbit, [])).toEqual(orbit);
    expect(resolveShotPath([], orbit)).toEqual(orbit);
  });

  it("sends the scroll from the desk to the station the spell reached", () => {
    const stages = ["scroll", "scribe", "ledger", "vault"];
    expect(scrollRest(stages, { error: true, open: false })).toBeCloseTo(1 / 3);
    expect(scrollRest(stages, { error: false, open: true })).toBe(1);
    expect(scrollRest(stages, { error: false, open: false })).toBeCloseTo(2 / 3);
    expect(scrollRest(["scroll"], { error: true, open: true })).toBe(0);
    expect(scrollTravel(true, false, 0, 1)).toBe(0);
    expect(scrollTravel(true, false, SCROLL_TRIP_MS, 1)).toBe(1);
    expect(scrollTravel(true, false, SCROLL_TRIP_MS / 2, 1)).toBeGreaterThan(0.4);
    expect(scrollTravel(true, false, SCROLL_TRIP_MS / 2, 1)).toBeLessThan(0.6);
    expect(scrollTravel(false, false, 0, 1)).toBe(1);
    expect(scrollTravel(true, true, 0, 2 / 3)).toBeCloseTo(2 / 3);
    const desk = { started: null, traveled: false };
    expect(stepScroll(desk, false, false, 0, 1).travel).toBe(0);
    const begun = stepScroll(desk, true, false, 1000, 1);
    expect(begun.travel).toBe(0);
    expect(begun.trip.started).toBe(1000);
    const mid = stepScroll(begun.trip, true, false, 1000 + SCROLL_TRIP_MS / 2, 1);
    expect(mid.travel).toBeGreaterThan(0.4);
    expect(mid.travel).toBeLessThan(0.6);
    const ended = stepScroll(mid.trip, false, false, 1000 + SCROLL_TRIP_MS, 1);
    expect(ended.travel).toBe(1);
    expect(ended.trip.traveled).toBe(true);
    expect(stepScroll(ended.trip, false, false, 9000, 1).travel).toBe(1);
  });

  it("keeps phase and smoothstep in range", () => {
    expect(phaseOffset("moth-3")).toBe(phaseOffset("moth-3"));
    expect(phaseOffset("moth-3")).not.toBe(phaseOffset("citizen-3"));
    expect(phaseOffset(4)).toBeGreaterThanOrEqual(0);
    expect(phaseOffset(4)).toBeLessThan(1);
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5);
  });

  it("stands the town on the cobbles, from the doorstep to the front of the square", () => {
    expect(townFoot(0)).toBeCloseTo(0.62);
    expect(townFoot(1)).toBeCloseTo(0.96);
    expect(townFoot(-2)).toBeCloseTo(0.62);
    expect(townFoot(3)).toBeCloseTo(0.96);
    expect(townFoot(0)).toBeGreaterThan(0.58);
  });

  it("treats a new perch as a landing and a small shift as a step", () => {
    expect(landedApart(0.1, 0.2, 0.8, 0.7)).toBe(true);
    expect(landedApart(0.4, 0.4, 0.46, 0.42)).toBe(false);
  });

  it("finds a cleared lane and ignores a single empty column", () => {
    const row = (gap: number[]) => Array.from({ length: 8 }, (_, x) => (gap.includes(x) ? 0 : 0.35));
    const lane = Array.from({ length: 4 }, () => row([3, 4, 5]));
    expect(clearedStrip(lane)).toEqual({ start: 3, end: 6 });
    const hole = Array.from({ length: 4 }, () => row([2]));
    expect(clearedStrip(hole)).toBeNull();
    expect(clearedStrip([[0.35, 0.35], [0, 0.35]])).toBeNull();
    expect(clearedStrip([])).toBeNull();
  });
});
