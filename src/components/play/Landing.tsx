"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { ClientPipelineEvent } from "@/engine/client-event";
import { errorMessage, statusRibbon } from "./http";
import { PlaceScene, SampleNote, type PlaceCard } from "./Scenes";
import { drainSse, toMontageItem, type MontageItem } from "./sse";

const STAGE_LABEL: Record<string, string> = {
  scientist: "Scientist",
  designer: "Designer",
  checker: "Checks",
  repair: "Repair",
  artist: "Artist",
  playtester: "Play",
  done: "Bound",
};

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

  const hasDoor = log.some((item) => item.type === "world" || item.type === "choose");
  const hasError = log.some((item) => item.type === "error");
  const notices = log.map((item, index) => {
    const notice = "notice" in item ? item.notice : undefined;
    if (!notice) return null;
    const seen = log.slice(0, index).some((earlier) => "notice" in earlier && earlier.notice === notice);
    return seen ? null : notice;
  });

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

        {log.length ? (
          <div className="montage" aria-live="polite">
            {log.map((item, index) => {
              const notice = notices[index];
              return (
                <article key={item.key} className="galley">
                  <div className="galley-row">
                  {item.type === "stage" ? (
                    <>
                      <p className="kicker">{STAGE_LABEL[item.stage] ?? item.stage}</p>
                      <p>{item.message}</p>
                    </>
                  ) : null}
                  {item.type === "checks" ? (
                    <>
                      <p className="kicker">Checks</p>
                      <p className="num">
                        {item.passed} / {item.total} held
                      </p>
                    </>
                  ) : null}
                  {item.type === "world" ? (
                    <>
                      <p className="kicker">World</p>
                      <div>
                        <p className="galley-title">{item.title}</p>
                        <p>{item.tagline}</p>
                        <p className="aside">{item.concept}</p>
                        {item.href ? (
                          <Link className="press enter" href={item.href}>
                            Enter
                          </Link>
                        ) : (
                          <p className="aside">This one is not on the shelf yet.</p>
                        )}
                      </div>
                    </>
                  ) : null}
                  {item.type === "choose" ? (
                    <>
                      <p className="kicker">Choose</p>
                      <div>
                        <p>{item.message}</p>
                        <ul className="choose-list">
                          {item.worlds.map((world) => (
                            <li key={world.id}>
                              <Link href={world.href}>{world.title}</Link>
                              <span>{world.concept}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : null}
                  {item.type === "error" ? (
                    <>
                      <p className="kicker">Stopped</p>
                      <p>{item.message}</p>
                    </>
                  ) : null}
                  </div>
                  {notice ? <SampleNote notice={notice} /> : null}
                </article>
              );
            })}
            {stopped && !hasDoor && !hasError ? <p className="aside">The build stopped before a world was bound.</p> : null}
          </div>
        ) : (
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
