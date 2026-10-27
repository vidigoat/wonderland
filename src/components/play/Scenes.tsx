import { heroArtUrl } from "@/worlds/hero-art";

export type PlaceCard = {
  id: string;
  title: string;
  tagline: string;
  concept: string;
  archetype: string;
};

export function PlaceScene({ id }: { id: string }) {
  const figure = FIGURES[id] ?? "tree.svg";
  const ground = heroArtUrl(id, "background", `/art/${id}/background.svg`);
  const figureUrl = heroArtUrl(id, figure.replace(/\.svg$/, ""), `/art/${id}/${figure}`);
  return (
    <div className={`scene scene-art scene-${id}`} style={{ backgroundImage: `url(${ground})` }} aria-hidden="true">
      <span className="scene-figure" style={{ backgroundImage: `url(${figureUrl})` }} />
    </div>
  );
}

const FIGURES: Record<string, string> = {
  gatekeeper: "scribe.svg",
  "peppered-forest": "moth.svg",
  "newtons-cannon": "planet.svg",
  "rumour-town": "citizen.svg",
  firebreak: "flame.svg",
};

export function SampleNote({ notice }: { notice?: string | null }) {
  if (!notice) return null;
  return (
    <p className="sample-note" role="status">
      {notice}
    </p>
  );
}
