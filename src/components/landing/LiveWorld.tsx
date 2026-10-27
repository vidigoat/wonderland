"use client";

import { useEffect, useRef, useState } from "react";
import { StageSlot } from "@/components/play/StageSlot";
import type { Observation, Params } from "@/engine/rules";
import { WorldSession } from "@/engine/runtime";
import type { PublicWorldSpec } from "@/engine/spec";
import { asWorldView, type WorldView } from "@/engine/view";
import { builtinRules } from "@/worlds/builtins";

/**
 * A real world running on its own, for the landing page's product window.
 * Rumour Town: one rumour, a healthy bank, forty neighbours. It plays out, holds on the result, and begins again.
 * Same engine and renderer as the game; no model calls.
 */
const TICK_MS = 650;
const HOLD_TICKS = 6;

function caption(obs: Observation | null): string {
  if (!obs) return "One rumour. A perfectly healthy bank.";
  if (obs.bank === "collapsed") return "The bank has closed its doors.";
  const worried = Number(obs.worriedShare ?? 0);
  const withdrawn = Number(obs.withdrawnShare ?? 0);
  if (withdrawn > 0) return "People are queuing to take their money out.";
  if (worried > 0.05) return "Worry is spreading across the square.";
  return "One rumour. A perfectly healthy bank.";
}

export function LiveWorld({ spec, params }: { spec: PublicWorldSpec; params: Params }) {
  const [view, setView] = useState<WorldView | null>(null);
  const [obs, setObs] = useState<Observation | null>(null);
  const [visible, setVisible] = useState(false);
  const host = useRef<HTMLDivElement>(null);

  // Only run while the window is on screen.
  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || spec.rules.kind !== "builtin") return;
    const rules = builtinRules[spec.rules.module];
    if (!rules) return;
    let alive = true;
    let session: WorldSession | null = null;
    let held = 0;
    let seed = 7;
    let timer = 0;

    const start = async () => {
      session = await new WorldSession(rules, { ...params }, seed).start();
      held = 0;
      if (!alive) return;
      setView(asWorldView(session.view(), spec.archetype));
      setObs(session.history[0] ?? null);
    };

    const tick = async () => {
      if (!alive || !session) return;
      const last = session.history[session.history.length - 1];
      if (last?.bank === "collapsed") {
        held += 1;
        if (held > HOLD_TICKS) {
          seed += 1;
          await start();
        }
      } else {
        const next = await session.tick(1);
        if (!alive) return;
        setView(asWorldView(session.view(), spec.archetype));
        setObs(next);
      }
      timer = window.setTimeout(() => void tick(), TICK_MS);
    };

    void start().then(() => {
      timer = window.setTimeout(() => void tick(), TICK_MS);
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [visible, spec, params]);

  return (
    <div className="bw-window" ref={host}>
      <div className="bw-window-bar">
        <span className="bw-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="bw-window-url">wonderland / {spec.title}</span>
        <span className="bw-window-live">Live</span>
      </div>
      <div className="bw-window-stage">
        <StageSlot view={view} archetype={spec.archetype} worldId={spec.id} artStyle={spec.art.style} playing params={params} beat={null} beatId={0} />
        <p className="bw-window-caption" aria-live="polite">
          {caption(obs)}
        </p>
      </div>
    </div>
  );
}
