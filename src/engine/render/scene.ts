import type { Container } from "pixi.js";
import type { Archetype } from "@/engine/spec";
import type { WorldView } from "@/engine/view";
import type { WorldPalette } from "./palette";

export type StageProps = {
  view: unknown;
  archetype: Archetype;
  worldId: string;
  artStyle: string;
  playing: boolean;
  params: Record<string, number | boolean | string>;
};

export type Frame = StageProps & {
  view: WorldView | null;
  time: number;
  reducedMotion: boolean;
  width: number;
  height: number;
  palette: WorldPalette;
};

export type Scene = {
  root: Container;
  update(frame: Frame): void;
  destroy(): void;
};
