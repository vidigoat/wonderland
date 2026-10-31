import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlayLoop } from "@/components/play/PlayLoop";
import { toPublic } from "@/engine/spec";
import { heroWorlds } from "@/worlds";
import { findWorldCached } from "@/worlds/find.server";

export function generateStaticParams() {
  return heroWorlds.map((world) => ({ id: world.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const spec = await findWorldCached(id);
  if (!spec) return { title: "Missing world" };
  const pub = toPublic(spec);
  return { title: pub.title, description: pub.tagline };
}

export default function WorldPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="entering">The page is being turned…</main>}>
      <World params={params} />
    </Suspense>
  );
}

async function World({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spec = await findWorldCached(id);
  if (!spec) notFound();
  return <PlayLoop key={spec.id} spec={toPublic(spec)} />;
}
