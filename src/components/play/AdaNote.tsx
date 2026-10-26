"use client";

import type { Observation, Params } from "@/engine/rules";
import type { PublicWorldSpec } from "@/engine/spec";
import { ADA_WIRING } from "./http";
import { describeParams, raceRows } from "./readings";
import { SampleNote } from "./Scenes";

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
}) {
  const bench = describeParams(spec, params);
  const race = raceRows(spec, yours, rival);
  return (
    <section className="ada" aria-label="Ada">
      <header className="ada-head">
        <h2>Ada</h2>
        {canTurn ? (
          <button type="button" className="quiet" onClick={onTurn} disabled={status === "thinking"}>
            {status === "thinking" ? "Thinking" : "Her turn"}
          </button>
        ) : null}
      </header>
      <div className="ada-scroll">
      {race.length ? (
        <div className="race" aria-label="Where you and Ada differ">
          <div className="race-head">
            <span />
            <span>You</span>
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
      {status === "quiet" ? <p className="aside">She is in the room, a step behind.</p> : null}
      <ol className="ada-notes">
        {entries.map((entry, index) => (
          <li key={`${entry.tool}-${index}`}>
            <p className="thought">{entry.thought}</p>
            <p className="tool-line">
              <span>{entry.tool.replaceAll("_", " ")}</span>
              {entry.reading ? <span>{entry.reading}</span> : null}
            </p>
          </li>
        ))}
      </ol>
      {bench.length ? (
        <p className="bench">
          <span>Her bench</span>
          {bench.map((item) => (
            <span key={item.id}>
              {item.label} <span className="num">{item.value}</span>
            </span>
          ))}
        </p>
      ) : null}
      {seedNote ? <p className="aside">{seedNote}</p> : null}
      </div>
      <SampleNote notice={notice} />
    </section>
  );
}
