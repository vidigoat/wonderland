import { createHash } from "node:crypto";
import { blobUpdateJson, blobStorage } from "./blob";

/**
 * Fair use on the public site. Building a world costs real model credit, so each visitor gets a few builds a
 * day and the whole site a daily total. The spend caps are the hard stop; this keeps one visitor from using
 * everyone's share. Off on this machine.
 */
type Day = { total: number; byVisitor: Record<string, number> };

export const BUILDS_PER_VISITOR = Number(process.env.BUILDS_PER_VISITOR ?? 3);
export const BUILDS_PER_DAY = Number(process.env.BUILDS_PER_DAY ?? 30);

/** A visitor key that never stores the address itself. */
export function visitorKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`wonderland:${address}`).digest("hex").slice(0, 16);
}

/** Decide whether this build may run, and count it if so. */
export function admit(day: Day, visitor: string, perVisitor = BUILDS_PER_VISITOR, perDay = BUILDS_PER_DAY): { day: Day; refusal: string | null } {
  if (day.total >= perDay) {
    return { day, refusal: "Today's building budget is used up. Every world on the shelf still plays, and building opens again tomorrow." };
  }
  if ((day.byVisitor[visitor] ?? 0) >= perVisitor) {
    return { day, refusal: `You've built ${perVisitor} worlds today, which is the daily share for each visitor. Every world on the shelf still plays.` };
  }
  return { day: { total: day.total + 1, byVisitor: { ...day.byVisitor, [visitor]: (day.byVisitor[visitor] ?? 0) + 1 } }, refusal: null };
}

/** Null when the build may go ahead; otherwise the sentence to show. */
export async function takeBuild(req: Request): Promise<string | null> {
  if (!blobStorage()) return null;
  const visitor = visitorKey(req);
  let refusal: string | null = null;
  await blobUpdateJson<Day>(`limits/${new Date().toISOString().slice(0, 10)}.json`, { total: 0, byVisitor: {} }, (day) => {
    const decided = admit(day, visitor);
    refusal = decided.refusal;
    return decided.day;
  });
  return refusal;
}
