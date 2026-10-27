import type { Metadata } from "next";
import Link from "next/link";
import { PlaceScene } from "@/components/play/Scenes";
import { listPublic } from "@/lib/storage/worlds";
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
                <h2>{card.title}</h2>
                <p className="tagline">{card.tagline}</p>
                <p className="concept-line">{card.concept}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <WrittenShelf />
    </main>
  );
}

/** Worlds the generator wrote and verified (data/worlds). They change only on deploy, so the list is cached. */
async function WrittenShelf() {
  "use cache";
  const heroIds = new Set(heroWorlds.map((world) => world.id));
  const written = (await listPublic()).filter((world) => !heroIds.has(world.id));
  return (
    <>
      {written.length > 0 ? (
        <section className="written-shelf">
          <h2>Written by Muse Spark Open</h2>
          <p className="gallery-lead">
            Each began as one typed question. Meta&apos;s open-weights model found the law, built the world, and it passed every science check before it was bound.
          </p>
          <ul className="shelf">
            {written.map((world) => (
              <li key={world.id}>
                <Link href={`/w/${world.id}`} className="plate">
                  <div className={`scene scene-written scene-written-${world.archetype}`} aria-hidden="true">
                    <span>{world.archetype}</span>
                  </div>
                  <div className="plate-copy">
                    <h2>{world.title}</h2>
                    <p className="tagline">{world.tagline}</p>
                    <p className="concept-line">{world.concept}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
