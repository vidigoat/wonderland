import { afterEach, describe, expect, it } from "vitest";
import { metaSource, openWeightsSource } from "./mode";

const KEYS = ["MODEL_API_KEY", "FIREWORKS_API_KEY", "BASETEN_API_KEY", "OPEN_WEIGHTS_PROVIDER"] as const;
const previous = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const key of KEYS) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

describe("model lanes", () => {
  it("stays on the sample path when keys are absent", () => {
    delete process.env.MODEL_API_KEY;
    delete process.env.FIREWORKS_API_KEY;
    delete process.env.BASETEN_API_KEY;
    delete process.env.OPEN_WEIGHTS_PROVIDER;
    expect(metaSource()).toBe("sample");
    expect(openWeightsSource()).toBe("sample");
  });

  it("switches to live only for the provider that has a key", () => {
    process.env.MODEL_API_KEY = "present";
    process.env.OPEN_WEIGHTS_PROVIDER = "baseten";
    delete process.env.BASETEN_API_KEY;
    expect(metaSource()).toBe("live");
    expect(openWeightsSource()).toBe("sample");
    process.env.BASETEN_API_KEY = "present";
    expect(openWeightsSource()).toBe("live");
  });
});
