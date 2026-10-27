import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { summariseStudy } from "@/lib/study/score";
import { readStudy } from "@/lib/study/store";

export const metadata: Metadata = {
  title: "Study results",
  description: "Real replies only. Nothing here is simulated.",
};

function percent(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

function mark(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(1);
}

export default function StudyResultsPage() {
  return (
    <Suspense fallback={<main className="study">Counting real replies.</main>}>
      <Results />
    </Suspense>
  );
}

async function Results() {
  await connection();
  const summary = summariseStudy(await readStudy());
  return (
    <main className="study">
      <p className="kicker">Real replies only</p>
      <h1>{summary.n === 0 ? "No one has finished yet" : `${summary.n} finished`}</h1>
      <p className="study-essay">
        {summary.n === 0
          ? "There are no real replies yet. Test replies, from ?test=1, are not counted."
          : summary.small
            ? `Only ${summary.n} ${summary.n === 1 ? "person has" : "people have"} finished. That is too few to compare the two ways of learning.`
            : "Enough people have finished to compare the two ways."}
      </p>
      <table className="study-table">
        <thead>
          <tr>
            <th>Way</th>
            <th>People</th>
            <th>Questions right</th>
            <th>How sure</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Read</td>
            <td>{summary.read.n}</td>
            <td>{percent(summary.read.accuracy)}</td>
            <td>{mark(summary.read.confidence)}</td>
          </tr>
          <tr>
            <td>Play</td>
            <td>{summary.play.n}</td>
            <td>{percent(summary.play.accuracy)}</td>
            <td>{mark(summary.play.confidence)}</td>
          </tr>
        </tbody>
      </table>
      <p>
        <Link href="/study">Take part</Link>
      </p>
    </main>
  );
}
