import type { Metadata } from "next";
import Link from "next/link";
import { PlaceScene } from "@/components/play/Scenes";
import { listPublic } from "@/lib/storage/worlds";
import { heroWorlds } from "@/worlds";

export const metadata: Metadata = {
  title: "Worlds",
  description: "Every world you can step into now. The law in each one is still yours to find.",
};

export default function GalleryPage() {
  return (
    <div className="wl wl-gallery">
      <header className="wl-bar">
        <Link href="/" className="wl-mark">
          Wonderland
        </Link>
        <nav className="wl-nav" aria-label="Site">
          <Link href="/">Ask a question</Link>
        </nav>
      </header>
      <section className="wl-worlds wl-gallery-body">
        <h1 className="wl-h2">Every world</h1>
        <p className="wl-gallery-lead">Each one hides a real law. Nobody will tell you what it is.</p>
        <ul className="wl-world-grid">
          {heroWorlds.map((world) => (
            <li key={world.id}>
              <Link href={`/w/${world.id}`} className="wl-world">
                <PlaceScene id={world.id} />
                <span className="wl-world-copy">
                  <span className="wl-world-q">{world.concept}</span>
                  <span className="wl-world-t">{world.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <WrittenShelf />
      </section>
      <footer className="wl-foot">
        <span className="wl-mark">Wonderland</span>
        <span>Built with Meta&apos;s Muse Spark Open, Muse Spark, Muse Image and SAM 3.1.</span>
      </footer>
    </div>
  );
}

/** Worlds the generator wrote and verified (data/worlds). They change only on deploy, so the list is cached. */
async function WrittenShelf() {
  "use cache";
  const heroIds = new Set(heroWorlds.map((world) => world.id));
  const written = (await listPublic()).filter((world) => !heroIds.has(world.id));
  if (written.length === 0) return null;
  return (
    <>
      <h2 className="wl-h2 wl-gallery-sub">Written by Muse Spark Open</h2>
      <p className="wl-gallery-lead">
        Each began as one typed question. Meta&apos;s open-weights model found the law, built the world, and it passed every science check before it was saved.
      </p>
      <ul className="wl-world-grid">
        {written.map((world) => (
          <li key={world.id}>
            <Link href={`/w/${world.id}`} className="wl-world wl-world-written">
              <span className={`scene scene-written scene-written-${world.archetype}`} aria-hidden="true" />
              <span className="wl-world-copy">
                <span className="wl-world-q">{world.concept}</span>
                <span className="wl-world-t">{world.title}</span>
                <span className="wl-world-by">Written by Muse Spark Open</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
