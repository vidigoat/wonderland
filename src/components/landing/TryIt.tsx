"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { StageSlot } from "@/components/play/StageSlot";
import { Button } from "@/components/ui/button";
import type { Observation, Params } from "@/engine/rules";
import { WorldSession } from "@/engine/runtime";
import type { PublicWorldSpec } from "@/engine/spec";
import { asWorldView, type WorldView } from "@/engine/view";
import { builtinRules } from "@/worlds/builtins";
import { StageHud, StageLegend } from "@/components/play/StageHud";
import { heldCaption, runStopped } from "./try-caption";

/**
 * The whole product in thirty seconds, on the landing page.
 * Predict what one false rumour does to a healthy bank, watch it happen, then find the one change that saves it.
 * Same engine, rules and renderer as the game. No model calls, so it works for every visitor.
 */
const TICK_MS = 820;
const HELD_AFTER = 12;

const GUESSES = ["Nothing. It's false.", "A few people panic, then it calms down.", "The bank collapses."] as const;
const RIGHT = 2;

type Phase = "predict" | "running" | "fell" | "experiment" | "held";
type Fixes = { reserveRatio: number; queueVisible: boolean; insurance: boolean };

const START: Fixes = { reserveRatio: 0.1, queueVisible: true, insurance: false };

function caption(obs: Observation | null, phase: Phase): string {
  if (!obs) return phase === "predict" ? "A perfectly healthy bank. Forty neighbours. One false rumour." : "";
  if (phase === "held") return heldCaption(Number(obs.withdrawnShare ?? 0));
  if (obs.bank === "collapsed") return "The bank has closed its doors.";
  const withdrawn = Number(obs.withdrawnShare ?? 0);
  const worried = Number(obs.worriedShare ?? 0);
  if (withdrawn > 0.02) return `${Math.round(withdrawn * 100)}% have taken their money out.`;
  if (worried > 0.05) return "Worry is spreading across the square.";
  return "Someone whispers that the bank is in trouble.";
}

