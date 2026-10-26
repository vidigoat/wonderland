import type { Observation } from "@/engine/rules";

/**
 * A line for something the player can already see.
 * It names the event, never the hidden law.
 */
export function witnessLine(worldId: string, previous: Observation | null, next: Observation | null): string | null {
  if (!next || !previous) return null;
  if (worldId === "gatekeeper") {
    if (next.vaultOpen === "open" && previous.vaultOpen !== "open") return "The vault is open.";
    if (next.scribeError === "error" && previous.scribeError !== "error") return "The scribe stopped.";
    return null;
  }
  if (worldId === "newtons-cannon") {
    if (next.status === "escaped" && previous.status !== "escaped") return "It left.";
    if (next.status === "landed" && previous.status === "flying") return "It met the ground.";
    const laps = Number(next.laps);
    const before = Number(previous.laps);
    if (next.status === "flying" && laps >= 0.5 && before < 0.5) return "It has not come down.";
    return null;
  }
  if (worldId === "rumour-town" && next.bank === "collapsed" && previous.bank !== "collapsed") return "The bank has closed its doors.";
  if (worldId === "firebreak") {
    if (next.crossing === "yes" && previous.crossing !== "yes") return "The far ridge is burning.";
    const burned = Number(next.burnedShare);
    if (next.stillBurning === "no" && previous.stillBurning === "yes" && next.crossing !== "yes" && burned > 0.02) {
      return "The fire stopped.";
    }
    return null;
  }
  if (worldId === "peppered-forest") {
    const shift = Math.abs(Number(next.meanDarkness) - Number(previous.meanDarkness));
    if (Number.isFinite(shift) && shift >= 0.15) return "The moths are not the colour they were.";
  }
  return null;
}

/** How the stage answers a line. Unknown sentences stay still. */
const BEATS = {
  "The vault is open.": "vault",
  "The scribe stopped.": "halt",
  "It left.": "leave",
  "It met the ground.": "land",
  "It has not come down.": "orbit",
  "The bank has closed its doors.": "bank",
  "The far ridge is burning.": "ridge",
  "The fire stopped.": "held",
  "The moths are not the colour they were.": "moths",
} as const;

export type WitnessBeat = (typeof BEATS)[keyof typeof BEATS];

export function witnessBeat(line: string | null): WitnessBeat | null {
  if (!line) return null;
  return line in BEATS ? BEATS[line as keyof typeof BEATS] : null;
}
