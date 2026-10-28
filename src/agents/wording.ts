import type { WorldSpec } from "@/engine/spec";

/**
 * Control wording a player reads, tidied the same way every time: a label in sentence case with no unit tucked
 * in brackets ("Wind Speed (m/s)" → "Wind speed"), and a hint that starts with a capital. Acronyms stay as
 * written. Nothing else in the spec is touched.
 */
export function sentenceLabel(label: string): string {
  const words = label.replace(/\s*\([^)]*\)\s*/g, " ").trim().split(/\s+/).filter(Boolean);
  return words
    .map((word, index) => {
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return /^[A-Z][a-z]/.test(word) ? word.charAt(0).toLowerCase() + word.slice(1) : word;
    })
    .join(" ");
}

export function capitalFirst(text: string): string {
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function tidyControls(spec: WorldSpec): WorldSpec {
  return {
    ...spec,
    knobs: spec.knobs.map((knob) => ({
      ...knob,
      label: sentenceLabel(knob.label),
      ...(knob.hint ? { hint: capitalFirst(knob.hint) } : {}),
    })),
  };
}
