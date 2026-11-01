import { STEPS, stepIndex } from "./guide";
import type { Phase } from "./phase";
import { useUiText } from "./ui-text";

/** Always on screen: what you are finding out, and where you are in the four steps. */
export function PhaseTrail({ phase, concept }: { phase: Phase; concept: string }) {
  const at = stepIndex(phase);
  const t = useUiText();
  return (
    <nav className="goal-bar" aria-label={t.progress}>
      <p className="goal-what">
        <span className="goal-label">{t.findingOut}</span>
        <span className="goal-question">{concept}</span>
      </p>
      <ol className="goal-steps">
        {STEPS.map((label, index) => {
          const state = index < at ? "done" : index === at ? "now" : "ahead";
          return (
            <li key={label} data-state={state} aria-current={state === "now" ? "step" : undefined}>
              <span className="goal-n">{state === "done" ? "✓" : index + 1}</span>
              <span>{t.steps[index] ?? label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
