"use client";

import type { Params } from "@/engine/rules";
import type { PublicWorldSpec } from "@/engine/spec";
import { formatParam, runVerb } from "./readings";

export function Instruments({
  spec,
  params,
  locked,
  lockedNote,
  playing,
  ready,
  onChange,
  onRun,
  onReset,
}: {
  spec: PublicWorldSpec;
  params: Params;
  locked: boolean;
  lockedNote?: string | null;
  playing: boolean;
  ready: boolean;
  onChange: (id: string, value: Params[string]) => void;
  onRun: () => void;
  onReset: () => void;
}) {
  return (
    <div className="instruments">
      <p className="kicker">Instruments</p>
      {locked && lockedNote ? <p className="slip">{lockedNote}</p> : null}
      <div className="knob-rack" aria-disabled={locked}>
        {spec.knobs.map((knob) => {
          const value = params[knob.id];
          return (
            <label key={knob.id} className="knob">
              <span className="knob-label">
                <span>{knob.label}</span>
                {knob.kind !== "toggle" && knob.kind !== "text" ? <span className="num">{formatParam(value)}</span> : null}
              </span>
              {knob.kind === "slider" ? (
                <input
                  type="range"
                  min={knob.min}
                  max={knob.max}
                  step={knob.step}
                  disabled={locked}
                  value={Number(value ?? knob.default)}
                  onChange={(event) => onChange(knob.id, Number(event.target.value))}
                />
              ) : null}
              {knob.kind === "toggle" ? (
                <span className="seal-toggle">
                  <input type="checkbox" disabled={locked} checked={Boolean(value)} onChange={(event) => onChange(knob.id, event.target.checked)} />
                  <span>{value ? "on" : "off"}</span>
                </span>
              ) : null}
              {knob.kind === "text" ? (
                <input className="spell-input" type="text" disabled={locked} value={String(value ?? "")} onChange={(event) => onChange(knob.id, event.target.value)} />
              ) : null}
              {knob.kind === "choice" ? (
                <select disabled={locked} value={String(value ?? "")} onChange={(event) => onChange(knob.id, event.target.value)}>
                  {(knob.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : null}
              {knob.hint ? <span className="hint">{knob.hint}</span> : null}
            </label>
          );
        })}
      </div>
      <div className="instrument-actions">
        <button type="button" className="press" disabled={locked || playing || !ready} onClick={onRun}>
          {playing ? "In motion" : runVerb(spec.id, spec.archetype)}
        </button>
        <button type="button" className="quiet" disabled={locked || playing || !ready} onClick={onReset}>
          Set the scene again
        </button>
      </div>
    </div>
  );
}
