import type { Params, RulesModule } from "@/engine/rules";
import type { PublicWorldSpec } from "@/engine/spec";
import { WorldSession } from "@/engine/runtime";
import { defaultParams } from "./readings";

export type Shot = { dataUrl: string; caption: string };

/** Move the first slider to the other end of its range. Other knobs stay put. */
export function changedParams(spec: Pick<PublicWorldSpec, "knobs">, base: Params): Params {
  const knob = spec.knobs.find(
    (item) => item.kind === "slider" && typeof item.min === "number" && typeof item.max === "number" && item.max !== item.min,
  );
  if (!knob || typeof knob.min !== "number" || typeof knob.max !== "number") return { ...base };
  const current = base[knob.id];
  const next = current === knob.max ? knob.min : knob.max;
  return { ...base, [knob.id]: next };
}

async function waitForCanvas(canvas: () => HTMLCanvasElement | null): Promise<HTMLCanvasElement> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const picture = canvas();
    if (picture && picture.width >= 2) return picture;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The stage was not ready to be watched.");
}

export function shotCaption(label: string, index: number): string {
  const moment = index === 0 ? "just started" : index === 1 ? "midway" : "at the end";
  return `${label}, ${moment}`;
}

/** Shrink a canvas to at most 768px on its long side and return a JPEG data URL. */
export function canvasJpeg(source: HTMLCanvasElement, max = 768): string {
  const long = Math.max(source.width, source.height, 1);
  const scale = Math.min(1, max / long);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("The playtest could not read the picture.");
  ctx.drawImage(source, 0, 0, width, height);
  return out.toDataURL("image/jpeg", 0.72);
}

/**
 * Two short runs: the starting controls, then one control moved.
 * Three frames from each. The caller supplies the live canvas.
 */
export async function collectShots(
  spec: PublicWorldSpec,
  rules: RulesModule,
  canvas: () => HTMLCanvasElement | null,
  seed: number,
): Promise<Shot[]> {
  const shots: Shot[] = [];
  const runs: { params: Params; label: string }[] = [
    { params: defaultParams(spec), label: "Starting controls" },
    { params: changedParams(spec, defaultParams(spec)), label: "One control moved" },
  ];
  await waitForCanvas(canvas);
  for (const run of runs) {
    const session = await new WorldSession(rules, { ...run.params }, seed).start();
    for (let index = 0; index < 3; index++) {
      if (index > 0) await session.tick(6);
      const picture = canvas();
      if (!picture || picture.width < 2) throw new Error("The stage was not ready to be watched.");
      shots.push({ dataUrl: canvasJpeg(picture), caption: shotCaption(run.label, index) });
    }
  }
  return shots;
}
