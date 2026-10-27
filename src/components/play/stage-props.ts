import type { Params } from "@/engine/rules";
import type { Archetype, PaintedArt } from "@/engine/spec";
import type { WorldView } from "@/engine/view";

/** Props Agent A's stage receives. The play loop never sends science or answer keys. */
export type StageProps = {
  view: WorldView | null;
  archetype: Archetype;
  worldId: string;
  artStyle: string;
  playing: boolean;
  params: Params;
  /** Muse Image + SAM 3.1 art for a generated world, when it has been painted. */
  painted?: PaintedArt;
  /** Keep the WebGL buffer so a playtest can read the canvas. */
  capture?: boolean;
};
