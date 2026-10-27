import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { markDataUrl } from "@/components/brand/mark-data";
import { heroWorlds } from "@/worlds";

export const alt = "Wonderland. Don't ask AI for the answer. Ask it for a world.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Four of the worlds' Muse Image paintings, as small JPEG data URLs the share card can draw. */
async function paintings(): Promise<string[]> {
  const urls = ["rumour-town", "peppered-forest", "gatekeeper", "newtons-cannon"]
    .map((id) => heroWorlds.find((world) => world.id === id)?.art.painted?.background)
    .filter((url): url is string => Boolean(url));
  const out: string[] = [];
  for (const url of urls) {
    try {
      const file = path.join(/* turbopackIgnore: true */ process.cwd(), "public", url);
      const jpeg = await sharp(await readFile(file)).resize(320, 320, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
      out.push(`data:image/jpeg;base64,${jpeg.toString("base64")}`);
    } catch {
      // A missing painting leaves a gap, never a broken card.
    }
  }
  return out;
}

export default async function Image() {
  const tiles = await paintings();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#000", color: "#fafafa", padding: "60px 64px" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 600 }}>
            { }
            <img src={markDataUrl()} width={40} height={40} alt="" />
            <div style={{ display: "flex" }}>Wonderland</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.04em" }}>Don&apos;t ask AI for the answer.</div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.04em" }}>Ask it for a world.</div>
            <div style={{ display: "flex", fontSize: 26, lineHeight: 1.4, marginTop: 26, color: "#a3a3a3", maxWidth: 560 }}>
              Any why question becomes a living world with a hidden law, checked against real science. You find the law yourself.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#737373" }}>Built on Meta&apos;s Muse Spark Open, Muse Image and SAM 3.1</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", width: 420, gap: 14, alignContent: "center" }}>
          {tiles.map((src) => (
             
            <img key={src.slice(-24)} src={src} width={203} height={203} alt="" style={{ borderRadius: 18, objectFit: "cover" }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
