import { Eye, FlaskConical, ScanSearch, ShieldCheck } from "lucide-react";

/** The four checks a model-written world passes before anyone plays it, in the order they run. */
const GATES = [
  {
    icon: FlaskConical,
    name: "Science checks",
    model: "Sandboxed, every seed",
    does: "The world's code runs against the law's predictions, including the controls: take the cause away and the effect must vanish.",
  },
  {
    icon: ShieldCheck,
    name: "Honest readings",
    model: "Our check, on the code",
    does: "Every number on screen must be measured from the world, not worked out from the slider settings. We added this after we caught our models faking readings.",
  },
  {
    icon: Eye,
    name: "Spark watches",
    model: "Muse Spark 1.3, vision",
    does: "Spark watches the world run, with a control moved and without, and judges whether the picture shows what the law predicts.",
  },
  {
    icon: ScanSearch,
    name: "SAM counts",
    model: "SAM 3.1",
    does: "SAM counts the figures in the picture as a second opinion: on Rumour Town's square, 35 seen where the stage drew 33.",
  },
];

export function Gates() {
  return (
    <div className="pipe">
      <div className="pipe-lane">
        <p className="pipe-lane-label">Before you ever see a world</p>
        <ol className="pipe-row">
          {GATES.map((gate, index) => {
            const Icon = gate.icon;
            return (
              <li key={gate.name} className="pipe-node" data-gate="yes">
                <span className="pipe-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="pipe-name">{gate.name}</span>
                <span className="pipe-model">{gate.model}</span>
                <span className="pipe-does">{gate.does}</span>
                {index < GATES.length - 1 ? <span className="pipe-arrow" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="pipe-foot">
        When a gate fails, what it saw goes back to the designer, and the repaired world must pass every gate again. When Spark first watched our worlds it caught three real bugs that all our tests had missed. On fifteen questions from a school science curriculum, eleven became verified worlds and eight passed all four gates, three of them after an automatic repair. The other three stay out of the gallery.
      </p>
    </div>
  );
}
