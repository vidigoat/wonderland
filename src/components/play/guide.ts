import type { PublicWorldSpec } from "@/engine/spec";
import type { Phase } from "./phase";

/**
 * Plain-words guidance for each step, so a player always knows what to do next and why.
 * Hand-built worlds get a sentence written for them; generated worlds get one built from their own controls.
 * None of this names the hidden law.
 */
const HOW_TO_EXPERIMENT: Record<string, string> = {
  gatekeeper:
    "Write something on your scroll and send it. Watch the spell the scribe writes from it, and whether the vault opens. Try names with unusual characters in them.",
  "peppered-forest": "Change the soot on the bark or how hungry the birds are, then run a generation. Watch what colour the moths become.",
  "newtons-cannon": "Change the launch speed and fire. Watch where the ball comes down, and whether it comes down at all.",
  "rumour-town":
    "Change how the town works, then let the rumour loose. Watch the cash in the vault, how many people are worried, and who takes their money out.",
  firebreak: "Change how closely the trees are planted, then strike a spark. Watch how far the fire gets.",
};

export function experimentHint(spec: PublicWorldSpec, runVerb: string): string {
  const own = HOW_TO_EXPERIMENT[spec.id];
  if (own) return own;
  const names = spec.knobs.slice(0, 2).map((knob) => knob.label.toLowerCase());
  const which = names.length === 2 ? `${names[0]} or ${names[1]}` : (names[0] ?? "one control");
  return `Change ${which}, press “${runVerb}”, and watch what happens on the stage. Change one thing at a time so you can tell what caused what.`;
}

/** The four steps a player moves through. The intro sits before step one; the card comes after step four. */
export const STEPS = ["Predict", "Experiment", "Explain", "Prove"] as const;

export function stepIndex(phase: Phase): number {
  if (phase === "intro") return -1;
  if (phase === "predict") return 0;
  if (phase === "experiment") return 1;
  if (phase === "hypothesise" || phase === "loop") return 2;
  if (phase === "transfer") return 3;
  return 4;
}

export function stepLabel(phase: Phase): string | null {
  const index = stepIndex(phase);
  if (index < 0 || index >= STEPS.length) return null;
  return `Step ${index + 1} of ${STEPS.length} · ${STEPS[index]}`;
}
