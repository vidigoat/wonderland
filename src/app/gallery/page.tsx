import type { Metadata } from "next";
import Link from "next/link";
import { PlaceScene } from "@/components/play/Scenes";
import { heroWorlds } from "@/worlds";

export const metadata: Metadata = {
  title: "The shelf",
  description: "Five worlds you can enter now. The law in each one is still yours to find.",
};

export default function GalleryPage() {
  const cards = heroWorlds.map((world) => ({
    id: world.id,
    title: world.title,
    tagline: world.tagline,
    concept: world.concept,
    archetype: world.archetype,
  }));

  return (
    <main className="gallery">
      <header className="landing-bar">
        <Link href="/" className="wordmark">
          Wonderland
        </Link>
        <p className="kicker">Five worlds</p>
      </header>
      <h1>The shelf</h1>
      <p className="gallery-lead">Already bound. The law in each one is still yours to find.</p>
      <ul className="shelf">
        {cards.map((card) => (
          <li key={card.id}>
            <Link href={`/w/${card.id}`} className="plate">
              <PlaceScene id={card.id} />
              <div className="plate-copy">
                <p className="kicker">{card.archetype}</p>
                <h2>{card.title}</h2>
                <p className="tagline">{card.tagline}</p>
                <p className="concept-line">{card.concept}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
