import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { sentenceLabel } from "@/agents/wording";
import { LogoMark } from "@/components/brand/Logo";
import { ClassLinks } from "@/components/teach/ClassLinks";
import { PrintButton } from "@/components/teach/PrintButton";
import { heroWorlds } from "@/worlds";
import { findWorldCached } from "@/worlds/find.server";
import { standardOf } from "@/worlds/standards";
import { subjectOf } from "@/worlds/subjects";

export function generateStaticParams() {
  return heroWorlds.map((world) => ({ world: world.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ world: string }> }): Promise<Metadata> {
  const spec = await findWorldCached((await params).world);
  return spec ? { title: `Lesson guide: ${spec.title}`, description: `Teach "${spec.concept}" with a world your students discover for themselves.` } : { title: "Missing world" };
}

export default function LessonGuidePage({ params }: { params: Promise<{ world: string }> }) {
  return (
    <div className="bw">
      <header className="bw-nav">
        <Link href="/" className="bw-logo">
          <LogoMark className="bw-logo-svg" />
          Wonderland
        </Link>
        <nav className="bw-links" aria-label="Site">
          <Link href="/teach">All lesson guides</Link>
        </nav>
      </header>
      <section className="bw-section teach guide">
        <Suspense fallback={<p className="bw-sub">Opening the guide…</p>}>
          <Guide params={params} />
        </Suspense>
      </section>
    </div>
  );
}

/**
 * One page a teacher can print: what the world teaches, how the lesson runs, the wrong ideas to listen for and
 * questions for afterwards. Never the hidden law, the new situation or its answer: students can open this page too,
 * which is also why the wrong ideas, which sometimes name the right one, start folded away.
 */
async function Guide({ params }: { params: Promise<{ world: string }> }) {
  const spec = await findWorldCached((await params).world);
  if (!spec) notFound();
  const standard = standardOf(spec.id);
  const controls = spec.knobs.map((knob) => midSentence(sentenceLabel(knob.label)));
  const firstReading = midSentence(spec.observables[0]?.label ?? "what they measured");
  return (
    <>
      <p className="guide-kicker">Lesson guide</p>
      <h1 className="bw-h2">{spec.title}</h1>
      <p className="guide-question">{spec.concept}</p>
      <dl className="guide-facts">
        <div>
          <dt>Subject</dt>
          <dd>{subjectOf(spec.id, spec.concept)}</dd>
        </div>
        <div>
          <dt>Fits</dt>
          <dd>{standard ? (standard.code ? `${standard.code}: ${standard.label}` : standard.label) : "A world built from a teacher's or student's own question"}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>About 10 to 15 minutes, then a discussion</dd>
        </div>
        <div>
          <dt>Needs</dt>
          <dd>A phone, tablet or laptop each, or in pairs. No accounts and no names.</dd>
        </div>
      </dl>

      <h2 className="guide-h">What students do</h2>
      <ol className="teach-steps">
        <li>Predict what will happen, before touching anything. Their first guess is recorded.</li>
        <li>Experiment: change {joinWords(controls)}, run the world and compare what they see.</li>
        <li>Say the rule in their own words. The judge never tells them; if they&apos;re not there yet, it suggests one more experiment.</li>
        <li>Prove it on a situation they haven&apos;t seen. If they understood the rule, they can predict it.</li>
        <li>Keep the card with the rule they found.</li>
      </ol>
      <p className="teach-hint">Ada, an AI scientist, races them to the rule. Students who finish early can try to beat her.</p>

      <h2 className="guide-h">Wrong ideas to listen for</h2>
      <p className="teach-hint">Students often arrive with these. The world is built so that an experiment can prove each one wrong.</p>
      <details className="guide-spoiler">
        <summary>Show them. Some give the rule away, so keep this closed while students play.</summary>
        <ul className="guide-list">
          {spec.science.misconceptions.map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      </details>

      <h2 className="guide-h">Questions for afterwards</h2>
      <ul className="guide-list">
        <li>What did you predict at the start, and what happened instead?</li>
        <li>Which control changed {firstReading} the most? Did any change nothing at all?</li>
        <li>Say the rule in one sentence. Does everyone&apos;s sentence mean the same thing?</li>
        <li>Where have you seen this happen outside the world?</li>
      </ul>

      <h2 className="guide-h no-print">Your class link</h2>
      <div className="no-print">
        <ClassLinks worlds={[{ id: spec.id, title: spec.title, concept: spec.concept }]} />
      </div>

      <h2 className="guide-h">What your results page shows</h2>
      <ul className="guide-list">
        <li>How many students found the rule, in their own words, by the judge&apos;s reckoning.</li>
        <li>How many got the new situation right: the evidence they understood it, not just guessed it.</li>
        <li>How many predicted wrong at the start and got the new situation right at the end: what the world itself taught them.</li>
      </ul>
      <div className="guide-actions no-print">
        <PrintButton />
        <Link href={`/w/${spec.id}`} className="teach-try">
          Play it yourself first
        </Link>
      </div>
    </>
  );
}

/** "Moth colour" reads "moth colour" mid-sentence; "CO₂ level" keeps its capitals. */
function midSentence(label: string): string {
  return /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "the controls";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
