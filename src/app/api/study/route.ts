import "server-only";
import { connection } from "next/server";
import { readStudyAnswers } from "@/lib/study/score";
import { saveStudy } from "@/lib/study/store";

/** POST one anonymous study reply. A test=1 reply is stored apart from the real results. */
export async function POST(req: Request) {
  await connection();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const answers = readStudyAnswers(body);
  if (!answers) return Response.json({ error: "the study reply is incomplete" }, { status: 400 });
  const saved = await saveStudy(answers);
  return Response.json({ correct: saved.correct, of: 4 });
}
