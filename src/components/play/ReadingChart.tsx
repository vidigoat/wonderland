"use client";

import type { Observation } from "@/engine/rules";
import type { PublicWorldSpec } from "@/engine/spec";
import { chartLines, chartSeries } from "./chart";
import { useUiText } from "./ui-text";

const COLORS = ["#ffd27a", "#9ecbff", "#f0a08a"];

/** The run, drawn under the stage. The previous run stays as a faint line. */
export function ReadingChart({
  spec,
  history,
  previous,
}: {
  spec: PublicWorldSpec;
  history: Observation[];
  previous: Observation[] | null;
}) {
  const t = useUiText();
  const current = chartSeries(spec.observables, history);
  const prior = previous && previous.length > 1 ? chartSeries(spec.observables, previous) : null;
  const lines = chartLines(current, prior, 320, 96);
  const ready = history.length > 1 && lines.some((line) => line.current.includes("L"));

  return (
    <figure className="reading-chart">
      <figcaption>{prior ? t.thisRunPrior : t.thisRun}</figcaption>
      {ready ? (
        <svg viewBox="0 0 320 96" role="img" aria-label={t.chartLabel}>
          {lines.map((line, index) => (
            <g key={line.id}>
              {line.previous ? (
                <path d={line.previous} fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="1.5" opacity="0.35" />
              ) : null}
              <path d={line.current} fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="2" />
            </g>
          ))}
        </svg>
      ) : (
        <p className="reading-chart-wait">{t.chartWait}</p>
      )}
      {lines.length > 0 ? (
        <ul>
          {lines.map((line, index) => (
            <li key={line.id}>
              <i style={{ background: COLORS[index % COLORS.length] }} />
              {line.label}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
