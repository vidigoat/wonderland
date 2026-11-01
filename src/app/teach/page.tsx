import type { Metadata } from "next";
import Link from "next/link";
import { cacheTag } from "next/cache";
import { LogoMark } from "@/components/brand/Logo";
import { ClassLinks } from "@/components/teach/ClassLinks";
import { heroWorlds } from "@/worlds";
import { shelfWorlds } from "@/worlds/shelf.server";
import { standardOf } from "@/worlds/standards";
import { SUBJECTS, subjectOf } from "@/worlds/subjects";

export const metadata: Metadata = {
  title: "Teach with it",
  description: "Give your class a world to discover. No accounts, no names. See how many found the law.",
};

async function worldChoices() {
  "use cache";
  cacheTag("worlds");
  const heroIds = new Set(heroWorlds.map((world) => world.id));
  const written = (await shelfWorlds()).filter((world) => !heroIds.has(world.id));
  return [...heroWorlds, ...written].map((world) => ({ id: world.id, title: world.title, concept: world.concept }));
}

export default async function TeachPage() {
  const worlds = await worldChoices();
  return (
    <div className="bw">
      <header className="bw-nav">
        <Link href="/" className="bw-logo">
          <LogoMark className="bw-logo-svg" />
          Wonderland
        </Link>
        <nav className="bw-links" aria-label="Site">
          <Link href="/gallery">Worlds</Link>
        </nav>
      </header>
      <section className="bw-section teach">
        <h1 className="bw-h2">Teach with it</h1>
        <p className="bw-sub">
          Give your class a world instead of an explanation. Each student predicts, experiments, says the law in their own words and proves it on a new
          case. Nobody tells them the answer, not even the AI. You see how many got there.
        </p>
        <ol className="teach-steps">
          <li>Pick a world, or build one from your own question on the home page.</li>
          <li>Choose a class code. Students need no account and give no name.</li>
          <li>Share the student link, or put its QR code on the board. Open the results link after the lesson.</li>
        </ol>
        <ClassLinks worlds={worlds} />
        <h2 className="guide-h">Lesson guides</h2>
        <p className="teach-hint">
          One printable page per world: the standard it fits, how the lesson runs, the wrong ideas to listen for and questions for afterwards.
        </p>
        {SUBJECTS.map((subject) => {
          const here = worlds.filter((world) => subjectOf(world.id, world.concept) === subject);
          if (here.length === 0) return null;
          return (
            <div key={subject} className="guide-shelf">
              <h3>{subject}</h3>
              <ul>
                {here.map((world) => {
                  const standard = standardOf(world.id);
                  return (
                    <li key={world.id}>
                      <Link href={`/teach/${world.id}`}>{world.title}</Link>
                      <span>{world.concept}</span>
                      {standard?.code ? <em>{standard.code}</em> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
