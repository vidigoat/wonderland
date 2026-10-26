import { crc32, deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type RgbaImage = {
  width: number;
  height: number;
  rgba: Uint8Array;
};

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0, 0);
  return Buffer.concat([length, name, data, checksum]);
}

/** 8-bit RGBA PNG. Filter 0, no interlace. */
export function encodeRgbaPng(image: RgbaImage): Buffer {
  const { width, height, rgba } = image;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || rgba.length !== width * height * 4) {
    throw new Error("PNG rgba length does not match its dimensions.");
  }
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const dest = y * (stride + 1);
    raw[dest] = 0;
    for (let x = 0; x < stride; x += 1) raw[dest + 1 + x] = rgba[y * stride + x]!;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function paeth(left: number, up: number, upperLeft: number): number {
  const estimate = left + up - upperLeft;
  const pa = Math.abs(estimate - left);
  const pb = Math.abs(estimate - up);
  const pc = Math.abs(estimate - upperLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upperLeft;
}

function unfilter(raw: Buffer, height: number, stride: number, bytesPerPixel: number): Uint8Array {
  if (raw.length < height * (stride + 1)) throw new Error("PNG image data is truncated.");
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]!;
    const row = y * (stride + 1) + 1;
    const dest = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const filtered = raw[row + x]!;
      const left = x >= bytesPerPixel ? out[dest + x - bytesPerPixel]! : 0;
      const up = y > 0 ? out[dest - stride + x]! : 0;
      const upperLeft = x >= bytesPerPixel && y > 0 ? out[dest - stride + x - bytesPerPixel]! : 0;
      let value = filtered;
      if (filter === 1) value = (filtered + left) & 255;
      else if (filter === 2) value = (filtered + up) & 255;
      else if (filter === 3) value = (filtered + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (filtered + paeth(left, up, upperLeft)) & 255;
      else if (filter !== 0) throw new Error(`PNG filter ${filter} is not supported.`);
      out[dest + x] = value;
    }
  }
  return out;
}

/** Decode an 8-bit gray, RGB, gray+alpha, or RGBA PNG into straight RGBA. */
export function decodePng(bytes: Buffer): RgbaImage {
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error("Image is not a PNG.");
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = 0;
  const idat: Buffer[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    if (offset + 12 + length > bytes.length) throw new Error("PNG chunk is truncated.");
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const expected = bytes.readUInt32BE(offset + 8 + length);
    const actual = crc32(bytes.subarray(offset + 4, offset + 8 + length)) >>> 0;
    if (expected !== actual) throw new Error(`PNG ${type} chunk CRC failed.`);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
      interlace = data[12]!;
    } else if (type === "IDAT") idat.push(Buffer.from(data));
    else if (type === "IEND") break;
  }
  if (width <= 0 || height <= 0) throw new Error("PNG header is missing.");
  if (interlace !== 0) throw new Error("Interlaced PNG is not supported.");
  if (bitDepth !== 8) throw new Error(`PNG bit depth ${bitDepth} is not supported.`);
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (channels === 0) throw new Error(`PNG color type ${colorType} is not supported.`);
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const samples = unfilter(raw, height, stride, channels);
  const rgba = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const source = index * channels;
    const dest = index * 4;
    if (channels === 1) {
      rgba[dest] = rgba[dest + 1] = rgba[dest + 2] = samples[source]!;
      rgba[dest + 3] = 255;
    } else if (channels === 2) {
      rgba[dest] = rgba[dest + 1] = rgba[dest + 2] = samples[source]!;
      rgba[dest + 3] = samples[source + 1]!;
    } else if (channels === 3) {
      rgba[dest] = samples[source]!;
      rgba[dest + 1] = samples[source + 1]!;
      rgba[dest + 2] = samples[source + 2]!;
      rgba[dest + 3] = 255;
    } else {
      rgba[dest] = samples[source]!;
      rgba[dest + 1] = samples[source + 1]!;
      rgba[dest + 2] = samples[source + 2]!;
      rgba[dest + 3] = samples[source + 3]!;
    }
  }
  return { width, height, rgba };
}
