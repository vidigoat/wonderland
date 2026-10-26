/**
 * Play loop. Knobs stay locked until the first prediction is recorded.
 * intro → predict → experiment → hypothesise → loop (warmer / colder) → transfer → receipt
 * A discovered verdict skips the warmer/colder loop and goes straight to transfer.
 */

export const PHASE_ORDER = ["intro", "predict", "experiment", "hypothesise", "loop", "transfer", "receipt"] as const;

export type Phase = (typeof PHASE_ORDER)[number];

export type JudgeVerdict = "discovered" | "warmer" | "colder";

export type PlaySnapshot = {
  phase: Phase;
  knobsUnlocked: boolean;
  beforeCorrect: boolean | null;
  afterCorrect: boolean | null;
  transferCorrect: boolean | null;
  /** 0 opening prediction, 1 the prediction asked at the end, null when none is on screen. */
  askingPrediction: 0 | 1 | null;
  startedAtMs: number | null;
  discoveredAtMs: number | null;
};

export function initialPlay(): PlaySnapshot {
  return {
    phase: "intro",
    knobsUnlocked: false,
    beforeCorrect: null,
    afterCorrect: null,
    transferCorrect: null,
    askingPrediction: null,
    startedAtMs: null,
    discoveredAtMs: null,
  };
}

export function leaveIntro(state: PlaySnapshot, nowMs: number): PlaySnapshot {
  if (state.phase !== "intro") return state;
  return { ...state, phase: "predict", askingPrediction: 0, startedAtMs: nowMs };
}

export function commitFirstPrediction(state: PlaySnapshot, correct: boolean): PlaySnapshot {
  if (state.phase !== "predict" || state.askingPrediction !== 0) return state;
  return {
    ...state,
    beforeCorrect: correct,
    knobsUnlocked: true,
    phase: "experiment",
    askingPrediction: null,
  };
}

export function toHypothesise(state: PlaySnapshot): PlaySnapshot {
  if (state.phase !== "experiment") return state;
  return { ...state, phase: "hypothesise" };
}

export function backToExperiment(state: PlaySnapshot): PlaySnapshot {
  if (state.phase !== "hypothesise") return state;
  return { ...state, phase: "experiment" };
}

/** Only call this with a successful judge response. Failures must leave the snapshot untouched. */
export function applyVerdict(state: PlaySnapshot, verdict: JudgeVerdict, nowMs: number): PlaySnapshot {
  if (state.phase !== "hypothesise" && state.phase !== "loop") return state;
  if (verdict === "discovered") {
    return {
      ...state,
      phase: "transfer",
      discoveredAtMs: state.discoveredAtMs ?? nowMs,
      askingPrediction: null,
    };
  }
  return { ...state, phase: "loop" };
}

export function commitTransfer(state: PlaySnapshot, correct: boolean, predictionCount: number): PlaySnapshot {
  if (state.phase !== "transfer" || state.askingPrediction !== null) return state;
  const next: PlaySnapshot = { ...state, transferCorrect: correct };
  if (predictionCount > 1) return { ...next, askingPrediction: 1 };
  return { ...next, afterCorrect: correct, phase: "receipt" };
}

export function commitSecondPrediction(state: PlaySnapshot, correct: boolean): PlaySnapshot {
  if (state.phase !== "transfer" || state.askingPrediction !== 1) return state;
  return {
    ...state,
    afterCorrect: correct,
    askingPrediction: null,
    phase: "receipt",
  };
}

export function discoveryElapsed(state: PlaySnapshot): number | null {
  if (state.startedAtMs == null || state.discoveredAtMs == null) return null;
  return Math.max(0, state.discoveredAtMs - state.startedAtMs);
}

/** Locked on the opening guess, the proof, and the receipt. Live during experiment, hypothesis, and the loop. */
export function knobsLocked(state: PlaySnapshot): boolean {
  if (!state.knobsUnlocked) return true;
  return state.phase === "transfer" || state.phase === "receipt" || state.phase === "intro" || state.phase === "predict";
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
