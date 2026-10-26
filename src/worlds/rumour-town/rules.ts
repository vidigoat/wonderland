import type { RulesModule } from "@/engine/rules";

/**
 * Rumour Town — bank runs (Diamond–Dybvig).
 * Hidden law: a solvent bank holds only a fraction of deposits as cash. If enough depositors *expect* others
 * to withdraw, withdrawing early is individually rational → self-fulfilling run. Deposit insurance removes the fear.
 *
 * This is the deterministic fallback brain. The showcase version replaces `decide` with Muse Glimmer agents
 * (src/agents/citizens.ts) — each citizen reads its neighbours' speech bubbles and decides. Checks always use this fallback.
 */
type Citizen = { id: number; x: number; y: number; worried: number; withdrawn: boolean; says: string | null };
export type TownState = { round: number; citizens: Citizen[]; cash: number; failed: boolean };

const N = 40;

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
    let cash = s.cash;
    const citizens = s.citizens.map((c) => {
      if (c.withdrawn) return c;
      const neighbours = s.citizens.filter((o) => o.id !== c.id && Math.hypot(o.x - c.x, o.y - c.y) < 0.25);
      const heard = neighbours.filter((o) => o.worried > 0.5).length;
      let worried = Math.min(1, c.worried * 0.9 + heard * 0.15 + (queueVisible ? withdrawnShare * 1.2 : 0));
      if (insured) worried *= 0.15; // deposits are safe whatever others do
      const withdraw = worried > 0.55 && rng.chance(worried);
      if (withdraw) cash -= 1;
      return { ...c, worried, withdrawn: withdraw, says: withdraw ? "Getting my money out!" : worried > 0.5 ? "People are queuing…" : null };
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
    return { kind: "population", agents: s.citizens.map((c) => ({ id: c.id, x: c.x, y: c.y, tint: c.worried, sprite: c.withdrawn ? "citizen-queue" : "citizen", bubble: c.says })) };
  },
};
