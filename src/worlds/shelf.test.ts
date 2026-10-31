import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { onShelf } from "./shelf.server";

describe("the shelf", () => {
  it("keeps worlds Spark passed, never watched, or flagged with repairs left", () => {
    expect(onShelf(null)).toBe(true);
    expect(onShelf({ verdict: "looks-right", repairs: 2 })).toBe(true);
    expect(onShelf({ verdict: "concern", repairs: 1 })).toBe(true);
  });

  it("holds back a world Spark still flags after every repair", () => {
    expect(onShelf({ verdict: "concern", repairs: 2 })).toBe(false);
  });
});
