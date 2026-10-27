import "server-only";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { scoreStudy, type StudyAnswers, type StudyLine } from "./score";

function fileFor(test: boolean, dir: string): string {
  return path.join(dir, test ? "test.jsonl" : "responses.jsonl");
}

export async function saveStudy(answers: StudyAnswers, dir = path.join(process.cwd(), "data", "study")): Promise<StudyLine> {
  const line: StudyLine = { ...answers, correct: scoreStudy(answers.choices), at: new Date().toISOString() };
  await mkdir(dir, { recursive: true });
  await appendFile(fileFor(answers.test, dir), `${JSON.stringify(line)}\n`, "utf8");
  return line;
}

export async function readStudy(dir = path.join(process.cwd(), "data", "study")): Promise<StudyLine[]> {
  try {
    const text = await readFile(fileFor(false, dir), "utf8");
    return text
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean)
      .flatMap((row) => {
        try {
          const parsed = JSON.parse(row) as StudyLine;
          if (parsed.test) return [];
          return [parsed];
        } catch {
          return [];
        }
      });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export type PlayLine = {
  worldId: string;
  firstCorrect: boolean;
  verdict: string;
  transferCorrect: boolean;
  minutes: number;
  at: string;
};

export async function savePlay(line: Omit<PlayLine, "at">, dir = path.join(process.cwd(), "data", "plays")): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(line.worldId)) throw new Error("Invalid world id.");
  await mkdir(dir, { recursive: true });
  await appendFile(path.join(dir, "plays.jsonl"), `${JSON.stringify({ ...line, at: new Date().toISOString() })}\n`, "utf8");
}

export async function countPlays(dir = path.join(process.cwd(), "data", "plays")): Promise<number> {
  try {
    const text = await readFile(path.join(dir, "plays.jsonl"), "utf8");
    return text.split("\n").filter((row) => row.trim()).length;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}
