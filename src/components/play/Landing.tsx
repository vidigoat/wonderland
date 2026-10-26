"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { ClientPipelineEvent } from "@/engine/client-event";
import { errorMessage, statusRibbon } from "./http";
import { PlaceScene, SampleNote, type PlaceCard } from "./Scenes";
import { bindingView } from "./binding";
import { drainSse, toMontageItem, type MontageItem } from "./sse";

type LogEntry = MontageItem & { key: number };

export function Landing({ places }: { places: PlaceCard[] }) {
  const [concept, setConcept] = useState("");
  const [building, setBuilding] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [ribbon, setRibbon] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

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
      const push = (eventItem: ClientPipelineEvent) => {
        const item = toMontageItem(eventItem);
        if (!item) return;
        if (item.type === "stage" && !item.message && !item.notice) return;
        const entry = { ...item, key };
        key += 1;
        setLog((prev) => [...prev, entry]);
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const drained = drainSse(buffer);
        buffer = drained.rest;
        drained.events.forEach(push);
      }
      buffer += decoder.decode();
      const tail = drainSse(`${buffer}\n\n`);
      tail.events.forEach(push);
      setStopped(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The build stopped.";
      setLog((prev) => [...prev, { type: "error", message, key: prev.length }]);
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="landing">
      {ribbon ? <p className="sample-ribbon">{ribbon}</p> : null}
      <div className="landing-body">
        <header className="landing-bar">
          <p className="wordmark">Wonderland</p>
          <Link href="/gallery">The shelf</Link>
        </header>
        <h1 className="law-line">
          <span>The AI builds the world.</span>
          <span>You find the law.</span>
        </h1>
        <form className="concept-form" onSubmit={onBuild}>
          <label className="concept-field">
            <span className="sr">Concept</span>
            <input
              name="concept"
              className="concept"
              maxLength={300}
              required
              placeholder="Why does… / How does…"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
            />
          </label>
          <button className="press" type="submit" disabled={building}>
            {building ? "Building" : "Build"}
          </button>
        </form>

        {log.length ? <Binding log={log} stopped={stopped} /> : (
          <div className="landing-scenes">
            <p className="scenes-label">Or enter a world already bound</p>
            <div className="scene-row">
              {places.map((place) => (
                <Link key={place.id} href={`/w/${place.id}`} className="place-link">
                  <PlaceScene id={place.id} />
                  <span className="place-name">{place.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Binding({ log, stopped }: { log: LogEntry[]; stopped: boolean }) {
  const view = bindingView(log);
  const marks = view.checks ? Array.from({ length: view.checks.total }, (_, index) => index < view.checks!.passed) : [];
  return (
    <section className="binding" aria-live="polite">
      <SampleNote notice={view.notice} />
      <ol className="binding-steps">
        {view.steps.map((step) => (
          <li key={step.stage} className={step.on ? "is-on" : ""}>
            <span>{step.label}</span>
            <p>{step.on ? step.message : "Waiting"}</p>
          </li>
        ))}
      </ol>
      {marks.length ? (
        <p className="binding-marks" aria-label={`${view.checks?.passed ?? 0} of ${view.checks?.total ?? 0} checks held`}>
          {marks.map((held, index) => (
            <i key={index} className={held ? "held" : ""} style={held ? { animationDelay: `${index * 80}ms` } : undefined} />
          ))}
          <span>
            {view.checks?.passed} / {view.checks?.total} held
          </span>
        </p>
      ) : null}
      {view.world ? (
        <div className="binding-world">
          <div className="binding-plate cutout">
            <PlaceScene id={view.world.id} />
          </div>
          <div>
            <p className="law-kept">
              The law stays <span aria-hidden="true">███</span>
            </p>
            <p className="galley-title">{view.world.title}</p>
            <p>{view.world.tagline}</p>
            <p className="aside">{view.world.concept}</p>
            {view.world.href ? (
              <Link className="press enter" href={view.world.href}>
                Enter
              </Link>
            ) : (
              <p className="aside">This one is not on the shelf yet.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="law-redacted law-kept" aria-label="The law stays hidden">
          The law stays <span aria-hidden="true">███</span>
        </p>
      )}
      {view.choose ? (
        <div className="choose">
          <p>{view.choose.message}</p>
          <ul className="choose-row">
            {view.choose.worlds.map((world) => (
              <li key={world.id}>
                <Link href={world.href} className="place-link">
                  <PlaceScene id={world.id} />
                  <span className="place-name">{world.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {view.error ? <p className="slip">{view.error}</p> : null}
      {stopped && !view.world && !view.choose && !view.error ? <p className="aside">The build stopped before a world was bound.</p> : null}
    </section>
  );
}
