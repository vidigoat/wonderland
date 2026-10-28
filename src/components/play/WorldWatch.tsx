"use client";

import { useEffect, useRef, useState } from "react";
import { compileRules, type RulesModule } from "@/engine/rules";
import { asWorldView, type WorldView } from "@/engine/view";
import { builtinRules } from "@/worlds/builtins";
import { WorldStage } from "@/components/stage/WorldStage";
import { registerPaintedArt } from "@/engine/render/sprites";
import type { PublicWorldSpec } from "@/engine/spec";
import type { PlayableSpec } from "./sse";
import { collectShots } from "./capture";
import { defaultParams } from "./readings";

const compiled = new Map<string, RulesModule | null>();

function rulesFor(spec: PlayableSpec): RulesModule | null {
  if (spec.rules.kind === "builtin") return builtinRules[spec.rules.module] ?? null;
  if (!compiled.has(spec.id)) {
    try {
      compiled.set(spec.id, compileRules(spec.rules.source));
    } catch {
      compiled.set(spec.id, null);
    }
  }
  return compiled.get(spec.id) ?? null;
}

/** The build screen runs the new world twice and asks Spark what it sees. */
export function WorldWatch({ spec }: { spec: PlayableSpec }) {
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<WorldView | null>(null);
  const [params, setParams] = useState(() => defaultParams(spec as PublicWorldSpec));
  const [playing, setPlaying] = useState(true);
  const [note, setNote] = useState("Spark is watching this world run.");

  useEffect(() => {
    registerPaintedArt(spec.id, spec.art.painted);
    const rules = rulesFor(spec);
    if (!rules) return;
    let cancel = false;
    void collectShots(
      spec as PublicWorldSpec,
      rules,
      () => root.current?.querySelector("canvas") ?? null,
      1,
      (next, nextParams) => {
        if (cancel) return;
        setView(asWorldView(next, spec.archetype));
        setParams(nextParams);
      },
    )
      .then(async (frames) => {
        if (cancel) return;
        const res = await fetch("/api/playtest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worldId: spec.id, frames }),
        });
        const body = (await res.json()) as { verdict?: string; notes?: unknown; source?: string };
        if (cancel) return;
        const notes = Array.isArray(body.notes) ? body.notes.filter((item): item is string => typeof item === "string") : [];
        if (!res.ok || body.source === "sample") {
          setNote(notes[0] ?? "Spark did not watch this world.");
          return;
        }
        setNote(body.verdict === "looks-right" ? "Looked right." : "Flagged the picture for another look.");
      })
      .catch(() => {
        if (!cancel) setNote("The playtester could not watch.");
      })
      .finally(() => {
        if (!cancel) setPlaying(false);
      });
    return () => {
      cancel = true;
    };
  }, [spec]);

  return (
    <div className="bw-watch" ref={root} data-capture="yes">
      <p className="bw-watch-kicker">Playtester · Muse Spark 1.3</p>
      <div className="bw-watch-stage">
        <WorldStage
          view={view}
          archetype={spec.archetype}
          worldId={spec.id}
          artStyle={spec.art.style}
          playing={playing}
          params={params}
        />
      </div>
      <p className="bw-watch-note">{rulesFor(spec) ? note : "This world has no rules to watch."}</p>
    </div>
  );
}
