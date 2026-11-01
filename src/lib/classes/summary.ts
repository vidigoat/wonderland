/** A class code: a few lowercase letters, digits or dashes a teacher types. Never a name or an email. */
export const CLASS_CODE = /^[a-z0-9-]{2,32}$/;

export function readClassCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toLowerCase();
  return CLASS_CODE.test(code) ? code : null;
}

export type ClassPlay = { worldId: string; firstCorrect: boolean; verdict: string; transferCorrect: boolean; minutes: number; classCode?: string };

export type WorldTally = {
  worldId: string;
  finished: number;
  /** Said the law in their own words and the judge agreed. */
  discovered: number;
  /** Got the very first prediction right, before any experiment. */
  firstRight: number;
  /** Got the new situation right at the end: the proof they understood. */
  newCaseRight: number;
  /** Predicted wrong before experimenting, then got the new situation right: what the world itself taught. */
  learned: number;
  medianMinutes: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** What a class did, world by world, from anonymous finished plays. */
export function classSummary(plays: ClassPlay[], code: string): WorldTally[] {
  const mine = plays.filter((play) => play.classCode === code);
  const byWorld = new Map<string, ClassPlay[]>();
  for (const play of mine) byWorld.set(play.worldId, [...(byWorld.get(play.worldId) ?? []), play]);
  return [...byWorld.entries()]
    .map(([worldId, rows]) => ({
      worldId,
      finished: rows.length,
      discovered: rows.filter((row) => row.verdict === "discovered").length,
      firstRight: rows.filter((row) => row.firstCorrect).length,
      newCaseRight: rows.filter((row) => row.transferCorrect).length,
      learned: rows.filter((row) => !row.firstCorrect && row.transferCorrect).length,
      medianMinutes: Math.round(median(rows.map((row) => row.minutes)) * 10) / 10,
    }))
    .sort((a, b) => b.finished - a.finished);
}
