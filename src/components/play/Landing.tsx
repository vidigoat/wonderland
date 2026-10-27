"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ClientPipelineEvent } from "@/engine/client-event";
import Image from "next/image";
import { ArrowDown, ArrowRight, GraduationCap, Presentation, Sparkles } from "lucide-react";
import { PaintedWall } from "@/components/landing/PaintedWall";
import { Pipeline } from "@/components/landing/Pipeline";
import { TryIt } from "@/components/landing/TryIt";
import { WorldThumb } from "@/components/landing/WorldThumb";
import type { PublicWorldSpec } from "@/engine/spec";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorMessage, statusRibbon } from "./http";
import { PlaceScene, SampleNote, type PlaceCard } from "./Scenes";
import { bindingView } from "./binding";
import { armChime, playChime } from "./chime";
import { missKind, missSentence, suggestWorlds } from "./suggest";
import { WorldWatch } from "./WorldWatch";
import { createMontagePacer, MONTAGE_GAP_MS } from "./pacer";
import { drainSse, toMontageItem, type MontageItem } from "./sse";
import { LogoMark } from "@/components/brand/Logo";

type LogEntry = MontageItem & { key: number };

/** A world the generator wrote, verified and bound. Public fields only. */
export type WrittenCard = { id: string; title: string; tagline: string; concept: string; archetype: string; spec?: PublicWorldSpec };

/** The four beats of a world, each shown with a real screenshot from the app. */
const STEPS = [
  {
    title: "Ask why anything works",
    body: "Bank runs, camouflage, orbits, SQL injection, traffic jams. Any question about how something works becomes the seed of a world.",
    image: "/landing/step-ask.webp",
    alt: "The question box with a question typed in",
  },
  {
    title: "Watch it get built, and checked",
    body: "Muse Spark Open finds the real law, designs a world around it and writes its rules as code. The code is run on every seed against the science. Then Muse Image paints it and SAM 3.1 cuts out its creatures.",
    image: "/landing/step-build.webp",
    alt: "The build screen ticking through its steps and science checks",
  },
  {
    title: "Experiment until you see it",
    body: "Predict, change one thing, run it again. Ada, an AI scientist on the same world, is racing you, and she only moves after you do.",
    image: "/landing/step-play.webp",
    alt: "A painted world with its controls and readings",
  },
  {
    title: "Say it, then prove it",
    body: "Put the law into words, typed or spoken. A judge model checks your idea without ever saying the answer. Then a new situation tests whether you really understood.",
    image: "/landing/step-prove.webp",
    alt: "The card you keep at the end, with the law still hidden",
  },
];

const WHO = [
  {
    icon: GraduationCap,
    title: "Learners",
    body: "Anyone who wants to understand, not just know. Every world takes a few minutes, and the answer is the one you found.",
  },
  {
    icon: Presentation,
    title: "Teachers",
    body: "Send a class a world instead of a worksheet. Everyone gets the same link and the same law to find, and each student keeps a card showing how long it took them.",
  },
  {
    icon: Sparkles,
    title: "The curious",
    body: "Ask the question you've wondered about for years. Two minutes later you're standing inside it.",
  },
];

const EXAMPLES = [
  "Why do fireflies end up flashing in sync?",
  "Why do traffic jams appear out of nowhere?",
  "Why does SQL injection work?",
  "Why do bank runs happen to healthy banks?",
  "How does natural selection make camouflage?",
];

