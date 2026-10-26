"use client";

import { useEffect, useState, type ComponentType } from "react";
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
export function StageSlot(props: StageProps) {
  const [Stage, setStage] = useState<ComponentType<StageProps> | null>(null);

  useEffect(() => {
    let live = true;
    void loadWorldStage().then((Comp) => {
      if (live && Comp) setStage(() => Comp);
    });
    return () => {
      live = false;
    };
  }, []);

  if (Stage) {
    return (
      <div className="stage-frame">
        <Stage {...props} />
      </div>
    );
  }
  return <FallbackStage {...props} />;
}
