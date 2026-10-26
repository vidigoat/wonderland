import { phaseMark, TRAIL, type Phase } from "./phase";

export function PhaseTrail({ phase, seen }: { phase: Phase; seen: string[] }) {
  const active = phaseMark(phase);
  return (
    <nav className="phase-trail" aria-label="The discovery">
      <ol>
        {TRAIL.map((step, index) => {
          const state = index < active ? "done" : index === active ? "now" : "ahead";
          return (
            <li key={step.phase} data-state={state} aria-current={state === "now" ? "step" : undefined}>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
      {seen.length > 0 ? (
        <p className="seen-trail">
          {seen.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      ) : null}
    </nav>
  );
}
