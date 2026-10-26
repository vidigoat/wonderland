import { errorMessage } from "./http";

export type SessionMint = { seed: number; notice: string | null };

const pending = new Map<string, Promise<SessionMint>>();

/** A seed from the address, or null when the page should ask the server. */
export function readSeedQuery(search: string): number | null {
  const raw = new URLSearchParams(search).get("seed");
  if (!raw || !/^[1-9]\d{0,8}$/.test(raw)) return null;
  const seed = Number(raw);
  return seed <= 1_000_000_000 ? seed : null;
}

export function withSeed(notice: string | null, seed: number): string {
  const base = notice?.trim() ?? "";
  if (base.includes(String(seed))) return base;
  const line = `Seed ${seed}.`;
  return base ? `${base} ${line}` : line;
}

/** One seed per world for this page lifetime. Shared with Ada. Never minted from the clock. */
export function mintSession(worldId: string, search = ""): Promise<SessionMint> {
  const asked = readSeedQuery(search);
  const key = asked ? `${worldId}:${asked}` : worldId;
  const existing = pending.get(key);
  if (existing) return existing;
  if (asked) {
    const ready = Promise.resolve({
      seed: asked,
      notice: `Seed ${asked}. This page asked for it, and Ada uses the same one.`,
    });
    pending.set(key, ready);
    return ready;
  }
  const promise = fetch("/api/session", { method: "POST" })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error(errorMessage(text, res.status));
      const json = JSON.parse(text) as { seed?: unknown; notice?: unknown };
      if (typeof json.seed !== "number" || !Number.isFinite(json.seed)) throw new Error("The session did not return a seed.");
      return { seed: json.seed, notice: typeof json.notice === "string" ? json.notice : null };
    })
    .catch((err: unknown) => {
      pending.delete(key);
      throw err;
    });
  pending.set(key, promise);
  return promise;
}