export function Landing({
  places,
  written = [],
  demo,
  paintings = [],
}: {
  places: PlaceCard[];
  written?: WrittenCard[];
  demo?: PublicWorldSpec;
  paintings?: string[];
}) {
  const [concept, setConcept] = useState("");
  const [building, setBuilding] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [ribbon, setRibbon] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [example, setExample] = useState(0);
  const alive = useRef(true);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void fetch("/api/status")
      .then((res) => res.json())
      .then((data: unknown) => {
        if (live) setRibbon(statusRibbon(data));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  // The placeholder walks through real questions until the visitor types their own.
  useEffect(() => {
    if (concept) return;
    const id = window.setInterval(() => setExample((n) => (n + 1) % EXAMPLES.length), 3200);
    return () => window.clearInterval(id);
  }, [concept]);

  function choose(text: string) {
    setConcept(text);
    input.current?.focus();
  }

  async function onBuild(event: FormEvent) {
    event.preventDefault();
    const trimmed = concept.trim();
    if (!trimmed || building) return;
    armChime();
    setBuilding(true);
    setStopped(false);
    setLog([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: trimmed }),
      });
      if (!res.ok || !res.body) {
        const message = errorMessage(await res.text(), res.status);
        setLog([{ type: "error", message, key: 0 }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let key = 0;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const pacer = createMontagePacer<ClientPipelineEvent>({
        gapMs: reduce ? 0 : MONTAGE_GAP_MS,
        onItem: (eventItem) => {
          if (!alive.current) return;
          const item = toMontageItem(eventItem);
          if (!item) return;
          if (item.type === "stage" && !item.message && !item.notice) return;
          const entry = { ...item, key };
          key += 1;
          setLog((prev) => [...prev, entry]);
        },
      });
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const drained = drainSse(buffer);
        buffer = drained.rest;
        pacer.push(drained.events);
      }
      buffer += decoder.decode();
      const tail = drainSse(`${buffer}\n\n`);
      pacer.push(tail.events);
      pacer.close();
      await pacer.finished;
      if (alive.current) setStopped(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The build stopped.";
      if (alive.current) setLog((prev) => [...prev, { type: "error", message, key: prev.length }]);
    } finally {
      if (alive.current) setBuilding(false);
    }
  }

  const active = log.length > 0;

  return (
    <div className="bw land">
      <header className="bw-nav">
        <Link href="/" className="bw-logo">
          <LogoMark className="bw-logo-svg" />
          Wonderland
        </Link>
        <nav className="bw-links" aria-label="Site">
          <a href="#try">Try it</a>
          <a href="#how">How it plays</a>
          <a href="#inside">Under the hood</a>
          <Link href="/gallery">Worlds</Link>
        </nav>
        <Button asChild size="sm" className="bw-nav-cta">
          <a href="#ask">Ask a question</a>
        </Button>
      </header>

      <section className="land-hero" data-building={active ? "yes" : "no"} id="ask">
        <PaintedWall paintings={paintings} />
        <div className="land-hero-inner">
          {!active ? (
            <>
              <Badge variant="outline" className="land-badge">
                <Image src="/logos/meta.svg" alt="" width={14} height={14} className="bw-icon" />
                Built on Meta&apos;s Muse Spark Open, Muse Image and SAM 3.1
              </Badge>
              <h1 className="land-title">
                Don&apos;t ask AI for the answer.
                <br />
                Ask it for a world.
              </h1>
              <p className="land-lede">
                Type any &ldquo;why&rdquo; question. Wonderland builds a small living world where the answer is secretly at work, checks it against real science, and lets you
                discover it yourself, by experimenting, while an AI scientist races you to it.
              </p>
            </>
          ) : null}

          <form className="bw-ask land-ask" onSubmit={onBuild}>
            <label className="sr" htmlFor="concept">
              Your question
            </label>
            <Input
              ref={input}
              id="concept"
              name="concept"
              className="bw-ask-input"
              maxLength={300}
              required
              autoComplete="off"
              placeholder={EXAMPLES[example]}
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
            />
            <Button type="submit" size="lg" disabled={building} className="bw-ask-go">
              {building ? "Building…" : "Build my world"}
              {!building ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </form>

          {!active ? (
            <>
              <ul className="bw-chips land-chips" aria-label="Try one of these">
                {EXAMPLES.slice(1).map((text) => (
                  <li key={text}>
                    <Button type="button" variant="outline" size="sm" onClick={() => choose(text)}>
                      {text}
                    </Button>
                  </li>
                ))}
              </ul>
              <a href="#try" className="land-scroll">
                Or play one in thirty seconds <ArrowDown aria-hidden="true" />
              </a>
            </>
          ) : (
            <Binding log={log} stopped={stopped} concept={concept} shelf={places} demo={demo} />
          )}
          {ribbon ? <p className="bw-ribbon">{ribbon}</p> : null}
        </div>
      </section>

      {demo ? (
        <section id="try" className="land-section land-try" aria-labelledby="try-title">
          <div className="land-head">
            <h2 id="try-title" className="land-h2">
              Try it in thirty seconds
            </h2>
            <p className="land-sub">This is a real Wonderland world, running in your browser. No one will tell you the answer. That&apos;s the point.</p>
          </div>
          <TryIt spec={demo} />
        </section>
      ) : null}

      <section className="land-section land-why" aria-labelledby="why-title">
        <div className="land-why-stat">
          <p className="land-stat">−17</p>
          <p className="land-stat-label">
            points on a test of understanding, for people who learned a new skill with an AI assistant instead of working it out themselves.
          </p>
          <p className="land-src">Randomised trial, 52 engineers. Shen &amp; Tamkin, Anthropic, 2026.</p>
        </div>
        <div className="land-why-copy">
          <h2 id="why-title" className="land-h2">
            AI made answers free. Understanding still has to be earned.
          </h2>
          <p>
            Decades of learning research say the same thing: what you work out yourself sticks; what you&apos;re told fades. Answer engines skip the part that makes
            you understand.
          </p>
          <p>
            Wonderland keeps the AI and flips its job. It does the building, the science and the art. You do the thinking. The hidden rule never reaches your screen
            until a judge agrees you&apos;ve found it yourself.
          </p>
        </div>
      </section>

      <section id="how" className="land-section" aria-labelledby="how-title">
        <div className="land-head">
          <h2 id="how-title" className="land-h2">
            How it plays
          </h2>
          <p className="land-sub">One question in. About two minutes later, a world you can walk into.</p>
        </div>
        <ol className="land-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="land-step">
              <div className="land-shot">
                <Image src={step.image} alt={step.alt} width={1200} height={750} sizes="(max-width: 900px) 100vw, 50vw" />
              </div>
              <div className="land-step-copy">
                <span className="land-step-n">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="inside" className="land-section" aria-labelledby="inside-title">
        <div className="land-head">
          <h2 id="inside-title" className="land-h2">
            Under the hood: a team of Meta models
          </h2>
          <p className="land-sub">Four steps build every world, and four more agents join you while you play. A world only ships if its science passes on every random seed.</p>
        </div>
        <Pipeline />
      </section>

      <section className="land-section" aria-labelledby="who-title">
        <div className="land-head">
          <h2 id="who-title" className="land-h2">
            Who it&apos;s for
          </h2>
        </div>
        <div className="land-who">
          {WHO.map((who) => {
            const Icon = who.icon;
            return (
              <Card key={who.title} className="land-who-card">
                <CardHeader>
                  <Icon aria-hidden="true" className="land-who-icon" />
                  <CardTitle className="land-who-title">{who.title}</CardTitle>
                </CardHeader>
                <CardContent className="land-who-body">{who.body}</CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="land-section" aria-labelledby="worlds-title">
        <div className="bw-row">
          <div>
            <h2 id="worlds-title" className="land-h2">
              Step into a world
            </h2>
            <p className="land-sub">Five built by hand. The rest written, checked and painted by Meta&apos;s models on their own.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/gallery">
              Every world <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <ul className="bw-grid">
          {places.map((place) => (
            <li key={place.id}>
              <Link href={`/w/${place.id}`} className="bw-world">
                <PlaceScene id={place.id} />
                <span className="bw-world-copy">
                  <span className="bw-world-q">{place.concept}</span>
                  <span className="bw-world-t">{place.title}</span>
                </span>
              </Link>
            </li>
          ))}
          {written.map((world) => (
            <li key={world.id}>
              <Link href={`/w/${world.id}`} className="bw-world bw-world-written">
                {world.spec ? <WorldThumb spec={world.spec} /> : <span className={`scene scene-written scene-written-${world.archetype}`} aria-hidden="true" />}
                <span className="bw-world-copy">
                  <Badge variant="outline" className="bw-world-badge">
                    Written by Muse Spark Open
                  </Badge>
                  <span className="bw-world-q">{world.concept}</span>
                  <span className="bw-world-t">{world.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="land-cta">
        <PaintedWall paintings={paintings} quiet />
        <div className="land-cta-inner">
          <h2 className="land-h2">What do you want to understand?</h2>
          <p className="land-sub">Ask anything. Your world takes about two minutes to build, and it&apos;s yours to share.</p>
          <div className="bw-cta-row">
            <Button asChild size="lg">
              <a href="#ask">
                Ask a question <ArrowRight aria-hidden="true" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/w/peppered-forest">Play a world now</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bw-foot">
        <span className="bw-logo">
          <LogoMark className="bw-logo-svg" />
          Wonderland
        </span>
        <span>
          Built for the Meta Global AI Developer Hackathon, 2026 ·{" "}
          <a href="https://github.com/vidigoat/wonderland" className="land-foot-link">
            Source on GitHub
          </a>
        </span>
      </footer>
    </div>
  );
}

/** Seconds since the build began, so a long design step reads as work in progress, not a freeze. */
function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const id = window.setInterval(() => setSeconds(Math.floor((performance.now() - start) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return seconds;
}

function MissCard({ concept, message, shelf }: { concept: string; message: string; shelf: PlaceCard[] }) {
  const kind = missKind(message);
  const suggestion = suggestWorlds(concept, shelf);
  return (
    <div className="bw-miss">
      <p>{missSentence(kind)}</p>
      {suggestion ? (
        <>
          <p className="bw-watch-kicker">Three questions that will work</p>
          <ul>
            {suggestion.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <Button asChild size="lg" className="bw-enter">
            <Link href={`/w/${suggestion.closest.id}`}>
              Play {suggestion.closest.title} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </>
      ) : null}
    </div>
  );
}

function Binding({
  log,
  stopped,
  concept,
  shelf,
  demo,
}: {
  log: LogEntry[];
  stopped: boolean;
  concept: string;
  shelf: PlaceCard[];
  demo?: PublicWorldSpec;
}) {
  const view = bindingView(log);
  const working = !stopped && !view.ready && !view.error && !view.choose;
  const elapsed = useElapsed(working);
  const title = view.world?.title;
  useEffect(() => {
    if (!view.ready || !title) return;
    const previous = document.title;
    document.title = `${title} is ready — Wonderland`;
    playChime("held");
    return () => {
      document.title = previous;
    };
  }, [view.ready, title]);
  const current = working ? [...view.steps].reverse().find((step) => step.on)?.stage : undefined;
  const marks = view.checks ? Array.from({ length: view.checks.total }, (_, index) => index < view.checks!.passed) : [];
  return (
    <Card className="bw-build" aria-live="polite">
      <CardContent className="bw-build-body">
        <SampleNote notice={view.notice} />
        <ol className="bw-build-steps">
          {view.steps.map((step) => (
            <li key={step.stage} data-on={step.on ? "yes" : "no"} data-now={step.stage === current ? "yes" : undefined}>
              <span className="bw-build-dot" aria-hidden="true" />
              <span className="bw-build-label">{step.label}</span>
              <span className="bw-build-msg">{step.on ? step.message : view.world && step.stage === "artist" ? "Muse Image is painting, SAM 3.1 is cutting out…" : "Waiting"}</span>
            </li>
          ))}
        </ol>
        {working ? (
          <>
            <p className="bw-clock" aria-live="off">
              {view.world ? "Muse Image is painting" : "Muse Spark is working"} · {Math.floor(elapsed / 60)}:
              {String(elapsed % 60).padStart(2, "0")} · usually 2–5 minutes
            </p>
            <p className="bw-clock">You can close this tab. The build keeps going, and the world will be on the shelf.</p>
            {demo ? (
              <div className="bw-wait-game">
                <p className="bw-watch-kicker">While you wait, thirty seconds in Rumour Town.</p>
                <TryIt spec={demo} />
              </div>
            ) : null}
          </>
        ) : null}
        {marks.length ? (
          <p className="bw-checks" aria-label={`${view.checks?.passed ?? 0} of ${view.checks?.total ?? 0} science checks passed`}>
            {marks.map((held, index) => (
              <i key={index} data-held={held ? "yes" : "no"} style={held ? { animationDelay: `${index * 90}ms` } : undefined} />
            ))}
            <span>
              {view.checks?.passed} of {view.checks?.total} science checks passed
            </span>
          </p>
        ) : null}
        {view.art.background || view.art.sprites.length > 0 ? (
          <div className="bw-art" aria-hidden="true">
            {view.art.background ? <div className="bw-art-bg" style={{ backgroundImage: `url(${view.art.background})` }} /> : null}
            <div className="bw-art-sprites">
              {view.art.sprites.map((sprite) => (
                <div key={`${sprite.id}-${sprite.url}`} className="bw-art-sprite" style={{ backgroundImage: `url(${sprite.url})` }} />
              ))}
            </div>
          </div>
        ) : null}
        {view.ready && view.world?.playable ? <WorldWatch spec={view.world.playable} /> : null}
        {view.world ? (
          <div className="bw-built">
            <p className="bw-built-kicker">{view.ready || stopped ? "Your world is ready. The law stays hidden." : "The science holds. Now it's being painted."}</p>
            <p className="bw-built-title">{view.world.title}</p>
            <p className="bw-built-tag">{view.world.tagline}</p>
            {!view.ready && !stopped ? (
              <p className="bw-built-tag">Muse Image is painting the scene and SAM 3.1 is cutting out its creatures. About a minute.</p>
            ) : view.world.href ? (
              <Button asChild size="lg" className="bw-enter">
                <Link href={view.world.href}>
                  Enter the world <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <p className="bw-built-tag">This world couldn&apos;t be saved. Try asking again.</p>
            )}
          </div>
        ) : null}
        {view.choose || view.error ? (
          <MissCard concept={concept} message={view.error ?? view.choose?.message ?? ""} shelf={shelf} />
        ) : null}
        {stopped && !view.world && !view.choose && !view.error ? <p className="bw-built-tag">The build stopped before the world was finished. Try asking again.</p> : null}
      </CardContent>
    </Card>
  );
}
