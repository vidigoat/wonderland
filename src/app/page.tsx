import { cacheTag } from "next/cache";
import { Suspense } from "react";
import { Landing, type WrittenCard } from "@/components/play/Landing";
import type { PlaceCard } from "@/components/play/Scenes";
import { shelfWorlds } from "@/worlds/shelf.server";
import { toPublic } from "@/engine/spec";
import { getHeroWorld, heroWorlds } from "@/worlds";

const places: PlaceCard[] = heroWorlds.map((world) => ({
  id: world.id,
  title: world.title,
  tagline: world.tagline,
  concept: world.concept,
  archetype: world.archetype,
}));

/** The landing's "try it" plays Rumour Town. */
const rumour = getHeroWorld("rumour-town");
const demo = rumour ? toPublic(rumour) : undefined;

/** Generated worlds are cached; a newly saved world refreshes the "worlds" tag. */
async function writtenWorlds(): Promise<WrittenCard[]> {
  "use cache";
  cacheTag("worlds");
  const heroIds = new Set(heroWorlds.map((world) => world.id));
  return (await shelfWorlds())
    .filter((world) => !heroIds.has(world.id))
    .map((world) => ({ id: world.id, title: world.title, tagline: world.tagline, concept: world.concept, archetype: world.archetype, spec: world }));
}

/** Every painting Muse Image made, hand-built worlds first, for the drifting wall behind the hero. */
function paintingsOf(written: WrittenCard[]): string[] {
  const heroes = heroWorlds.map((world) => world.art.painted?.background).filter((url): url is string => Boolean(url));
  const generated = written.map((world) => world.spec?.art.painted?.background).filter((url): url is string => Boolean(url));
  return [...heroes, ...generated];
}

async function LandingWithShelf() {
  const written = await writtenWorlds();
  return <Landing places={places} written={written} demo={demo} paintings={paintingsOf(written)} />;
}

export default function Home() {
  return (
    <Suspense fallback={<Landing places={places} demo={demo} paintings={paintingsOf([])} />}>
      <LandingWithShelf />
    </Suspense>
  );
}
