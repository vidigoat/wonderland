import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { StudyFlow } from "@/components/study/StudyFlow";
import type { StudyArm } from "@/lib/study/score";

export const metadata: Metadata = {
  title: "The study",
  description: "Six anonymous minutes on natural selection. Read, or play, then answer the same questions.",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function StudyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<main className="study">Opening the study.</main>}>
      <Assigned searchParams={searchParams} />
    </Suspense>
  );
}

async function Assigned({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const given = one(params.id);
  const id = /^[0-9a-f-]{36}$/i.test(given) ? given : crypto.randomUUID();
  const asked = one(params.arm);
  const arm: StudyArm =
    asked === "read" || asked === "play" ? asked : Number.parseInt(id.replace(/-/g, "").slice(0, 2), 16) % 2 === 0 ? "read" : "play";
  return <StudyFlow id={id} arm={arm} test={one(params.test) === "1"} />;
}
