import type { Observation } from "@/engine/rules";
import type { PublicWorldSpec } from "@/engine/spec";
import { readingLines } from "./readings";

export function Readings({ spec, obs }: { spec: PublicWorldSpec; obs: Observation | null }) {
  const lines = readingLines(spec, obs);
  return (
    <div className="readings">
      <p className="kicker">Readings</p>
      <dl>
        {lines.map((line) => (
          <div key={line.id} className={line.spell ? "reading spell-reading" : "reading"}>
            <dt>{line.label}</dt>
            <dd className={line.spell ? "spell" : "num"}>{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
