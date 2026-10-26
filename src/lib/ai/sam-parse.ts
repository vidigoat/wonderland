/**
 * Parser for SAM 3.1's special-token output.
 * Format (per https://dev.meta.ai/docs/sam/reading-segmentation):
 *   <0f>0<|box;x1=211;y1=228;x2=270;y2=254;w=320;h=334|><|mask;x=0;y=0;data=27,60,~<base85>|>,1<|box;...
 * - one line per frame, `<Nf>` frame marker (indices may skip)
 * - records: object id, box (source pixels), mask (`H,W,<enc>payload`, enc `~` lossless or `!` one_bit, base85)
 *
 * TODO(agent: art-pipeline): decode the payload. Prefer Meta's client library (`decodeMaskToRaster`, see
 * https://dev.meta.ai/docs/sam/client-libraries) over hand-rolling base85. Then composite the mask into the
 * box region to produce a transparent PNG sprite (sharp or canvas). Add a test with the doc's sample line.
 */
export type SamRecord = {
  frame: number;
  objectId: number;
  box: { x1: number; y1: number; x2: number; y2: number; w: number; h: number };
  mask: { h: number; w: number; encoding: "lossless" | "one_bit"; payload: string } | null;
};

const kv = (s: string) => Object.fromEntries(s.split(";").slice(1).map((p) => p.split("=") as [string, string]));

export function parseSamOutput(text: string): SamRecord[] {
  const out: SamRecord[] = [];
  for (const line of text.split("\n")) {
    const fm = line.match(/^<(\d+)f>/);
    if (!fm) continue;
    const frame = Number(fm[1]);
    const body = line.slice(fm[0].length);
    for (const rec of body.split(/,(?=\d+<\|box)/)) {
      const idm = rec.match(/^(\d+)/);
      const boxm = rec.match(/<\|box;([^|]*)\|>/);
      if (!idm || !boxm) continue;
      const b = kv(`box;${boxm[1]}`);
      const maskm = rec.match(/<\|mask;([^|]*)\|>/);
      let mask: SamRecord["mask"] = null;
      if (maskm) {
        const m = kv(`mask;${maskm[1]}`);
        const dm = String(m.data ?? "").match(/^(\d+),(\d+),([~!])([\s\S]*)$/);
        if (dm) mask = { h: Number(dm[1]), w: Number(dm[2]), encoding: dm[3] === "~" ? "lossless" : "one_bit", payload: dm[4] };
      }
      out.push({
        frame,
        objectId: Number(idm[1]),
        box: { x1: +b.x1, y1: +b.y1, x2: +b.x2, y2: +b.y2, w: +b.w, h: +b.h },
        mask,
      });
    }
  }
  return out;
}
