import type { Metadata } from "next";
import Link from "next/link";
import { cacheTag } from "next/cache";
import { LogoMark } from "@/components/brand/Logo";
import { ClassLinks } from "@/components/teach/ClassLinks";
import { heroWorlds } from "@/worlds";
import { shelfWorlds } from "@/worlds/shelf.server";

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
          <li>Share the student link. Open the results link after the lesson.</li>
        </ol>
        <ClassLinks worlds={worlds} />
      </section>
    </div>
  );
}
