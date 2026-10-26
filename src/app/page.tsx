import Link from "next/link";
import { heroWorlds } from "@/worlds";

/** SCAFFOLD HOME. TODO(agent: frontend): the real landing — concept box → live build montage → world. */
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-5xl font-semibold tracking-tight">Wonderland</h1>
      <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">AI that builds the world, not the answer.</p>
      <form className="mt-8 flex gap-2" action="#">
        <input name="concept" placeholder="Why does… / How does…" className="flex-1 rounded-lg border px-4 py-3" disabled />
        <button className="rounded-lg bg-black px-5 py-3 text-white opacity-50" disabled>
          Build
        </button>
      </form>
      <h2 className="mt-12 mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Hero worlds</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {heroWorlds.map((w) => (
          <li key={w.id}>
            <Link href={`/w/${w.id}`} className="block rounded-lg border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <p className="text-xs text-neutral-500">{w.concept}</p>
              <p className="mt-1 font-medium">{w.title}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{w.tagline}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
