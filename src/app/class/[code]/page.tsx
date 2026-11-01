import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { classSummary, readClassCode, type WorldTally } from "@/lib/classes/summary";
import { readPlays } from "@/lib/study/store";
import { findWorldCached } from "@/worlds/find.server";

export const metadata: Metadata = { title: "Class results", robots: { index: false } };

export default function ClassPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <div className="bw">
      <header className="bw-nav">
        <Link href="/" className="bw-logo">
          <LogoMark className="bw-logo-svg" />
          Wonderland
        </Link>
        <nav className="bw-links" aria-label="Site">
          <Link href="/teach">Teach with it</Link>
        </nav>
      </header>
      <section className="bw-section teach">
        <Suspense fallback={<p className="bw-sub">Counting…</p>}>
          <Results params={params} />
        </Suspense>
      </section>
    </div>
  );
}

async function Results({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const code = readClassCode((await params).code);
  if (!code) return <p className="bw-sub">That isn&apos;t a class code. Codes are letters, numbers and dashes.</p>;
  const tallies = classSummary(await readPlays(), code);
  const titles = new Map<string, string>();
  for (const tally of tallies) titles.set(tally.worldId, (await findWorldCached(tally.worldId))?.title ?? tally.worldId);
  return (
    <>
      <h1 className="bw-h2">Class {code}</h1>
      <p className="bw-sub">Finished plays from your class link, with no names. A play counts once the student reaches the card at the end.</p>
      {tallies.length > 0 ? <ClassHeadline tallies={tallies} /> : null}
      {tallies.length === 0 ? (
        <p className="teach-hint">Nobody has finished a world with this code yet. Share the student link from the Teach page.</p>
      ) : (
        <div className="teach-table-wrap">
        <table className="teach-table">
          <thead>
            <tr>
              <th>World</th>
              <th>Finished</th>
              <th>Found the law</th>
              <th>Right on the new case</th>
              <th>Right before experimenting</th>
              <th>Wrong at first, right at the end</th>
              <th>Typical time</th>
            </tr>
          </thead>
          <tbody>
            {tallies.map((tally) => (
              <tr key={tally.worldId}>
                <td>
                  <Link href={`/w/${tally.worldId}`}>{titles.get(tally.worldId)}</Link>{" "}
                  <Link href={`/teach/${tally.worldId}`} className="teach-guide-link">
                    guide
                  </Link>
                </td>
                <td>{tally.finished}</td>
                <td>{tally.discovered}</td>
                <td>{tally.newCaseRight}</td>
                <td>{tally.firstRight}</td>
                <td>{tally.learned}</td>
                <td>{tally.medianMinutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </>
  );
}

/** The one sentence a teacher wants first: how many students the worlds themselves taught. */
function ClassHeadline({ tallies }: { tallies: WorldTally[] }) {
  const finished = tallies.reduce((sum, tally) => sum + tally.finished, 0);
  const newCaseRight = tallies.reduce((sum, tally) => sum + tally.newCaseRight, 0);
  const learned = tallies.reduce((sum, tally) => sum + tally.learned, 0);
  const wrongAtFirst = tallies.reduce((sum, tally) => sum + tally.finished - tally.firstRight, 0);
  return (
    <p className="class-headline">
      {newCaseRight} of {finished} {finished === 1 ? "play" : "plays"} ended with the new situation right.
      {wrongAtFirst > 0 ? ` Of the ${wrongAtFirst} that started with a wrong prediction, ${learned} got there by experimenting.` : ""}
    </p>
  );
}
