import "server-only";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { scoreStudy, type StudyAnswers, type StudyLine } from "./score";
import { blobGetText, blobUpdateJson, blobStorage } from "@/lib/storage/blob";

/** On Vercel, one JSON array per file in the Blob store; locally, one line per entry. */
async function appendBlob(pathname: string, entry: unknown): Promise<void> {
  await blobUpdateJson<unknown[]>(pathname, [], (rows) => [...rows, entry]);
}

async function readBlobRows(pathname: string): Promise<unknown[]> {
  const text = await blobGetText(pathname);
  return text ? (JSON.parse(text) as unknown[]) : [];
}

function fileFor(test: boolean, dir: string): string {
  return path.join(dir, test ? "test.jsonl" : "responses.jsonl");
}

export async function saveStudy(answers: StudyAnswers, dir?: string): Promise<StudyLine> {
  const line: StudyLine = { ...answers, correct: scoreStudy(answers.choices), at: new Date().toISOString() };
  if (!dir && blobStorage()) {
    await appendBlob(answers.test ? "study/test.json" : "study/responses.json", line);
    return line;
  }
  dir ??= path.join(process.cwd(), "data", "study");
  await mkdir(dir, { recursive: true });
  await appendFile(fileFor(answers.test, dir), `${JSON.stringify(line)}\n`, "utf8");
  return line;
}

export async function readStudy(dir?: string): Promise<StudyLine[]> {
  if (!dir && blobStorage()) return (await readBlobRows("study/responses.json")) as StudyLine[];
  dir ??= path.join(process.cwd(), "data", "study");
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
  /** A class code a teacher chose, when the student came by a class link. Never a name. */
  classCode?: string;
  at: string;
};

export async function savePlay(line: Omit<PlayLine, "at">, dir?: string): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(line.worldId)) throw new Error("Invalid world id.");
  if (!dir && blobStorage()) return appendBlob("plays/plays.json", { ...line, at: new Date().toISOString() });
  dir ??= path.join(process.cwd(), "data", "plays");
  await mkdir(dir, { recursive: true });
  await appendFile(path.join(dir, "plays.jsonl"), `${JSON.stringify({ ...line, at: new Date().toISOString() })}\n`, "utf8");
}

export async function countPlays(dir?: string): Promise<number> {
  if (!dir && blobStorage()) return (await readBlobRows("plays/plays.json")).length;
  dir ??= path.join(process.cwd(), "data", "plays");
  try {
    const text = await readFile(path.join(dir, "plays.jsonl"), "utf8");
    return text.split("\n").filter((row) => row.trim()).length;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

/** Every finished play, oldest first. */
export async function readPlays(dir?: string): Promise<PlayLine[]> {
  if (!dir && blobStorage()) return (await readBlobRows("plays/plays.json")) as PlayLine[];
  dir ??= path.join(process.cwd(), "data", "plays");
  try {
    const text = await readFile(path.join(dir, "plays.jsonl"), "utf8");
    return text
      .split("\n")
      .filter((row) => row.trim())
      .flatMap((row) => {
        try {
          return [JSON.parse(row) as PlayLine];
        } catch {
          return [];
        }
      });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
