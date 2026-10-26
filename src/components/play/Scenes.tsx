export type PlaceCard = {
  id: string;
  title: string;
  tagline: string;
  concept: string;
  archetype: string;
};

export function PlaceScene({ id }: { id: string }) {
  const figure = FIGURES[id] ?? "tree.svg";
  return (
    <div className={`scene scene-art scene-${id}`} style={{ backgroundImage: `url(/art/${id}/background.svg)` }} aria-hidden="true">
      <span className="scene-figure" style={{ backgroundImage: `url(/art/${id}/${figure})` }} />
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
