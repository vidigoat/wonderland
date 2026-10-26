import { randomInt } from "node:crypto";
import { connection } from "next/server";

/** A shared seed for the human and Ada. Local — not a model call. */
export async function POST() {
  await connection();
  return Response.json({
    seed: randomInt(1, 1_000_000_000),
    source: "local",
    notice: "This seed is minted on the server and shared with Ada so you both experiment on the same world.",
  });
}
