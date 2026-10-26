import type { RulesModule } from "@/engine/rules";

/**
 * Newton's Cannon — orbits.
 * Hidden law: an orbit is free fall with enough sideways speed that the ground curves away as fast as you fall.
 * Units: Earth radius = 1, GM = 1, so circular orbital speed at the surface = 1 and escape speed = √2.
 */
export type CannonState = { t: number; x: number; y: number; vx: number; vy: number; landed: boolean; escaped: boolean; trail: [number, number][]; angleTravelled: number; prevAngle: number };

const R = 1.02; // mountain top
const DT = 0.01;

export const newtonsCannon: RulesModule<CannonState> = {
  init(params) {
    const v = Number(params.speed ?? 0.5);
    return { t: 0, x: 0, y: R, vx: v, vy: 0, landed: false, escaped: false, trail: [[0, R]], angleTravelled: 0, prevAngle: Math.PI / 2 };
  },
  step(s) {
    if (s.landed || s.escaped) return s;
    let { x, y, vx, vy } = s;
    for (let i = 0; i < 4; i++) {
      // velocity Verlet, GM = 1
      const r3 = Math.pow(x * x + y * y, 1.5);
      const ax = -x / r3;
      const ay = -y / r3;
      x += vx * DT + 0.5 * ax * DT * DT;
      y += vy * DT + 0.5 * ay * DT * DT;
      const r3b = Math.pow(x * x + y * y, 1.5);
      vx += 0.5 * (ax + -x / r3b) * DT;
      vy += 0.5 * (ay + -y / r3b) * DT;
    }
    const r = Math.hypot(x, y);
    const angle = Math.atan2(y, x);
    let d = s.prevAngle - angle;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    const trail = s.trail.length % 2 === 0 ? [...s.trail, [x, y] as [number, number]].slice(-600) : s.trail;
    return {
      t: s.t + 4 * DT,
      x, y, vx, vy,
      landed: r < 1,
      escaped: r > 12,
      trail,
      angleTravelled: s.angleTravelled + Math.abs(d),
      prevAngle: angle,
    };
  },
  observe(s) {
    return {
      altitude: Number((Math.hypot(s.x, s.y) - 1).toFixed(4)),
      laps: Number((s.angleTravelled / (2 * Math.PI)).toFixed(3)),
      status: s.landed ? "landed" : s.escaped ? "escaped" : "flying",
      time: Number(s.t.toFixed(2)),
    };
  },
  view(s) {
    return { kind: "bodies", planet: { r: 1 }, ball: { x: s.x, y: s.y }, trail: s.trail };
  },
};
