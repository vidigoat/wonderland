import type { WitnessBeat } from "./witness";

/** A short pitched note for a visible event. No sample audio and no hidden law. */
export const CHIME: Record<WitnessBeat, { freq: number; ms: number }> = {
  vault: { freq: 247, ms: 240 },
  halt: { freq: 165, ms: 140 },
  orbit: { freq: 392, ms: 280 },
  leave: { freq: 523, ms: 320 },
  land: { freq: 131, ms: 180 },
  bank: { freq: 98, ms: 260 },
  ridge: { freq: 311, ms: 160 },
  held: { freq: 220, ms: 200 },
  moths: { freq: 440, ms: 220 },
  race: { freq: 349, ms: 200 },
};

let audio: AudioContext | null = null;

/** Call from the gesture that starts a run, so a later note is allowed to play. */
export function armChime(): void {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
  try {
    audio ??= new window.AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

export function playChime(beat: WitnessBeat): void {
  if (!audio) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const tone = CHIME[beat];
  const start = () => {
    if (!audio || audio.state !== "running") return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = beat === "vault" || beat === "bank" ? "triangle" : "sine";
    osc.frequency.value = tone.freq;
    const now = audio.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.ms / 1000);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + tone.ms / 1000 + 0.03);
  };
  if (audio.state === "suspended") {
    void audio.resume().then(start);
    return;
  }
  start();
}
