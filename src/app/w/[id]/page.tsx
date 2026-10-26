import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Player } from "@/components/Player";
import { toPublic } from "@/engine/spec";
import { getHeroWorld, heroWorlds } from "@/worlds";

/** Hero worlds are prerendered. TODO(agent: gallery): generated worlds need a dynamic path (Suspense + "use cache"). */
export function generateStaticParams() {
  return heroWorlds.map((w) => ({ id: w.id }));
}

export default function WorldPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-4 py-10 text-neutral-500">Entering the world…</main>}>
      <World params={params} />
    </Suspense>
  );
}

async function World({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spec = getHeroWorld(id);
  if (!spec) notFound();
  const pub = toPublic(spec);
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm text-neutral-500">{pub.concept}</p>
      <h1 className="text-3xl font-semibold">{pub.title}</h1>
      <p className="mt-1 text-neutral-600 dark:text-neutral-400">{pub.tagline}</p>
      <div className="my-6 rounded-lg border p-4">
        <p>{pub.story.mystery}</p>
        <p className="mt-2 text-sm text-neutral-500">Goal: {pub.story.goal}</p>
      </div>
      <Player spec={pub} />
    </main>
  );
}