export function TryIt({ spec }: { spec: PublicWorldSpec }) {
  const [phase, setPhase] = useState<Phase>("predict");
  const [guess, setGuess] = useState<number | null>(null);
  const [fixes, setFixes] = useState<Fixes>(START);
  const [view, setView] = useState<WorldView | null>(null);
  const [obs, setObs] = useState<Observation | null>(null);
  const [days, setDays] = useState(0);
  const [tries, setTries] = useState(0);
  const run = useRef(0);
  const params: Params = { rumourSeeds: 1, ...fixes };

  // A calm square before anything is said.
  useEffect(() => {
    const rules = builtinRules["rumour-town"];
    if (!rules) return;
    let alive = true;
    void new WorldSession(rules, { ...START, rumourSeeds: 0 }, 7).start().then((session) => {
      if (alive) setView(asWorldView(session.view(), spec.archetype));
    });
    return () => {
      alive = false;
      run.current += 1;
    };
  }, [spec.archetype]);

  async function play(next: Fixes, after: "fell-first" | "experiment") {
    const rules = builtinRules["rumour-town"];
    if (!rules) return;
    const id = ++run.current;
    setPhase("running");
    setDays(0);
    const session = await new WorldSession(rules, { rumourSeeds: 1, ...next }, 7).start();
    if (id !== run.current) return;
    setView(asWorldView(session.view(), spec.archetype));
    setObs(session.history[0] ?? null);
    for (let day = 1; day <= HELD_AFTER; day++) {
      await new Promise((resolve) => window.setTimeout(resolve, TICK_MS));
      if (id !== run.current) return;
      const latest = await session.tick(1);
      if (id !== run.current) return;
      setView(asWorldView(session.view(), spec.archetype));
      setObs(latest);
      setDays(day);
      if (latest.bank === "collapsed") {
        setPhase(after === "fell-first" ? "fell" : "experiment");
        return;
      }
    }
    setPhase("held");
  }

  function predict(index: number) {
    setGuess(index);
    void play(START, "fell-first");
  }

  function tryAgain() {
    setTries((n) => n + 1);
    void play(fixes, "experiment");
  }

  function reset() {
    run.current += 1;
    setPhase("predict");
    setGuess(null);
    setFixes(START);
    setObs(null);
    setDays(0);
    setTries(0);
  }

  const changed = fixes.reserveRatio !== START.reserveRatio || fixes.queueVisible !== START.queueVisible || fixes.insurance !== START.insurance;

  return (
    <div className="try">
      <div className="try-stage">
        <div className="try-bar">
          <span className="try-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="try-url">wonderland / Rumour Town</span>
          {phase === "running" ? <span className="try-live">Day {days}</span> : <span className="try-live try-live-idle">Playable</span>}
        </div>
        <div className="try-canvas">
          <StageSlot view={view} archetype={spec.archetype} worldId={spec.id} artStyle={spec.art.style} painted={spec.art.painted} playing={phase === "running"} params={params} beat={null} beatId={0} />
          {obs ? <StageHud spec={spec} obs={obs} params={params} revealed /> : null}
          {phase !== "predict" ? <StageLegend worldId={spec.id} obs={obs} /> : null}
          <p className="try-caption" aria-live="polite">
            {caption(obs, phase)}
          </p>
        </div>
      </div>

      <div className="try-panel" aria-live="polite">
        {phase === "predict" ? (
          <>
            <p className="try-step">1 · Predict</p>
            <h3 className="try-q">This bank is perfectly healthy. You tell one person a false rumour that it&apos;s in trouble. What happens?</h3>
            <p className="try-note">Like every real bank, it keeps only a little cash in the vault (enough for 4 of its 40 savers) and lends the rest out.</p>
            <ul className="try-options">
              {GUESSES.map((text, index) => (
                <li key={text}>
                  <button type="button" className="try-option" onClick={() => predict(index)}>
                    {text}
                  </button>
                </li>
              ))}
            </ul>
            <p className="try-note">Pick one, then watch the town decide.</p>
          </>
        ) : null}

        {phase === "running" ? (
          <>
            <p className="try-step">{tries === 0 ? "2 · Watch" : `Experiment ${tries}`}</p>
            <h3 className="try-q">{tries === 0 ? "Watch the square." : "Running your town again…"}</h3>
            <p className="try-note">Every person decides for themselves: they worry when their neighbours worry, and they run when they see a queue. Watch the coins in the vault.</p>
          </>
        ) : null}

        {phase === "fell" ? (
          <>
            <p className="try-step">{guess === RIGHT ? "You called it" : "Not what you expected?"}</p>
            <h3 className="try-q">The bank closed on day {days}, and the rumour was false.</h3>
            <p className="try-note">
              Worry spread from neighbour to neighbour. A few people went for their cash, others saw the queue and joined it, and the vault ran dry. Nothing was wrong
              with the bank until everyone believed something was.
            </p>
            <p className="try-note">Now the real question: what one change would have saved it? Nobody will tell you. Try things.</p>
            <Button size="lg" className="try-go" onClick={() => setPhase("experiment")}>
              Find what saves it <ArrowRight aria-hidden="true" />
            </Button>
          </>
        ) : null}

        {phase === "experiment" ? (
          <>
            <p className="try-step">3 · Experiment{tries > 0 ? ` · try ${tries + 1}` : ""}</p>
            <h3 className="try-q">{tries === 0 ? "Change the town, then run it again." : `Still fell, on day ${days}. Something else matters more.`}</h3>
            <div className="try-knobs">
              <label className="try-knob">
                <span>
                  Cash the bank keeps on hand <b>{Math.round(fixes.reserveRatio * 100)}%</b>
                </span>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={fixes.reserveRatio}
                  onChange={(event) => setFixes((f) => ({ ...f, reserveRatio: Number(event.target.value) }))}
                />
              </label>
              <label className="try-toggle">
                <input type="checkbox" checked={!fixes.queueVisible} onChange={(event) => setFixes((f) => ({ ...f, queueVisible: !event.target.checked }))} />
                <span>Hide the queue outside the bank</span>
              </label>
              <label className="try-toggle">
                <input type="checkbox" checked={fixes.insurance} onChange={(event) => setFixes((f) => ({ ...f, insurance: event.target.checked }))} />
                <span>Guarantee everyone&apos;s deposits</span>
              </label>
            </div>
            <Button size="lg" className="try-go" onClick={tryAgain} disabled={!changed}>
              Run it again <ArrowRight aria-hidden="true" />
            </Button>
          </>
        ) : null}

        {phase === "held" && runStopped(Number(obs?.withdrawnShare ?? 0)) ? (
          <>
            <p className="try-step">You found it</p>
            <h3 className="try-q">The bank held. Same rumour, same town.</h3>
            <div className="try-learned">
              <p className="try-learned-label">What you just discovered</p>
              <p>
                A bank run feeds on itself: people don&apos;t run because the bank is weak, they run because they fear others will run first. Guarantee every
                deposit and there&apos;s no reason to be first, so nobody runs. It&apos;s why most countries insure bank deposits today.
              </p>
            </div>
            <p className="try-note">
              You worked that out yourself, in {tries} {tries === 1 ? "try" : "tries"}. Every Wonderland world works like this, about anything you ask. In the full game you also
              put it into words, prove it on a new case, and race Ada, an AI scientist, to it.
            </p>
            <div className="try-ctas">
              <Button asChild size="lg">
                <a href="#ask">
                  Ask your own question <ArrowRight aria-hidden="true" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/w/rumour-town">Play the full world</Link>
              </Button>
            </div>
          </>
        ) : null}

        {phase === "held" && !runStopped(Number(obs?.withdrawnShare ?? 0)) ? (
          <>
            <p className="try-step">It held, this time</p>
            <h3 className="try-q">The doors stayed open. People were still taking their money.</h3>
            <p className="try-note">
              The vault had enough cash, or fewer neighbours could see the queue. The reason to be first in line is still there. The run did not stop.
            </p>
            <Button size="lg" className="try-go" onClick={() => setPhase("experiment")}>
              Change something else <ArrowRight aria-hidden="true" />
            </Button>
          </>
        ) : null}

        {phase !== "predict" && phase !== "running" ? (
          <button type="button" className="try-reset" onClick={reset}>
            <RotateCcw aria-hidden="true" /> Start over
          </button>
        ) : null}
      </div>
    </div>
  );
}
