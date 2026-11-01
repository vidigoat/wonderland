"use client";

import type { Observation, Params } from "@/engine/rules";
import type { PublicWorldSpec } from "@/engine/spec";
import { ADA_WIRING } from "./http";
import { describeParams, raceRows, speakTool } from "./readings";
import { SampleNote } from "./Scenes";
import { useUiText } from "./ui-text";

export type AdaEntry = {
  thought: string;
  tool: string;
  reading: string | null;
};

export function AdaNote({
  spec,
  status,
  notice,
  seedNote,
  entries,
  params,
  yours,
  rival,
  onTurn,
  canTurn,
  reveal = false,
}: {
  spec: PublicWorldSpec;
  status: "quiet" | "thinking" | "wiring" | "noted";
  notice: string | null;
  seedNote: string | null;
  entries: AdaEntry[];
  params: Params;
  yours: Observation | null;
  rival: Observation | null;
  onTurn: () => void;
  canTurn: boolean;
  /** Her reasoning and her exact moves would give the law away, so they stay folded until you have proved it yourself. */
  reveal?: boolean;
}) {
  const t = useUiText();
  const bench = describeParams(spec, params);
  // Two rows are enough to show where you and she differ; more turns the card into a table.
  const race = raceRows(spec, yours, rival).slice(0, 2);
  return (
    <section title={seedNote ?? undefined} className="ada" aria-label="Ada" data-status={status}>
      <header className="ada-head">
        <h2>Ada</h2>
        {canTurn ? (
          <button type="button" className="quiet" onClick={onTurn} disabled={status === "thinking"}>
            {status === "thinking" ? t.thinking : t.letHerTry}
          </button>
        ) : null}
      </header>
      <div className="ada-scroll">
      {race.length ? (
        <div className="race" aria-label={t.raceLabel}>
          <p className="kicker">{t.race}</p>
          <div className="race-head">
            <span />
            <span>{t.you}</span>
            <span>Ada</span>
          </div>
          {race.map((row) => (
            <div key={row.id} className="race-row" data-split="yes">
              <span className="race-label">{row.label}</span>
              <span className={row.spell ? "spell" : "num"} title={row.yours}>
                {row.yours}
              </span>
              <span className={row.spell ? "spell" : "num"} title={row.hers}>
                {row.hers}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {status === "wiring" ? <p className="wiring">{ADA_WIRING}</p> : null}
      {status === "quiet" ? <p className="aside">{t.adaQuiet}</p> : null}
      {entries.length > 0 && !reveal ? (
        <p className="ada-progress">
          {t.adaProgress(entries.length)}
        </p>
      ) : null}
      {reveal ? (
        <ol className="ada-notes">
          {entries.map((entry, index) => (
            <li key={`${entry.tool}-${index}`}>
              <p className="thought">{entry.thought}</p>
              <p className="tool-line">
                <span>{speakTool(spec.knobs, entry.tool).replaceAll("_", " ")}</span>
                {entry.reading ? <span>{entry.reading}</span> : null}
              </p>
            </li>
          ))}
        </ol>
      ) : null}
      {/* Her bench (her exact settings) appears only with her notes. */}
      {reveal && bench.length && entries.length ? (
        <p className="bench">
          <span>{t.herBench}</span>
          {bench.map((item) => (
            <span key={item.id}>
              {item.label} <span className="num">{item.value}</span>
            </span>
          ))}
        </p>
      ) : null}
      </div>
      <SampleNote notice={notice} />
    </section>
  );
}
