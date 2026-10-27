import { cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { WorldThumb } from "@/components/landing/WorldThumb";
import { PlaceScene } from "@/components/play/Scenes";
import { listPublic } from "@/lib/storage/worlds";
import { heroWorlds } from "@/worlds";
import { LogoMark } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Worlds",
  description: "Every world you can step into now. The law in each one is still yours to find.",
};

export default function GalleryPage() {
  return (
    <div className="bw">
      <header className="bw-nav">
        <Link href="/" className="bw-logo">
          <LogoMark className="bw-logo-svg" />
          Wonderland
        </Link>
        <nav className="bw-links" aria-label="Site">
          <Link href="/">Ask a question</Link>
        </nav>
      </header>
      <section className="bw-section bw-gallery-body">
        <h1 className="bw-h2">Every world</h1>
        <p className="bw-sub">Each one hides a real law. Nobody will tell you what it is.</p>
        <ul className="bw-grid">
          {heroWorlds.map((world) => (
            <li key={world.id}>
              <Link href={`/w/${world.id}`} className="bw-world">
                <PlaceScene id={world.id} />
                <span className="bw-world-copy">
                  <span className="bw-world-q">{world.concept}</span>
                  <span className="bw-world-t">{world.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <WrittenShelf />
      </section>
      <footer className="bw-foot">
        <span className="bw-logo">
          <LogoMark className="bw-logo-svg" />
          Wonderland
        </span>
        <span>Built with Meta&apos;s Muse Spark Open, Muse Spark, Muse Image and SAM 3.1.</span>
      </footer>
    </div>
  );
}

/** Worlds the generator wrote and verified (data/worlds). Cached; a newly saved world refreshes the "worlds" tag. */
async function WrittenShelf() {
  "use cache";
  cacheTag("worlds");
  const heroIds = new Set(heroWorlds.map((world) => world.id));
  const written = (await listPublic()).filter((world) => !heroIds.has(world.id));
  if (written.length === 0) return null;
  return (
    <>
      <h2 className="bw-h2 bw-gallery-sub">Written by Muse Spark Open</h2>
      <p className="bw-sub">
        Each began as one typed question. Meta&apos;s open-weights model found the law, built the world, and it passed every science check before it was saved.
      </p>
      <ul className="bw-grid">
        {written.map((world) => (
          <li key={world.id}>
            <Link href={`/w/${world.id}`} className="bw-world bw-world-written">
              <WorldThumb spec={world} />
              <span className="bw-world-copy">
                <span className="bw-world-q">{world.concept}</span>
                <span className="bw-world-t">{world.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
