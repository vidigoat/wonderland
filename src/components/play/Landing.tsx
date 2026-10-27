"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ClientPipelineEvent } from "@/engine/client-event";
import { Meadow } from "@/components/landing/Meadow";
import { errorMessage, statusRibbon } from "./http";
import { PlaceScene, SampleNote, type PlaceCard } from "./Scenes";
import { bindingView } from "./binding";
import { createMontagePacer, MONTAGE_GAP_MS } from "./pacer";
import { drainSse, toMontageItem, type MontageItem } from "./sse";

type LogEntry = MontageItem & { key: number };

/** A world the generator wrote, verified and bound. Public fields only. */
export type WrittenCard = { id: string; title: string; tagline: string; concept: string; archetype: string };

const EXAMPLES = [
  "Why do fireflies end up flashing in sync?",
  "Why do traffic jams appear out of nowhere?",
  "Why does SQL injection work?",
  "Why do bank runs happen to healthy banks?",
  "How does natural selection make camouflage?",
];

export function Landing({ places, written = [] }: { places: PlaceCard[]; written?: WrittenCard[] }) {
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
    <div className="wl">
      <section className="wl-hero" data-building={active ? "yes" : "no"}>
        <Meadow className="wl-meadow" />
        <header className="wl-bar">
          <Link href="/" className="wl-mark">
            Wonderland
          </Link>
          <nav className="wl-nav" aria-label="Site">
            <a href="#how">How it works</a>
            <Link href="/gallery">Worlds</Link>
          </nav>
        </header>

        <div className="wl-hero-body">
          {!active ? (
            <>
              <h1 className="wl-title">
                The AI builds the world.
                <br />
                You find the law.
              </h1>
              <p className="wl-lede">Ask why anything works. In about two minutes you&apos;re standing inside it, with a hidden rule to discover and a rival racing you to it.</p>
            </>
          ) : null}

          <form className="wl-ask" onSubmit={onBuild}>
            <label className="sr" htmlFor="concept">
              Your question
            </label>
            <input
              ref={input}
              id="concept"
              name="concept"
              className="wl-ask-input"
              maxLength={300}
              required
              autoComplete="off"
              placeholder={EXAMPLES[example]}
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
            />
            <button className="wl-ask-go" type="submit" disabled={building}>
              {building ? "Building…" : "Build my world"}
            </button>
          </form>

          {!active ? (
            <ul className="wl-chips" aria-label="Try one of these">
              {EXAMPLES.slice(1).map((text) => (
                <li key={text}>
                  <button type="button" onClick={() => choose(text)}>
                    {text}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Binding log={log} stopped={stopped} />
          )}
          {ribbon ? <p className="wl-ribbon">{ribbon}</p> : null}
        </div>

        {!active ? (
          <aside className="wl-ada" aria-label="Ada, your rival">
            <span className="wl-ada-orb" aria-hidden="true" />
            <p>
              <strong>Ada</strong>
              I&apos;ll race you to it.
            </p>
          </aside>
        ) : null}
      </section>

      <section id="how" className="wl-how">
        <h2 className="wl-h2">How a world is made</h2>
        <ol className="wl-steps">
          <li>
            <span className="wl-step-n">1</span>
            <h3>You ask</h3>
            <p>Any question about how something works: a hack, a habitat, a market, a planet.</p>
          </li>
          <li>
            <span className="wl-step-n">2</span>
            <h3>Meta&apos;s model builds it</h3>
            <p>Muse Spark finds the real law, writes a living world around it, and runs science checks on every seed. Worlds that fail never ship.</p>
          </li>
          <li>
            <span className="wl-step-n">3</span>
            <h3>You discover it</h3>
            <p>Predict, poke, watch it happen. The AI never tells you the answer. Ada, an AI scientist, races you on the same world.</p>
          </li>
        </ol>
      </section>

      <section className="wl-worlds" aria-labelledby="worlds-title">
        <div className="wl-worlds-head">
          <h2 id="worlds-title" className="wl-h2">
            Step into a world
          </h2>
          <Link href="/gallery" className="wl-link">
            See every world
          </Link>
        </div>
        <ul className="wl-world-grid">
          {places.map((place) => (
            <li key={place.id}>
              <Link href={`/w/${place.id}`} className="wl-world">
                <PlaceScene id={place.id} />
                <span className="wl-world-copy">
                  <span className="wl-world-q">{place.concept}</span>
                  <span className="wl-world-t">{place.title}</span>
                </span>
              </Link>
            </li>
          ))}
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
      </section>

      <section className="wl-why">
        <p className="wl-why-stat">
          People who learned with an AI assistant scored <em>17 points lower</em> on understanding than people who worked it out themselves.
        </p>
        <p className="wl-why-turn">Wonderland flips it: the AI does the building, and you do the thinking.</p>
        <p className="wl-why-src">Randomised trial, 52 engineers. Shen &amp; Tamkin, 2026.</p>
      </section>

      <footer className="wl-foot">
        <span className="wl-mark">Wonderland</span>
        <span>Built with Meta&apos;s Muse Spark Open, Muse Spark, Muse Image and SAM 3.1.</span>
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

function Binding({ log, stopped }: { log: LogEntry[]; stopped: boolean }) {
  const view = bindingView(log);
  const working = !stopped && !view.world && !view.error && !view.choose;
  const elapsed = useElapsed(working);
  const current = working ? [...view.steps].reverse().find((step) => step.on)?.stage : undefined;
  const marks = view.checks ? Array.from({ length: view.checks.total }, (_, index) => index < view.checks!.passed) : [];
  return (
    <section className="wl-build" aria-live="polite">
      <SampleNote notice={view.notice} />
      <ol className="wl-build-steps">
        {view.steps.map((step) => (
          <li key={step.stage} data-on={step.on ? "yes" : "no"} data-now={step.stage === current ? "yes" : undefined}>
            <span className="wl-build-dot" aria-hidden="true" />
            <span className="wl-build-label">{step.label}</span>
            <span className="wl-build-msg">{step.on ? step.message : "Waiting"}</span>
          </li>
        ))}
      </ol>
      {working ? (
        <p className="wl-clock" aria-live="off">
          Muse Spark is working · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </p>
      ) : null}
      {marks.length ? (
        <p className="wl-checks" aria-label={`${view.checks?.passed ?? 0} of ${view.checks?.total ?? 0} science checks passed`}>
          {marks.map((held, index) => (
            <i key={index} data-held={held ? "yes" : "no"} style={held ? { animationDelay: `${index * 90}ms` } : undefined} />
          ))}
          <span>
            {view.checks?.passed} of {view.checks?.total} science checks passed
          </span>
        </p>
      ) : null}
      {view.world ? (
        <div className="wl-built">
          <p className="wl-built-kicker">Your world is ready. The law stays hidden.</p>
          <p className="wl-built-title">{view.world.title}</p>
          <p className="wl-built-tag">{view.world.tagline}</p>
          {view.world.href ? (
            <Link className="wl-ask-go wl-enter" href={view.world.href}>
              Enter the world
            </Link>
          ) : (
            <p className="wl-built-tag">This world isn&apos;t on the shelf yet.</p>
          )}
        </div>
      ) : null}
      {view.choose ? (
        <div className="wl-choose">
          <p>{view.choose.message}</p>
          <ul>
            {view.choose.worlds.map((world) => (
              <li key={world.id}>
                <Link href={world.href} className="wl-link">
                  {world.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {view.error ? <p className="wl-error">{view.error}</p> : null}
      {stopped && !view.world && !view.choose && !view.error ? <p className="wl-built-tag">The build stopped before the world was finished. Try asking again.</p> : null}
    </section>
  );
}
