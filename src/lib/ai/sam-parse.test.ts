import { describe, expect, it } from "vitest";
import { decodeMaskToRaster, parseSamOutput, SamMaskError } from "./sam-parse";

/** The truncated sample already in the sam-parse.ts file comment. The payload is a placeholder, not a bitmap. */
const COMMENT_SAMPLE =
  "<0f>0<|box;x1=211;y1=228;x2=270;y2=254;w=320;h=334|><|mask;x=0;y=0;data=27,60,~<base85>|>,1<|box;...";

/** Published frame-0 line from https://dev.meta.ai/docs/sam/reading-segmentation (prompt "button"). */
const DOC_SAMPLE =
  "<0f>0<|box;x1=211;y1=228;x2=270;y2=254;w=320;h=334|><|mask;x=0;y=0;data=27,60,~!!!!M!0c[0o91w?q1!pIH4pPRVp2B3'7`e.ioeAf6-k/#Xd8%dX9x(|>,1<|box;x1=155;y1=228;x2=202;y2=254;w=320;h=334|><|mask;x=0;y=0;data=27,48,~!!!!J!0c[q=Pj_zs=*4C4(/./x#:/`S_GnD`=o3?X{emCgO$y@|>";

/** Rounded 27×60 button from the documentation line. Corners are off, the middle is on. */
const BUTTON_ROWS = [
  "000001111111111111111111111111111111111111111111111111000000",
  "000111111111111111111111111111111111111111111111111111110000",
  "001111111111111111111111111111111111111111111111111111111000",
  "011111111111111111111111111111111111111111111111111111111100",
  "011111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111111",
  "111111111111111111111111111111111111111111111111111111111111",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "111111111111111111111111111111111111111111111111111111111110",
  "011111111111111111111111111111111111111111111111111111111110",
  "011111111111111111111111111111111111111111111111111111111100",
  "001111111111111111111111111111111111111111111111111111111100",
  "000111111111111111111111111111111111111111111111111111111000",
  "000011111111111111111111111111111111111111111111111111100000",
  "000000011111111111111111111111111111111111111111111100000000",
];

function rowsOf(raster: Uint8Array, width: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < raster.length / width; y += 1) rows.push([...raster.slice(y * width, (y + 1) * width)].join(""));
  return rows;
}

describe("parseSamOutput", () => {
  it("reads the sample line from the file comment", () => {
    const [record] = parseSamOutput(COMMENT_SAMPLE);
    expect(parseSamOutput(COMMENT_SAMPLE)).toHaveLength(1);
    expect(record).toMatchObject({
      frame: 0,
      objectId: 0,
      box: { x1: 211, y1: 228, x2: 270, y2: 254, w: 320, h: 334 },
      mask: { h: 27, w: 60, encoding: "lossless", payload: "<base85>" },
    });
  });

  it("reads both button records from the documentation line, including base85 '='", () => {
    const records = parseSamOutput(DOC_SAMPLE);
    expect(records.map((record) => record.objectId)).toEqual([0, 1]);
    expect(records[1]?.box).toMatchObject({ x1: 155, y1: 228, x2: 202, y2: 254, w: 320, h: 334 });
    expect(records[1]?.mask).toMatchObject({ h: 27, w: 48, encoding: "lossless" });
    expect(records[1]?.mask?.payload).toContain("=");
    expect(records[1]?.mask?.payload.endsWith("y@")).toBe(true);
  });

  it("keeps box fields when a confidence value is present", () => {
    const [record] = parseSamOutput(
      "<0f>1<|box;x1=444;y1=625;x2=679;y2=850;w=1800;h=1200;c=0.9609375|><|mask;x=0;y=0;c=0.9609375;data=2,2,!abcd|>",
    );
    expect(record?.box.x1).toBe(444);
    expect(record?.mask).toMatchObject({ h: 2, w: 2, encoding: "one_bit", payload: "abcd" });
  });

  it("skips lines that are not frames", () => {
    expect(parseSamOutput("nope\n")).toEqual([]);
  });
});

describe("decodeMaskToRaster", () => {
  it("throws on the comment sample's placeholder instead of inventing a bitmap", () => {
    const mask = parseSamOutput(COMMENT_SAMPLE)[0]?.mask;
    expect(mask).toBeTruthy();
    expect(() => decodeMaskToRaster(mask!)).toThrow(SamMaskError);
  });

  it("decodes a 4×3 one_bit pattern: 1100 / 0011 / 1010", () => {
    const raster = decodeMaskToRaster({ h: 3, w: 4, encoding: "one_bit", payload: "!!!!'eq8{+dc" });
    expect(rowsOf(raster, 4)).toEqual(["1100", "0011", "1010"]);
  });

  it("decodes an empty mask, a full mask, and a plus", () => {
    expect([...decodeMaskToRaster({ h: 4, w: 4, encoding: "one_bit", payload: "!!!!&!!!!!" })]).toEqual(Array(16).fill(0));
    expect([...decodeMaskToRaster({ h: 4, w: 4, encoding: "one_bit", payload: "!!!!'y80v-)c" })]).toEqual(Array(16).fill(1));
    const plus = decodeMaskToRaster({ h: 8, w: 8, encoding: "one_bit", payload: "!!!!/JpzS[g%-S%CF1-q" });
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const on = x === 3 || x === 4 || y === 3 || y === 4;
        expect(plus[y * 8 + x]).toBe(on ? 1 : 0);
      }
    }
  });

  it("rejects a payload that is not the canonical encoding", () => {
    expect(() => decodeMaskToRaster({ h: 4, w: 4, encoding: "one_bit", payload: "!!!!&!!!!$" })).toThrow(SamMaskError);
  });

  it("decodes the documentation button masks", () => {
    const [first, second] = parseSamOutput(DOC_SAMPLE);
    const wide = decodeMaskToRaster(first!.mask!);
    const narrow = decodeMaskToRaster(second!.mask!);
    expect(rowsOf(wide, 60)).toEqual(BUTTON_ROWS);
    expect(narrow).toHaveLength(27 * 48);
    expect([...narrow].reduce((sum, bit) => sum + bit, 0)).toBe(1236);
    expect(rowsOf(narrow, 48)[0]).toBe("000011111111111111111111111111111111111111100000");
  });
});
