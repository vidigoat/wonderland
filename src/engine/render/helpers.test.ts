import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CANNON_STEP_DT,
  FIELD_COLORS,
  fieldColor,
  fieldScale,
  injectionHighlightRange,
  phaseOffset,
  smoothstep,
  launchPreview,
  onSurface,
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

  it("chooses a scale from the world or from the values actually present", () => {
    expect(fieldScale("firebreak", [0, 0, 0])).toBe("firebreak");
    expect(fieldScale("other", [0, 0.12, 0.35, 1])).toBe("firebreak");
    expect(fieldScale("other", [0, 1, 0.5])).toBe("continuous");
    expect(fieldScale("other", [0, 1, 0, 1])).toBe("continuous");
  });
});

describe("helpers stay deterministic", () => {
  it("does not call Math.random", () => {
    const source = readFileSync(new URL("./helpers.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/Math\.random\s*\(/);
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
});
