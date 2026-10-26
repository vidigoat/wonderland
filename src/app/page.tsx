import { Landing } from "@/components/play/Landing";
import type { PlaceCard } from "@/components/play/Scenes";
import { heroWorlds } from "@/worlds";

export default function Home() {
  const places: PlaceCard[] = heroWorlds.map((world) => ({
    id: world.id,
    title: world.title,
    tagline: world.tagline,
    concept: world.concept,
    archetype: world.archetype,
  }));
  return <Landing places={places} />;
}
