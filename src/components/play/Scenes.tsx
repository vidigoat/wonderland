export type PlaceCard = {
  id: string;
  title: string;
  tagline: string;
  concept: string;
  archetype: string;
};

export function PlaceScene({ id }: { id: string }) {
  if (id === "peppered-forest") {
    return (
      <div className="scene scene-moths" aria-hidden="true">
        <span className="birch b1" />
        <span className="birch b2" />
        <span className="birch b3" />
        <i className="moth a" />
        <i className="moth b" />
        <i className="moth c soot" />
        <i className="moth d" />
      </div>
    );
  }
  if (id === "newtons-cannon") {
    return (
      <div className="scene scene-orbit" aria-hidden="true">
        <span className="ring r1" />
        <span className="ring r2" />
        <span className="ring r3" />
        <span className="planet" />
        <span className="cannon" />
        <span className="orbit-arm">
          <i />
        </span>
      </div>
    );
  }
  if (id === "gatekeeper") {
    return (
      <div className="scene scene-scroll" aria-hidden="true">
        <span className="desk" />
        <span className="scroll-sheet" />
        <span className="seal" />
        <span className="quill" />
      </div>
    );
  }
  if (id === "rumour-town") {
    return (
      <div className="scene scene-queue" aria-hidden="true">
        <span className="lamp" />
        <span className="bank" />
        <i className="person p1" />
        <i className="person p2" />
        <i className="person p3" />
        <i className="person p4" />
        <i className="person p5" />
      </div>
    );
  }
  return (
    <div className="scene scene-spark" aria-hidden="true">
      <span className="valley" />
      <i className="ember" />
    </div>
  );
}

export function SampleNote({ notice }: { notice?: string | null }) {
  if (!notice) return null;
  return (
    <p className="sample-note" role="status">
      {notice}
    </p>
  );
}
