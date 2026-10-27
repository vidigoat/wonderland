import type { Params } from "@/engine/rules";
import type { Archetype } from "@/engine/spec";
import type { WorldView } from "@/engine/view";

/** Props Agent A's stage receives. The play loop never sends science or answer keys. */
export type StageProps = {
  view: WorldView | null;
  archetype: Archetype;
  worldId: string;
  artStyle: string;
  playing: boolean;
  params: Params;
};
