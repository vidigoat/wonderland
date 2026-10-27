import { describe, expect, it } from "vitest";
import type { Observable } from "@/engine/spec";
import { chartLines, chartSeries } from "./chart";
import { formatHudValue, formatReading, isShareReading, plainUnit, shotSettled, showWithdrawingKey } from "./readings";

describe("reading numbers", () => {
  it("prints a tiny negative as 0, and keeps a real small change", () => {
    expect(formatReading(-0.004)).toBe("0");
    expect(formatHudValue("stossErosionRate", "Sand lost on the windward face", -0.0046, "series", "each step")).toEqual({
      text: "-0.0046",
      unit: "each step",
    });
    expect(formatReading(-0.0004, "series")).toBe("0");
    expect(formatReading(0)).toBe("0");
    expect(formatReading(-0.02)).toBe("-0.02");
  });

  it("rounds to the size of the value and drops needless decimals", () => {
    expect(formatReading(12)).toBe("12");
    expect(formatReading(12.04)).toBe("12");
    expect(formatReading(1.26)).toBe("1.26");
    expect(formatReading(10.6)).toBe("10.6");
    expect(formatReading(248)).toBe("248");
    expect(formatReading(3.2, "counter")).toBe("3");
    expect(formatReading(40, "counter")).toBe("40");
  });

  it("ends a cannon shot when the ball has landed or left, and keeps an orbit running", () => {
    expect(shotSettled({ status: "landed" })).toBe(true);
    expect(shotSettled({ status: "escaped" })).toBe(true);
    expect(shotSettled({ status: "flying" })).toBe(false);
    expect(shotSettled(null)).toBe(false);
  });

  it("shows shares as percents and units as words", () => {
    expect(isShareReading("sync_fraction", "Fireflies flashing together", 0.42)).toBe(true);
    expect(isShareReading("hares", "Hares alive", 40)).toBe(false);
    expect(formatHudValue("meanDarkness", "Average moth darkness", 0.2, "series", "")).toEqual({
      text: "20%",
      unit: null,
    });
    expect(formatHudValue("sync_fraction", "Fireflies flashing together", 0.42, "series", "")).toEqual({
      text: "42%",
      unit: null,
    });
    expect(formatHudValue("collision_rate", "Birds bumping", 0.16, "series", "")).toEqual({
      text: "16%",
      unit: null,
    });
    expect(isShareReading("mean_flash_rate", "Flashes each second", 0.23)).toBe(false);
    expect(formatHudValue("migrationSpeed", "How fast the dune walks", 0.5, "counter", "")).toEqual({
      text: "0.5",
      unit: null,
    });
    expect(formatHudValue("lynxAlive", "Lynx alive", 8, "counter", "lynx")).toEqual({
      text: "8",
      unit: "lynx",
    });
    expect(formatHudValue("jamCount", "Traffic jams", 1, "counter", "jams")).toEqual({ text: "1", unit: "jam" });
    expect(formatHudValue("jamCount", "Traffic jams", 0, "counter", "jams")).toEqual({ text: "0", unit: "jams" });
    expect(formatHudValue("jamCount", "Traffic jams", 2, "counter", "jams")).toEqual({ text: "2", unit: "jams" });
    expect(formatHudValue("hares", "Hares alive", 1, "counter", "hares")).toEqual({ text: "1", unit: "hare" });
    expect(formatHudValue("flies", "Fireflies here", 1, "counter", "fireflies")).toEqual({ text: "1", unit: "firefly" });
    expect(formatHudValue("peak", "Hottest spot", 1, "series", "degrees")).toEqual({ text: "1", unit: "degree" });
    expect(formatHudValue("lag", "Steps from the hare peak to the lynx", 1, "series", "steps")).toEqual({ text: "1", unit: "step" });
    expect(showWithdrawingKey(null)).toBe(false);
    expect(showWithdrawingKey({ withdrawnShare: 0, bank: "open" })).toBe(false);
    expect(showWithdrawingKey({ withdrawnShare: 0.1, bank: "open" })).toBe(true);
    expect(showWithdrawingKey({ withdrawnShare: 0, bank: "collapsed" })).toBe(true);
    expect(formatHudValue("waveSpeed", "How fast the jam travels", -2.4, "series", "m/s")).toEqual({
      text: "-2.4",
      unit: "metres per second",
    });
    expect(plainUnit("(m/s)²")).toBeNull();
    expect(plainUnit("hares")).toBe("hares");
    expect(plainUnit("")).toBeNull();
  });
});

describe("the reading chart", () => {
  const observables: Observable[] = [
    { id: "hares", label: "Hares alive", display: "counter" },
    { id: "lynx", label: "Lynx alive", display: "counter" },
    { id: "note", label: "Note", display: "text" },
    { id: "swing", label: "How hard the hares swing", display: "series" },
    { id: "lag", label: "Steps later", display: "series" },
  ];

  it("keeps at most three numeric readings and puts the ones that move first", () => {
    const history = [
      { hares: 40, lynx: 9, note: "quiet", swing: 0, lag: 1 },
      { hares: 80, lynx: 9, note: "quiet", swing: 0.2, lag: 1 },
    ];
    expect(chartSeries(observables, history).map((series) => series.id)).toEqual(["hares", "swing", "lynx"]);
  });

  it("draws the previous run on the same scale as this one", () => {
    const current = chartSeries(observables, [
      { hares: 40, lynx: 9, swing: 0, lag: 1 },
      { hares: 70, lynx: 8, swing: 0.1, lag: 1 },
    ]);
    const previous = chartSeries(observables, [
      { hares: 20, lynx: 12, swing: 0, lag: 1 },
      { hares: 30, lynx: 14, swing: 0, lag: 1 },
    ]);
    const lines = chartLines(current, previous, 320, 96);
    const hares = lines.find((line) => line.id === "hares");
    expect(hares?.previous).toBeTruthy();
    expect(hares?.current).toContain("M");
    expect(hares?.current).toContain("L");
    expect(hares?.current).not.toBe(hares?.previous);
  });
});
