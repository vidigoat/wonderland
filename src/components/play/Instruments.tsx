"use client";

import type { Params } from "@/engine/rules";
import type { PublicWorldSpec } from "@/engine/spec";
import { formatParam, runVerb } from "./readings";
import { genericRunVerb, useUiText } from "./ui-text";

/** A share of something (cash kept, how closely trees are planted) reads better as a percentage. */
function asPercent(knob: { kind: string; label: string; min?: number; max?: number }): boolean {
  return knob.kind === "slider" && (knob.min ?? 0) >= 0 && (knob.max ?? 1) <= 1 && /cash|share|ratio|reserve|fraction|density|closely|percent/i.test(knob.label);
}

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
  const t = useUiText();
  return (
    <div className="instruments">
      <p className="kicker">{t.controls}</p>
      {locked && lockedNote ? <p className="slip">{lockedNote}</p> : null}
      <div className="knob-rack" aria-disabled={locked}>
        {spec.knobs.map((knob) => {
          const value = params[knob.id];
          return (
            <label key={knob.id} className="knob">
              <span className="knob-label">
                <span>{knob.label}</span>
                {knob.kind !== "toggle" && knob.kind !== "text" ? <span className="num">{asPercent(knob) ? `${Math.round(Number(value ?? knob.default) * 100)}%` : formatParam(value)}</span> : null}
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
                  <span>{value ? t.on : t.off}</span>
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
          {playing ? t.inMotion : t.lang === "en" ? runVerb(spec.id, spec.archetype) : genericRunVerb(t, spec.archetype)}
        </button>
        <button type="button" className="quiet" disabled={locked || playing || !ready} onClick={onReset}>
          {t.resetScene}
        </button>
      </div>
    </div>
  );
}
