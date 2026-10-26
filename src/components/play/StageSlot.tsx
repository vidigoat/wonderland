"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { FallbackStage } from "./FallbackStage";
import type { StageProps } from "./stage-props";

type StageModule = {
  WorldStage?: ComponentType<StageProps>;
  default?: ComponentType<StageProps>;
};

async function loadWorldStage(): Promise<ComponentType<StageProps> | null> {
  try {
    const mod = (await import("@/components/stage/WorldStage")) as unknown as StageModule;
    const Comp = mod.WorldStage ?? mod.default ?? null;
    return typeof Comp === "function" ? Comp : null;
  } catch {
    return null;
  }
}

/** Real stage when Agent A has landed it; a palette silhouette until then. */
export function StageSlot({ beat, beatId, ...props }: StageProps & { beat: string | null; beatId: number }) {
  const [Stage, setStage] = useState<ComponentType<StageProps> | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    void loadWorldStage().then((Comp) => {
      if (live && Comp) setStage(() => Comp);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    el.classList.remove("is-live");
    if (!beat) {
      delete el.dataset.beat;
      return;
    }
    el.dataset.beat = beat;
    void el.offsetWidth;
    el.classList.add("is-live");
  }, [Stage, beat, beatId]);

  if (Stage) {
    return (
      <div className="stage-frame" ref={frame}>
        {beat ? (
          <div className="stage-motes" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index} className="stage-mote" />
            ))}
          </div>
        ) : null}
        <Stage {...props} />
      </div>
    );
  }
  return <FallbackStage {...props} />;
}
