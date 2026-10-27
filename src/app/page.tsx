import { Suspense } from "react";
import { Landing, type WrittenCard } from "@/components/play/Landing";
import type { PlaceCard } from "@/components/play/Scenes";
import { listPublic } from "@/lib/storage/worlds";
import { toPublic } from "@/engine/spec";
import { getHeroWorld, heroWorlds } from "@/worlds";

const places: PlaceCard[] = heroWorlds.map((world) => ({
  id: world.id,
  title: world.title,
  tagline: world.tagline,
  concept: world.concept,
  archetype: world.archetype,
}));

/** The landing's product window plays Rumour Town live. */
const rumour = getHeroWorld("rumour-town");
const demo = rumour ? toPublic(rumour) : undefined;

/** Generated worlds change only on deploy, so the list is cached. */
async function writtenWorlds(): Promise<WrittenCard[]> {
  "use cache";
  const heroIds = new Set(heroWorlds.map((world) => world.id));
  return (await listPublic())
    .filter((world) => !heroIds.has(world.id))
    .map((world) => ({ id: world.id, title: world.title, tagline: world.tagline, concept: world.concept, archetype: world.archetype }));
}

async function LandingWithShelf() {
  return <Landing places={places} written={await writtenWorlds()} demo={demo} />;
}

export default function Home() {
  return (
    <Suspense fallback={<Landing places={places} demo={demo} />}>
      <LandingWithShelf />
    </Suspense>
  );
}
