import type { Observation, Params } from "@/engine/rules";
import type { PublicWorldSpec } from "@/engine/spec";
import { formatReading } from "./readings";

/**
 * Readings drawn on the stage itself, so cause and effect sit in one place: you change a control,
 * you watch the world, and the numbers change right where you are looking.
 */

/** Rumour Town: the bank keeps cash for only a few of its forty savers. The vault shows exactly how many. */
const SAVERS = 40;

function townReadout(obs: Observation | null, params: Params) {
  const reserve = Number(params.reserveRatio ?? 0.1);
  const coins = Math.max(1, Math.round(reserve * SAVERS));
  const withdrawn = Math.round(Number(obs?.withdrawnShare ?? 0) * SAVERS);
  const worried = Math.round(Number(obs?.worriedShare ?? 0) * SAVERS);
  const closed = obs?.bank === "collapsed";
  return { coins, left: closed ? 0 : Math.max(0, coins - withdrawn), withdrawn, worried, closed, insured: Boolean(params.insurance) };
}

function TownHud({ obs, params }: { obs: Observation | null; params: Params }) {
  const town = townReadout(obs, params);
  return (
    <div className="hud hud-town" aria-live="polite">
      <div className="hud-card hud-bank" data-closed={town.closed ? "yes" : undefined}>
        <p className="hud-label">The bank</p>
        <p className="hud-big">{town.closed ? "Closed" : "Open"}</p>
        <p className="hud-label">
          Cash in the vault: enough for {town.left} of {SAVERS} savers
        </p>
        <span className="hud-coins" aria-hidden="true">
          {Array.from({ length: Math.min(town.coins, 24) }, (_, index) => (
            <i key={index} data-spent={index >= town.left ? "yes" : undefined} />
          ))}
        </span>
        <p className="hud-note">The rest of the savings are lent out{town.insured ? ". Deposits are guaranteed." : "."}</p>
        <dl className="hud-rows">
          <div>
            <dt>Worried</dt>
            <dd>
              {town.worried} <small>of {SAVERS}</small>
            </dd>
          </div>
          <div>
            <dt>Took their money out</dt>
            <dd>
              {town.withdrawn} <small>of {SAVERS}</small>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function isShare(id: string, label: string, value: unknown): boolean {
  return typeof value === "number" && value >= 0 && value <= 1 && /share|fraction|proportion/i.test(`${id} ${label}`);
}

function GenericHud({ spec, obs }: { spec: PublicWorldSpec; obs: Observation | null }) {
  if (!obs) return null;
  const items = spec.observables
    .filter((item) => item.id !== "query" && obs[item.id] != null && String(obs[item.id]).length <= 24)
    .slice(0, 4);
  if (items.length === 0) return null;
  return (
    <div className="hud" aria-live="polite">
      {items.map((item) => {
        const raw = obs[item.id];
        const value = isShare(item.id, item.label, raw) ? `${Math.round(Number(raw) * 100)}%` : formatReading(raw, item.display);
        return (
          <div key={item.id} className="hud-card">
            <p className="hud-label">{item.label}</p>
            <p className="hud-big">
              {value}
              {item.unit ? <small> {item.unit}</small> : null}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function StageHud({ spec, obs, params }: { spec: PublicWorldSpec; obs: Observation | null; params: Params }) {
  if (spec.id === "rumour-town") return <TownHud obs={obs} params={params} />;
  // The pipeline stage already labels every station with its state; chips would only repeat it.
  if (spec.archetype === "pipeline") return null;
  return <GenericHud spec={spec} obs={obs} />;
}

/** What the colours on the stage mean, for worlds where colour is the reading. */
export function StageLegend({ worldId }: { worldId: string }) {
  if (worldId === "rumour-town") {
    return (
      <ul className="hud-legend" aria-label="What the colours mean">
        <li>
          <i style={{ background: "#f6d7b8" }} /> Calm
        </li>
        <li>
          <i style={{ background: "#7c3040" }} /> Worried
        </li>
        <li>
          <i className="hud-legend-bubble">Getting my money out!</i> Withdrawing
        </li>
      </ul>
    );
  }
  if (worldId === "peppered-forest") {
    return (
      <ul className="hud-legend" aria-label="What the colours mean">
        <li>
          <i style={{ background: "#f4efe2" }} /> Pale moth
        </li>
        <li>
          <i style={{ background: "#2a2622" }} /> Dark moth
        </li>
      </ul>
    );
  }
  return null;
}
