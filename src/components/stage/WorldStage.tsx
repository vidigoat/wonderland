"use client";

import { useEffect, useRef } from "react";
import type { JSX } from "react";
import { asWorldView, type WorldView } from "@/engine/view";
import { readNumber } from "@/engine/render/helpers";
import { barkColor, cssHex, paletteFor } from "@/engine/render/palette";

/**
 * PixiJS v8 stage. The play loop mounts it inside `.stage-frame` and passes
 * `session.view()` (or null), the public archetype, id, and `art.style`,
 * whether a run is in progress, and the live knob values.
 * A null view draws an idle scene for that archetype.
 */
export function WorldStage(props: {
  view: unknown;
  archetype: "pipeline" | "population" | "bodies" | "field";
  worldId: string;
  artStyle: string;
  playing: boolean;
  params: Record<string, number | boolean | string>;
}): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  }, [props]);

  useEffect(() => {
    const el = host.current;
    if (!el || typeof window === "undefined") return;
    let cancel = () => {};
    let stopped = false;
    void import("@/engine/render/mount").then((mod) => {
      if (stopped) return;
      cancel = mod.mountWorldStage(el, () => latest.current);
    });
    return () => {
      stopped = true;
      cancel();
    };
  }, []);

  const palette = paletteFor(props.worldId, props.artStyle);
  const ground = props.worldId === "peppered-forest" ? barkColor(readNumber(props.params, "barkDarkness", 0.22)) : palette.ground;
  const view = asWorldView(props.view, props.archetype);

  return (
    <div
      ref={host}
      data-world={props.worldId}
      data-archetype={props.archetype}
      data-playing={props.playing ? "yes" : "no"}
      role="img"
      aria-label={caption(props.archetype, view)}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        background: cssHex(ground),
      }}
    />
  );
}

function caption(archetype: "pipeline" | "population" | "bodies" | "field", view: WorldView | null): string {
  if (!view) {
    if (archetype === "population") return "A quiet population, waiting to run";
    if (archetype === "bodies") return "A cannon on a small planet, waiting to be fired";
    if (archetype === "pipeline") return "Scroll, scribe, ledger, and vault";
    return "A valley seen from above";
  }
  if (view.kind === "pipeline") return view.query || "The scribe's spell";
  if (view.kind === "population") {
    const speaking = view.agents.filter((agent) => agent.bubble).length;
    return speaking ? `${view.agents.length} figures, ${speaking} speaking` : `${view.agents.length} figures`;
  }
  if (view.kind === "bodies") return "Planet, cannon, and cannonball";
  return "A valley seen from above";
}
