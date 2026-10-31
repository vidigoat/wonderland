import { cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { WorldThumb } from "@/components/landing/WorldThumb";
import { PlaceScene } from "@/components/play/Scenes";
import { shelfWorlds } from "@/worlds/shelf.server";
import { heroWorlds } from "@/worlds";
import { LogoMark } from "@/components/brand/Logo";
import { SUBJECTS, subjectOf } from "@/worlds/subjects";

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
        <Shelves />
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

/**
 * Every world on one shelf per subject. The five built by hand are marked; the rest began as one typed question.
 * Cached; a newly saved or repaired world refreshes the "worlds" tag.
 */
async function Shelves() {
  "use cache";
  cacheTag("worlds");
  const heroIds = new Set(heroWorlds.map((world) => world.id));
  const written = (await shelfWorlds()).filter((world) => !heroIds.has(world.id));
  const all = [
    ...heroWorlds.map((world) => ({ id: world.id, concept: world.concept, title: world.title, hero: true as const, spec: null })),
    ...written.map((world) => ({ id: world.id, concept: world.concept, title: world.title, hero: false as const, spec: world })),
  ];
  return (
    <>
      <h1 className="bw-h2">Every world</h1>
      <p className="bw-sub">
        {all.length} worlds. Each hides a real law, and nobody will tell you what it is. {written.length} of them began as one typed question: Meta&apos;s
        models found the law and built the world, and it passed every check before it reached this shelf.
      </p>
      {SUBJECTS.map((subject) => {
        const shelf = all.filter((world) => subjectOf(world.id, world.concept) === subject);
        if (shelf.length === 0) return null;
        return (
          <div key={subject} className="bw-shelf">
            <h2 className="bw-h2 bw-gallery-sub">{subject}</h2>
            <ul className="bw-grid">
              {shelf.map((world) => (
                <li key={world.id}>
                  <Link href={`/w/${world.id}`} className={world.hero ? "bw-world" : "bw-world bw-world-written"}>
                    {world.spec ? <WorldThumb spec={world.spec} /> : <PlaceScene id={world.id} />}
                    <span className="bw-world-copy">
                      {world.hero ? <span className="bw-world-tag">Built by hand</span> : null}
                      <span className="bw-world-q">{world.concept}</span>
                      <span className="bw-world-t">{world.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}
