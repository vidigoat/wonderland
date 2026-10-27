"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ClientPipelineEvent } from "@/engine/client-event";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Meadow } from "@/components/landing/Meadow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
    <div className="bw">
      <header className="bw-nav">
        <Link href="/" className="bw-logo">
          <span className="bw-logo-mark" aria-hidden="true" />
          Wonderland
        </Link>
        <nav className="bw-links" aria-label="Site">
          <a href="#how">How it works</a>
          <Link href="/gallery">Worlds</Link>
        </nav>
        <Button asChild size="sm" className="bw-nav-cta">
          <Link href="/w/gatekeeper">Play a world</Link>
        </Button>
      </header>

      <section className="bw-hero" data-building={active ? "yes" : "no"}>
        <Meadow className="bw-meadow" tone="mono" />
        <div className="bw-hero-inner">
          {!active ? (
            <>
              <Badge variant="outline" className="bw-eyebrow">
                <Image src="/logos/meta.svg" alt="" width={14} height={14} className="bw-icon" />
                Built on Meta&apos;s Muse Spark
              </Badge>
              <h1 className="bw-title">
                The AI builds the world.
                <br />
                <span className="bw-title-dim">You find the law.</span>
              </h1>
              <p className="bw-lede">Ask why anything works. Two minutes later you&apos;re standing inside it, with a hidden rule to discover and an AI rival racing you to it.</p>
            </>
          ) : null}

          <form className="bw-ask" onSubmit={onBuild}>
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
            <ul className="bw-chips" aria-label="Try one of these">
              {EXAMPLES.slice(1).map((text) => (
                <li key={text}>
                  <Button type="button" variant="outline" size="sm" onClick={() => choose(text)}>
                    {text}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Binding log={log} stopped={stopped} />
          )}
          {ribbon ? <p className="bw-ribbon">{ribbon}</p> : null}
        </div>
      </section>

      <section className="bw-logos" aria-label="Built with">
        <p>Powered by Meta&apos;s open and hosted models, served on partner infrastructure</p>
        <ul>
          <li>
            <Image src="/logos/meta.svg" alt="" width={22} height={22} className="bw-icon" />
            <span>Meta</span>
          </li>
          <li className="bw-wordmark">Muse Spark Open</li>
          <li className="bw-wordmark">Baseten</li>
          <li className="bw-wordmark">Fireworks AI</li>
          <li>
            <Image src="/logos/nextdotjs.svg" alt="" width={20} height={20} className="bw-icon" />
            <span>Next.js</span>
          </li>
          <li>
            <Image src="/logos/vercel.svg" alt="" width={18} height={18} className="bw-icon" />
            <span>Vercel</span>
          </li>
        </ul>
      </section>

      <section id="how" className="bw-section">
        <h2 className="bw-h2">How a world is made</h2>
        <p className="bw-sub">Three steps. The AI only ever does the first two.</p>
        <div className="bw-steps">
          <Card className="bw-card">
            <CardHeader>
              <span className="bw-step-n">01</span>
              <CardTitle className="bw-card-title">You ask</CardTitle>
            </CardHeader>
            <CardContent className="bw-card-body">Any question about how something works: a hack, a habitat, a market, a planet.</CardContent>
          </Card>
          <Card className="bw-card">
            <CardHeader>
              <span className="bw-step-n">02</span>
              <CardTitle className="bw-card-title">Muse Spark builds it</CardTitle>
            </CardHeader>
            <CardContent className="bw-card-body">It finds the real law, writes a living world around it, and runs science checks on every seed. Worlds that fail never ship.</CardContent>
          </Card>
          <Card className="bw-card">
            <CardHeader>
              <span className="bw-step-n">03</span>
              <CardTitle className="bw-card-title">You discover it</CardTitle>
            </CardHeader>
            <CardContent className="bw-card-body">Predict, poke, watch it happen. Nobody tells you the answer, and Ada, an AI scientist, races you on the same world.</CardContent>
          </Card>
        </div>
      </section>

      <section className="bw-section" aria-labelledby="worlds-title">
        <div className="bw-row">
          <div>
            <h2 id="worlds-title" className="bw-h2">
              Step into a world
            </h2>
            <p className="bw-sub">Hand-built worlds, and worlds Muse Spark Open wrote on its own.</p>
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
                <span className={`scene scene-written scene-written-${world.archetype}`} aria-hidden="true" />
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

      <section className="bw-section bw-why">
        <p className="bw-stat">−17</p>
        <p className="bw-stat-label">points on understanding, for people who learned with an AI assistant instead of working it out.</p>
        <Separator className="bw-sep" />
        <p className="bw-why-turn">Wonderland flips it. The AI does the building. You do the thinking.</p>
        <p className="bw-why-src">Randomised trial, 52 engineers. Shen &amp; Tamkin, 2026.</p>
      </section>

      <footer className="bw-foot">
        <span className="bw-logo">
          <span className="bw-logo-mark" aria-hidden="true" />
          Wonderland
        </span>
        <span>Meta Global AI Developer Hackathon, 2026</span>
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
    <Card className="bw-build" aria-live="polite">
      <CardContent className="bw-build-body">
        <SampleNote notice={view.notice} />
        <ol className="bw-build-steps">
          {view.steps.map((step) => (
            <li key={step.stage} data-on={step.on ? "yes" : "no"} data-now={step.stage === current ? "yes" : undefined}>
              <span className="bw-build-dot" aria-hidden="true" />
              <span className="bw-build-label">{step.label}</span>
              <span className="bw-build-msg">{step.on ? step.message : "Waiting"}</span>
            </li>
          ))}
        </ol>
        {working ? (
          <p className="bw-clock" aria-live="off">
            Muse Spark is working · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </p>
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
        {view.world ? (
          <div className="bw-built">
            <p className="bw-built-kicker">Your world is ready. The law stays hidden.</p>
            <p className="bw-built-title">{view.world.title}</p>
            <p className="bw-built-tag">{view.world.tagline}</p>
            {view.world.href ? (
              <Button asChild size="lg" className="bw-enter">
                <Link href={view.world.href}>
                  Enter the world <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <p className="bw-built-tag">This world isn&apos;t on the shelf yet.</p>
            )}
          </div>
        ) : null}
        {view.choose ? (
          <div className="bw-choose">
            <p>{view.choose.message}</p>
            <ul>
              {view.choose.worlds.map((world) => (
                <li key={world.id}>
                  <Button asChild variant="outline" size="sm">
                    <Link href={world.href}>{world.title}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {view.error ? <p className="bw-error">{view.error}</p> : null}
        {stopped && !view.world && !view.choose && !view.error ? <p className="bw-built-tag">The build stopped before the world was finished. Try asking again.</p> : null}
      </CardContent>
    </Card>
  );
}
