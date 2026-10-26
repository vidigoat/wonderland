import { errorMessage } from "./http";

export type SessionMint = { seed: number; notice: string | null };

const pending = new Map<string, Promise<SessionMint>>();

/** One seed per world for this page lifetime. Shared with Ada. Never minted from the clock. */
export function mintSession(worldId: string): Promise<SessionMint> {
  const existing = pending.get(worldId);
  if (existing) return existing;
  const promise = fetch("/api/session", { method: "POST" })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error(errorMessage(text, res.status));
      const json = JSON.parse(text) as { seed?: unknown; notice?: unknown };
      if (typeof json.seed !== "number" || !Number.isFinite(json.seed)) throw new Error("The session did not return a seed.");
      return { seed: json.seed, notice: typeof json.notice === "string" ? json.notice : null };
    })
    .catch((err: unknown) => {
      pending.delete(worldId);
      throw err;
    });
  pending.set(worldId, promise);
  return promise;
}
