"use client";

import { useEffect, useRef, useState } from "react";
import { compileRules, type RulesModule } from "@/engine/rules";
import { asWorldView, type WorldView } from "@/engine/view";
import { builtinRules } from "@/worlds/builtins";
import { WorldStage } from "@/components/stage/WorldStage";
import { registerPaintedArt } from "@/engine/render/sprites";
import type { PublicWorldSpec } from "@/engine/spec";
import { drainSse, readPlayable, type PlayableSpec } from "./sse";
import { collectShots, countLines, type SeenCount } from "./capture";
import { defaultParams } from "./readings";

/** Keyed by the rules source, so a repaired world compiles again under the same id. */
const compiled = new Map<string, RulesModule | null>();

function rulesFor(spec: PlayableSpec): RulesModule | null {
  if (spec.rules.kind === "builtin") return builtinRules[spec.rules.module] ?? null;
  const source = spec.rules.source;
  if (!compiled.has(source)) {
    try {
      compiled.set(source, compileRules(source));
    } catch {
      compiled.set(source, null);
    }
  }
  return compiled.get(source) ?? null;
}

/** Matches MAX_VISION_REPAIRS on the server. */
const MAX_REPAIRS = 2;

export type WatchStep = { text: string; tone: "working" | "good" | "flag" };

/**
 * Stream a repair round. Calls back with each stage line; resolves with the repaired world, or null if
 * no repair passed every gate.
 */
async function repairWorld(worldId: string, onLine: (line: string) => void): Promise<PlayableSpec | null> {
  const res = await fetch("/api/repair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ worldId }),
  });
  if (!res.ok || !res.body) return null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let repaired: PlayableSpec | null = null;
  let saved = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = drainSse(buffer);
    buffer = rest;
    for (const event of events) {
      if (event.type === "stage") {
        onLine(event.message);
        if (event.stage === "done") saved = true;
      }
      if (event.type === "world") repaired = readPlayable(event.spec);
      if (event.type === "error") onLine(event.message);
    }
  }
  return saved ? repaired : null;
}

/**
 * The build screen runs the new world and asks Spark what it sees. If Spark flags it, its notes go to the
 * designer on the server, every gate runs again, and Spark watches the repaired world, at most twice.
 */
export function WorldWatch({ spec }: { spec: PlayableSpec }) {
  const root = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(spec);
  const [repairs, setRepairs] = useState(0);
  const [view, setView] = useState<WorldView | null>(null);
  const [params, setParams] = useState(() => defaultParams(spec as PublicWorldSpec));
  const [playing, setPlaying] = useState(true);
  const [steps, setSteps] = useState<WatchStep[]>([{ text: "Spark is watching this world run.", tone: "working" }]);

  useEffect(() => {
    registerPaintedArt(current.id, current.art.painted);
    const rules = rulesFor(current);
    if (!rules) return;
    let cancel = false;
    const say = (text: string, tone: WatchStep["tone"]) => {
      if (!cancel) setSteps((before) => [...before, { text, tone }]);
    };
    let handedOver = false;
    void collectShots(
      current as PublicWorldSpec,
      rules,
      () => root.current?.querySelector("canvas") ?? null,
      1,
      (next, nextParams) => {
        if (cancel) return;
        setView(asWorldView(next, current.archetype));
        setParams(nextParams);
      },
    )
      .then(async (frames) => {
        if (cancel) return;
        const res = await fetch("/api/playtest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worldId: current.id, frames }),
        });
        const body = (await res.json()) as { verdict?: string; notes?: unknown; source?: string; counts?: SeenCount[] };
        if (cancel) return;
        for (const line of countLines(Array.isArray(body.counts) ? body.counts : [])) say(line, "working");
        if (!res.ok || body.source === "sample") {
          const notes = Array.isArray(body.notes) ? body.notes.filter((item): item is string => typeof item === "string") : [];
          say(notes[0] ?? "Spark did not watch this world.", "flag");
          return;
        }
        if (body.verdict === "looks-right") {
          say(repairs > 0 ? "Watched again: the picture now shows what the numbers say." : "Looked right: the picture shows what the numbers say.", "good");
          return;
        }
        if (current.rules.kind !== "js" || repairs >= MAX_REPAIRS) {
          say("Spark flagged the picture. It plays as it is.", "flag");
          return;
        }
        say("Spark saw something the numbers didn't. Repairing it.", "flag");
        setPlaying(false);
        const fixed = await repairWorld(current.id, (line) => say(line, "working"));
        if (cancel) return;
        if (!fixed) {
          say("No repair passed every gate, so the world stays as it was.", "flag");
          return;
        }
        say("Spark is watching the repaired world.", "working");
        handedOver = true;
        setRepairs((count) => count + 1);
        setPlaying(true);
        setCurrent(fixed);
      })
      .catch(() => say("The playtester could not watch.", "flag"))
      .finally(() => {
        if (!cancel && !handedOver) setPlaying(false);
      });
    return () => {
      cancel = true;
    };
    // `repairs` is read for wording only; the watch restarts when the world itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <div className="bw-watch" ref={root} data-capture="yes">
      <p className="bw-watch-kicker">Playtester · Muse Spark 1.3</p>
      <div className="bw-watch-stage">
        <WorldStage
          view={view}
          archetype={current.archetype}
          worldId={current.id}
          artStyle={current.art.style}
          playing={playing}
          params={params}
        />
      </div>
      {rulesFor(current) ? (
        <ol className="bw-watch-steps" aria-live="polite">
          {steps.map((step, index) => (
            <li key={index} className="bw-watch-note" data-tone={step.tone}>
              {step.text}
            </li>
          ))}
        </ol>
      ) : (
        <p className="bw-watch-note">This world has no rules to watch.</p>
      )}
    </div>
  );
}
