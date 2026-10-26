/**
 * Parser for SAM 3.1's special-token output.
 * Format (per https://dev.meta.ai/docs/sam/reading-segmentation):
 *   <0f>0<|box;x1=211;y1=228;x2=270;y2=254;w=320;h=334|><|mask;x=0;y=0;data=27,60,~<base85>|>,1<|box;...
 * - one line per frame, `<Nf>` frame marker (indices may skip)
 * - records: object id, box (source pixels), mask (`H,W,<enc>payload`, enc `~` lossless or `!` one_bit, base85)
 *
 * `decodeMaskToRaster` turns a parsed mask into a row-major bitmap of 0 and 1.
 * The base85 alphabet is the printable ASCII range with the characters that would
 * break this grammar removed (`" \ , ; < > |`). A five-character prefix stores the
 * byte length. `!` payloads are a binary range coder; `~` payloads are a
 * predictive range coder thresholded at 129. A payload that is not canonical, or
 * that cannot be decoded, throws `SamMaskError` — it never returns a stand-in bitmap.
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
  for (const line of text.split(/\r?\n/)) {
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
        // Base85 uses "=", so the data value is everything after the first "data=", not a single "=" split.
        const data = maskm[1].split("data=")[1];
        const dm = data?.match(/^(\d+),(\d+),([~!])([\s\S]*)$/);
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

export class SamMaskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SamMaskError";
  }
}

const RADIX = 85;
const PREFIX = 5;
const TOP = 1 << 24;
const BOTTOM = 1 << 16;
const MASK32 = 0xffffffff;
const SYMBOLS = 256;

const ALPHABET = (() => {
  const excluded = new Set(['"', "\\", ",", ";", "<", ">", "|"]);
  let value = "";
  for (let code = 0x21; code <= 0x7e; code += 1) {
    const character = String.fromCharCode(code);
    if (!excluded.has(character)) value += character;
  }
  return value;
})();

const DIGIT = new Int16Array(128).fill(-1);
for (let index = 0; index < RADIX; index += 1) DIGIT[ALPHABET.charCodeAt(index)] = index;

function fail(message: string): never {
  throw new SamMaskError(message);
}

function digit(character: string): number {
  const code = character.charCodeAt(0);
  const value = code < DIGIT.length ? DIGIT[code] : -1;
  if (value === undefined || value < 0) fail("SAM mask payload contains an invalid base85 character.");
  return value;
}

function pack(input: Uint8Array): string {
  let length = input.length;
  const prefix: string[] = new Array(PREFIX);
  for (let index = PREFIX - 1; index >= 0; index -= 1) {
    prefix[index] = ALPHABET[length % RADIX] ?? fail("SAM mask payload is too large.");
    length = Math.floor(length / RADIX);
  }
  if (length !== 0) fail("SAM mask payload is too large.");
  const output = [...prefix];
  let offset = 0;
  const full = input.length - (input.length % 4);
  for (; offset < full; offset += 4) {
    let value =
      (((input[offset]! << 24) | (input[offset + 1]! << 16) | (input[offset + 2]! << 8) | input[offset + 3]!) >>> 0);
    const digits = new Array<number>(5);
    for (let index = 4; index >= 0; index -= 1) {
      digits[index] = value % RADIX;
      value = (value - digits[index]!) / RADIX;
    }
    for (const encoded of digits) output.push(ALPHABET[encoded] ?? fail("SAM mask payload is too large."));
  }
  const remainder = input.length - offset;
  if (remainder > 0) {
    let value = 0;
    for (let index = 0; index < 4; index += 1) {
      value = ((value << 8) | (index < remainder ? input[offset + index]! : 0)) >>> 0;
    }
    const digits = new Array<number>(5);
    for (let index = 4; index >= 0; index -= 1) {
      digits[index] = value % RADIX;
      value = (value - digits[index]!) / RADIX;
    }
    for (let index = 0; index < remainder + 1; index += 1) {
      output.push(ALPHABET[digits[index]!] ?? fail("SAM mask payload is too large."));
    }
  }
  return output.join("");
}

function unpack(payload: string): Uint8Array {
  if (payload.length < PREFIX) fail("SAM mask payload is missing its length prefix.");
  let length = 0;
  for (let index = 0; index < PREFIX; index += 1) length = length * RADIX + digit(payload[index]!);
  if (!Number.isSafeInteger(length)) fail("SAM mask payload length is unsupported.");
  const remainder = length % 4;
  const expected = PREFIX + Math.floor(length / 4) * 5 + (remainder === 0 ? 0 : remainder + 1);
  if (payload.length !== expected) fail("SAM mask payload length does not match its prefix.");
  const output = new Uint8Array(length);
  let source = PREFIX;
  let destination = 0;
  const full = length - remainder;
  for (; destination < full; destination += 4) {
    let value = 0;
    for (let index = 0; index < 5; index += 1) value = value * RADIX + digit(payload[source + index]!);
    if (value > MASK32) fail("SAM mask payload contains an out-of-range group.");
    source += 5;
    output[destination] = (value >>> 24) & 0xff;
    output[destination + 1] = (value >>> 16) & 0xff;
    output[destination + 2] = (value >>> 8) & 0xff;
    output[destination + 3] = value & 0xff;
  }
  if (remainder > 0) {
    let value = 0;
    for (let index = 0; index < 5; index += 1) {
      value = value * RADIX + (index < remainder + 1 ? digit(payload[source + index]!) : RADIX - 1);
    }
    if (value > MASK32) fail("SAM mask payload contains an out-of-range tail.");
    for (let index = 0; index < remainder; index += 1) output[destination + index] = (value >>> (24 - index * 8)) & 0xff;
  }
  if (pack(output) !== payload) fail("SAM mask payload is not in canonical form.");
  return output;
}

class RangeEncoder {
  #low = 0;
  #range = MASK32;
  #output: number[] = [];

  encode(cumulative: number, frequency: number, total: number) {
    const scaled = Math.floor(this.#range / total);
    this.#low = (this.#low + scaled * cumulative) >>> 0;
    this.#range = scaled * frequency;
    this.#renormalize();
  }

  finish(): Uint8Array {
    for (let index = 0; index < 4; index += 1) {
      this.#output.push((this.#low >>> 24) & 0xff);
      this.#low = (this.#low << 8) >>> 0;
    }
    return Uint8Array.from(this.#output);
  }

  #renormalize() {
    if (this.#range === 0) fail("SAM mask payload has an invalid coding state.");
    for (;;) {
      const span = (this.#low + this.#range) >>> 0;
      const stable = ((this.#low ^ span) >>> 0) < TOP;
      if (!stable) {
        if (this.#range >= BOTTOM) break;
        this.#range = (-this.#low >>> 0) & (BOTTOM - 1);
      }
      this.#output.push((this.#low >>> 24) & 0xff);
      this.#low = (this.#low << 8) >>> 0;
      this.#range = (this.#range << 8) >>> 0;
      if (this.#range === 0) fail("SAM mask payload has an invalid coding state.");
    }
  }
}

class RangeDecoder {
  #input: Uint8Array;
  #position = 0;
  #low = 0;
  #range = MASK32;
  #code = 0;
  #scaled = 0;

  constructor(input: Uint8Array) {
    if (input.length < 4) fail("SAM mask payload is missing its finalization.");
    this.#input = input;
    for (let index = 0; index < 4; index += 1) this.#code = ((this.#code << 8) | this.#read()) >>> 0;
  }

  frequency(total: number): number {
    this.#scaled = Math.floor(this.#range / total);
    if (this.#scaled === 0) fail("SAM mask payload has an invalid coding state.");
    const value = Math.floor(((this.#code - this.#low) >>> 0) / this.#scaled);
    return value >= total ? total - 1 : value;
  }

  decode(cumulative: number, frequency: number) {
    this.#low = (this.#low + this.#scaled * cumulative) >>> 0;
    this.#range = this.#scaled * frequency;
    if (this.#range === 0) fail("SAM mask payload has an invalid coding state.");
    for (;;) {
      const span = (this.#low + this.#range) >>> 0;
      const stable = ((this.#low ^ span) >>> 0) < TOP;
      if (!stable) {
        if (this.#range >= BOTTOM) break;
        this.#range = (-this.#low >>> 0) & (BOTTOM - 1);
      }
      this.#code = ((this.#code << 8) | this.#read()) >>> 0;
      this.#low = (this.#low << 8) >>> 0;
      this.#range = (this.#range << 8) >>> 0;
      if (this.#range === 0) fail("SAM mask payload has an invalid coding state.");
    }
  }

  #read(): number {
    if (this.#position >= this.#input.length) fail("SAM mask payload ended before decoding completed.");
    return this.#input[this.#position++]!;
  }
}

const BIT_INCREMENT = 14;
const BIT_LIMIT = 4096;
const CONTEXTS = 1 << 12;
const PADDING = 2;

function bitContext(raster: Uint8Array, position: number, prior: number, earlier: number): number {
  return (
    raster[position - 1]! |
    (raster[position - 2]! << 1) |
    (raster[prior - 2]! << 2) |
    (raster[prior - 1]! << 3) |
    (raster[prior]! << 4) |
    (raster[prior + 1]! << 5) |
    (raster[prior + 2]! << 6) |
    (raster[earlier - 2]! << 7) |
    (raster[earlier - 1]! << 8) |
    (raster[earlier]! << 9) |
    (raster[earlier + 1]! << 10) |
    (raster[earlier + 2]! << 11)
  );
}

function bump(counts: Uint16Array, offset: number, bit: number) {
  counts[offset + bit] = counts[offset + bit]! + BIT_INCREMENT;
  if (counts[offset]! + counts[offset + 1]! >= BIT_LIMIT) {
    counts[offset] = counts[offset]! >> 1 || 1;
    counts[offset + 1] = counts[offset + 1]! >> 1 || 1;
  }
}

function encodeOneBit(raster: Uint8Array, width: number, height: number): string {
  const encoder = new RangeEncoder();
  const counts = new Uint16Array(CONTEXTS * 2).fill(1);
  const paddedWidth = width + PADDING * 2;
  const padded = new Uint8Array(paddedWidth * (height + PADDING));
  for (let y = 0; y < height; y += 1) {
    const row = (y + PADDING) * paddedWidth + PADDING;
    for (let x = 0; x < width; x += 1) {
      const position = row + x;
      const context = bitContext(padded, position, position - paddedWidth, position - 2 * paddedWidth);
      const offset = context << 1;
      const zero = counts[offset]!;
      const one = counts[offset + 1]!;
      const bit = raster[y * width + x]!;
      if (bit !== 0 && bit !== 1) fail("SAM mask raster is not binary.");
      if (bit === 0) encoder.encode(0, zero, zero + one);
      else encoder.encode(zero, one, zero + one);
      padded[position] = bit;
      bump(counts, offset, bit);
    }
  }
  return `!${pack(encoder.finish())}`;
}

function decodeOneBit(payload: string, width: number, height: number): Uint8Array {
  const decoder = new RangeDecoder(unpack(payload));
  const counts = new Uint16Array(CONTEXTS * 2).fill(1);
  const paddedWidth = width + PADDING * 2;
  const padded = new Uint8Array(paddedWidth * (height + PADDING));
  const output = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = (y + PADDING) * paddedWidth + PADDING;
    for (let x = 0; x < width; x += 1) {
      const position = row + x;
      const context = bitContext(padded, position, position - paddedWidth, position - 2 * paddedWidth);
      const offset = context << 1;
      const zero = counts[offset]!;
      const one = counts[offset + 1]!;
      const value = decoder.frequency(zero + one);
      const bit = value < zero ? 0 : 1;
      if (bit === 0) decoder.decode(0, zero);
      else decoder.decode(zero, one);
      padded[position] = bit;
      output[y * width + x] = bit;
      bump(counts, offset, bit);
    }
  }
  if (encodeOneBit(output, width, height) !== `!${payload}`) {
    fail("SAM mask payload is not canonical or has invalid finalization.");
  }
  return output;
}

const ZERO_INCREMENT = 32;
const ZERO_LIMIT = 16384;
const ORDER_ONE_INCREMENT = 56;
const ORDER_ONE_LIMIT = 8192;
const ORDER_TWO_STEP = 14 * 44;
const ORDER_TWO_LIMIT = 14 * 3584;
const ORDER_ZERO_STEP = 2 * 16;
const ORDER_ZERO_LIMIT = 2 * 2048;
const ORDER_ZERO_INITIAL = 2;
const ORDER_ONE_INITIAL = 1;
const PREDICTORS = 5;

function paeth(left: number, up: number, upperLeft: number): number {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function predict(output: Uint8Array, offset: number, x: number, y: number, mode: number, width: number): number {
  if (mode < 0 || mode >= PREDICTORS) fail("SAM lossless mask uses an invalid predictor.");
  const left = x > 0 ? output[offset - 1]! : 0;
  const up = y > 0 ? output[offset - width]! : 0;
  if (mode === 1) return up;
  if (mode === 2) return left;
  if (mode === 3) return (left + up) >> 1;
  const upperLeft = x > 0 && y > 0 ? output[offset - width - 1]! : 0;
  if (mode === 0) return paeth(left, up, upperLeft);
  if (upperLeft >= Math.max(left, up)) return Math.min(left, up);
  if (upperLeft <= Math.min(left, up)) return Math.max(left, up);
  return left + up - upperLeft;
}

function unzig(value: number, prediction: number): number {
  const delta = value & 1 ? -((value + 1) >> 1) : value >> 1;
  return (prediction + delta) & 0xff;
}

function zeroContext(residuals: Uint8Array, offset: number, x: number, y: number, width: number): number {
  const left = x > 0 ? (residuals[offset - 1] === 0 ? 1 : 0) : 1;
  const up = y > 0 ? (residuals[offset - width] === 0 ? 1 : 0) : 1;
  const upperLeft = x > 0 && y > 0 ? (residuals[offset - width - 1] === 0 ? 1 : 0) : 1;
  const upperRight = y > 0 && x < width - 1 ? (residuals[offset - width + 1] === 0 ? 1 : 0) : 1;
  return left | (up << 1) | (upperLeft << 2) | (upperRight << 3);
}

function orderTwoRow(map: Map<number, Uint16Array>, key: number): Uint16Array {
  let counts = map.get(key);
  if (!counts) {
    counts = new Uint16Array(SYMBOLS + 1);
    map.set(key, counts);
  }
  return counts;
}

function decodeLossless(payload: string, width: number, height: number): Uint8Array {
  const packed = unpack(payload);
  if (packed.length < 5) fail("SAM lossless mask payload is truncated.");
  const predictor = packed[0]!;
  const decoder = new RangeDecoder(packed.subarray(1));
  const length = width * height;
  const output = new Uint8Array(length);
  const residuals = new Uint8Array(length);
  const zeroCounts = new Uint32Array(32).fill(1);
  const orderOne = new Uint16Array(SYMBOLS * SYMBOLS).fill(ORDER_ONE_INITIAL);
  const orderOneTotals = new Int32Array(SYMBOLS).fill(SYMBOLS * ORDER_ONE_INITIAL);
  const orderZero = new Uint16Array(SYMBOLS).fill(ORDER_ZERO_INITIAL);
  let orderZeroTotal = SYMBOLS * ORDER_ZERO_INITIAL;
  const orderTwo = new Map<number, Uint16Array>();
  let previous = 0;
  for (let offset = 0; offset < length; offset += 1) {
    const x = offset % width;
    const y = Math.floor(offset / width);
    const zeroOffset = zeroContext(residuals, offset, x, y, width) << 1;
    const zero = zeroCounts[zeroOffset]!;
    const nonzero = zeroCounts[zeroOffset + 1]!;
    const zeroFrequency = decoder.frequency(zero + nonzero);
    const bit = zeroFrequency < zero ? 0 : 1;
    decoder.decode(bit === 0 ? 0 : zero, bit === 0 ? zero : nonzero);
    zeroCounts[zeroOffset + bit] = zeroCounts[zeroOffset + bit]! + ZERO_INCREMENT;
    if (zeroCounts[zeroOffset]! + zeroCounts[zeroOffset + 1]! >= ZERO_LIMIT) {
      zeroCounts[zeroOffset] = zeroCounts[zeroOffset]! >> 1 || 1;
      zeroCounts[zeroOffset + 1] = zeroCounts[zeroOffset + 1]! >> 1 || 1;
    }
    let symbol = 0;
    if (bit === 1) {
      const above = offset >= width ? residuals[offset - width]! : 0;
      const second = orderTwoRow(orderTwo, (previous << 8) | above);
      const firstOffset = previous << 8;
      const excludedZero = second[0]! + orderOne[firstOffset]! + orderZero[0]!;
      const total = second[SYMBOLS]! + orderOneTotals[previous]! + orderZeroTotal - excludedZero;
      const target = decoder.frequency(total);
      let cumulative = 0;
      symbol = 1;
      let frequency = second[1]! + orderOne[firstOffset + 1]! + orderZero[1]!;
      while (cumulative + frequency <= target) {
        cumulative += frequency;
        symbol += 1;
        if (symbol >= SYMBOLS) fail("SAM lossless mask payload is malformed.");
        frequency = second[symbol]! + orderOne[firstOffset + symbol]! + orderZero[symbol]!;
      }
      decoder.decode(cumulative, frequency);
      second[symbol] = second[symbol]! + ORDER_TWO_STEP;
      second[SYMBOLS] = second[SYMBOLS]! + ORDER_TWO_STEP;
      if (second[SYMBOLS]! >= ORDER_TWO_LIMIT) {
        let totalAfterScaling = 0;
        for (let value = 0; value < SYMBOLS; value += 1) {
          second[value] = second[value]! >> 1;
          totalAfterScaling += second[value]!;
        }
        second[SYMBOLS] = totalAfterScaling;
      }
      orderOne[firstOffset + symbol] = orderOne[firstOffset + symbol]! + ORDER_ONE_INCREMENT;
      orderOneTotals[previous] = orderOneTotals[previous]! + ORDER_ONE_INCREMENT;
      if (orderOneTotals[previous]! >= ORDER_ONE_LIMIT) {
        let totalAfterScaling = 0;
        for (let value = 0; value < SYMBOLS; value += 1) {
          const scaled = orderOne[firstOffset + value]! >> 1 || 1;
          orderOne[firstOffset + value] = scaled;
          totalAfterScaling += scaled;
        }
        orderOneTotals[previous] = totalAfterScaling;
      }
      orderZero[symbol] = orderZero[symbol]! + ORDER_ZERO_STEP;
      orderZeroTotal += ORDER_ZERO_STEP;
      if (orderZeroTotal >= ORDER_ZERO_LIMIT) {
        let totalAfterScaling = 0;
        for (let value = 0; value < SYMBOLS; value += 1) {
          orderZero[value] = orderZero[value]! >> 1;
          totalAfterScaling += orderZero[value]!;
        }
        orderZeroTotal = totalAfterScaling;
      }
    }
    residuals[offset] = symbol;
    output[offset] = unzig(symbol, predict(output, offset, x, y, predictor, width));
    previous = symbol;
  }
  return output;
}

/** Row-major mask, length `h * w`, each entry 0 or 1. `payload` is the base85 body without the `~` / `!` marker. */
export function decodeMaskToRaster(mask: NonNullable<SamRecord["mask"]>): Uint8Array {
  try {
    if (mask.encoding !== "one_bit" && mask.encoding !== "lossless") {
      fail(`Unsupported SAM mask encoding: ${String(mask.encoding)}.`);
    }
    if (!Number.isSafeInteger(mask.w) || !Number.isSafeInteger(mask.h) || mask.w <= 0 || mask.h <= 0) {
      fail("SAM mask dimensions must be positive integers.");
    }
    if (!Number.isSafeInteger(mask.w * mask.h)) fail("SAM mask dimensions are too large.");
    if (typeof mask.payload !== "string" || mask.payload.length === 0) fail("SAM mask payload is empty.");
    if (mask.encoding === "lossless") {
      const coverage = decodeLossless(mask.payload, mask.w, mask.h);
      const raster = new Uint8Array(coverage.length);
      for (let index = 0; index < coverage.length; index += 1) raster[index] = coverage[index]! >= 129 ? 1 : 0;
      return raster;
    }
    return decodeOneBit(mask.payload, mask.w, mask.h);
  } catch (error) {
    if (error instanceof SamMaskError) throw error;
    throw new SamMaskError("SAM mask payload could not be decoded.");
  }
}
