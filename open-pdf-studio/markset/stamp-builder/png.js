// Markset: PNG helpers for the Stamp Builder (pure, testable).

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * The PNG with a pHYs chunk for `dpi` right after IHDR, so Bluebeam and
 * Acrobat import it at its true printed size. Returns the input unchanged
 * when it is not a PNG.
 */
export function withPngDpi(png, dpi) {
  const src = png instanceof Uint8Array ? png : new Uint8Array(png);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (src.length < 33 || sig.some((b, i) => src[i] !== b)) return src;
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1; // unit: metre
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const out = new Uint8Array(src.length + 21);
  out.set(src.subarray(0, 33), 0); // signature + IHDR
  out.set(chunk, 33);
  out.set(src.subarray(33), 54);
  return out;
}

/** Pixels-per-metre stored in a PNG's pHYs chunk, or null. */
export function pngDpi(png) {
  const b = png instanceof Uint8Array ? png : new Uint8Array(png);
  for (let i = 8; i + 8 < b.length;) {
    const len = (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0;
    const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    if (type === 'pHYs') {
      const ppm = (b[i + 8] << 24 | b[i + 9] << 16 | b[i + 10] << 8 | b[i + 11]) >>> 0;
      return Math.round(ppm * 0.0254);
    }
    i += 12 + len;
  }
  return null;
}
