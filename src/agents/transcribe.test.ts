import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/lib/ai/meta", () => ({ transcribe: vi.fn(), think: vi.fn() }));

import { transcribe } from "@/lib/ai/meta";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";
import { POST } from "@/app/api/transcribe/route";

const KEYS = ["MODEL_API_KEY", "FIREWORKS_API_KEY", "BASETEN_API_KEY", "OPEN_WEIGHTS_PROVIDER"] as const;
const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  for (const key of KEYS) delete process.env[key];
  vi.clearAllMocks();
});

afterEach(() => {
  for (const key of KEYS) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

describe("transcribe", () => {
  it("sample transcribe returns null text and does not call the model", async () => {
    const res = await POST(new Request("http://local/api/transcribe", { method: "POST", body: Uint8Array.from([1, 2, 3, 4]) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ source: "sample", text: null, notice: SAMPLE_NOTICE });
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("live transcribe returns the model text", async () => {
    process.env.MODEL_API_KEY = "present";
    vi.mocked(transcribe).mockResolvedValueOnce("hello from the model mock");
    const res = await POST(new Request("http://local/api/transcribe", { method: "POST", body: Uint8Array.from([1, 2, 3, 4]) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ source: "live", text: "hello from the model mock" });
    expect(transcribe).toHaveBeenCalledOnce();
  });

  it("live transcribe rejects empty audio", async () => {
    process.env.MODEL_API_KEY = "present";
    const res = await POST(new Request("http://local/api/transcribe", { method: "POST" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "empty audio" });
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("live transcribe returns 502 when the model throws and does not invent words", async () => {
    process.env.MODEL_API_KEY = "present";
    vi.mocked(transcribe).mockRejectedValueOnce(new Error("voice down"));
    const res = await POST(new Request("http://local/api/transcribe", { method: "POST", body: Uint8Array.from([9]) }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ source: "live", message: "voice down" });
  });
});
