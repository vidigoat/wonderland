import type { RulesModule } from "@/engine/rules";

/**
 * Rumour Town — bank runs (Diamond–Dybvig).
 * Hidden law: a solvent bank holds only a fraction of deposits as cash. If enough depositors *expect* others
 * to withdraw, withdrawing early is individually rational → self-fulfilling run. Deposit insurance removes the fear.
 *
 * This is the deterministic fallback brain. The showcase version replaces `decide` with Muse Glimmer agents
 * (src/agents/citizens.ts) — each citizen reads its neighbours' speech bubbles and decides. Checks always use this fallback.
 */
type Citizen = { id: number; x: number; y: number; worried: number; withdrawn: boolean; says: string | null; voiced?: boolean };
export type TownState = { round: number; citizens: Citizen[]; cash: number; failed: boolean };

const N = 40;

type Heard = { worried: number; withdraw: boolean; says: string | null };

/** One round of open-weights decisions, passed as JSON. Checks never set this, so they stay on the fallback brain. */
function readCitizenDecisions(raw: unknown): Map<number, Heard> | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const heard = new Map<number, Heard>();
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "number" || !Number.isInteger(row.id)) continue;
      if (typeof row.worried !== "number" || !Number.isFinite(row.worried)) continue;
      if (typeof row.withdraw !== "boolean") continue;
      heard.set(row.id, {
        worried: Math.min(1, Math.max(0, row.worried)),
        withdraw: row.withdraw,
        says: typeof row.says === "string" ? row.says.slice(0, 80) : null,
      });
    }
    return heard.size ? heard : null;
  } catch {
    return null;
  }
}

export const rumourTown: RulesModule<TownState> = {
  init(params, rng) {
    const reserve = Number(params.reserveRatio ?? 0.1);
    const seeded = Number(params.rumourSeeds ?? 1);
    return {
      round: 0,
      failed: false,
      cash: reserve * N,
      citizens: Array.from({ length: N }, (_, i) => ({
        id: i,
        x: rng.next(),
        y: rng.next(),
        worried: i < seeded ? 1 : 0,
        withdrawn: false,
        says: i < seeded ? "I heard the bank is in trouble…" : null,
      })),
    };
  },
  step(s, params, rng) {
    if (s.failed) return s;
    const insured = Boolean(params.insurance);
    const queueVisible = params.queueVisible !== false;
    const withdrawnShare = s.citizens.filter((c) => c.withdrawn).length / N;
    const heard = readCitizenDecisions(params.citizenDecisions);
    let cash = s.cash;
    const citizens = s.citizens.map((c) => {
      if (c.withdrawn) return c;
      const external = heard?.get(c.id);
      if (external) {
        if (external.withdraw) cash -= 1;
        return { ...c, worried: external.worried, withdrawn: external.withdraw, says: external.says, voiced: Boolean(external.says) };
      }
      const neighbours = s.citizens.filter((o) => o.id !== c.id && Math.hypot(o.x - c.x, o.y - c.y) < 0.25);
      const worriedNeighbours = neighbours.filter((o) => o.worried > 0.5).length;
      let worried = Math.min(1, c.worried * 0.9 + worriedNeighbours * 0.15 + (queueVisible ? withdrawnShare * 1.2 : 0));
      if (insured) worried *= 0.15; // deposits are safe whatever others do
      const withdraw = worried > 0.55 && rng.chance(worried);
      if (withdraw) cash -= 1;
      // A line a live citizen chose to say stays in the air until they act; the stock lines fill the silence.
      const kept = c.voiced && c.says ? c.says : null;
      return { ...c, worried, withdrawn: withdraw, says: withdraw ? "Getting my money out!" : (kept ?? (worried > 0.5 ? "People are queuing…" : null)), voiced: !withdraw && Boolean(kept) };
    });
    return { round: s.round + 1, citizens, cash, failed: cash < 0 };
  },
  observe(s) {
    return {
      round: s.round,
      withdrawnShare: Number((s.citizens.filter((c) => c.withdrawn).length / N).toFixed(3)),
      worriedShare: Number((s.citizens.filter((c) => c.worried > 0.5).length / N).toFixed(3)),
      bank: s.failed ? "collapsed" : "open",
    };
  },
  view(s) {
    return {
      kind: "population" as const,
      doors: s.failed ? ("shut" as const) : ("open" as const),
      agents: s.citizens.map((c) => ({ id: c.id, x: c.x, y: c.y, tint: c.worried, sprite: c.withdrawn ? "citizen-queue" : "citizen", bubble: c.says })),
    };
  },
};
