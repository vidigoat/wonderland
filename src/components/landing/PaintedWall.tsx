import Image from "next/image";

/**
 * Columns of the worlds' own paintings (Muse Image), drifting slowly behind the hero.
 * The interface stays black and white; the colour on the page is the worlds themselves.
 */
export function PaintedWall({ paintings, quiet = false }: { paintings: string[]; quiet?: boolean }) {
  if (paintings.length === 0) return null;
  const columns = 5;
  const cols = Array.from({ length: columns }, (_, c) => {
    const own = paintings.filter((_, i) => i % columns === c);
    const fill = own.length > 0 ? own : paintings;
    // Each column repeats its paintings so the drift loops without a seam.
    return [...fill, ...paintings.slice(c, c + 2), ...fill, ...paintings.slice(c, c + 2)];
  });
  return (
    <div className={quiet ? "wall wall-quiet" : "wall"} aria-hidden="true">
      {cols.map((col, c) => (
        <div key={c} className="wall-col" style={{ animationDuration: `${70 + c * 9}s`, animationDirection: c % 2 ? "reverse" : "normal" }}>
          {col.map((src, i) => (
            <div key={`${src}-${i}`} className="wall-tile">
              <Image src={src} alt="" fill sizes="22vw" priority={!quiet && i < 2} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
