// ImageBitmap from a PDFium render, built off the main thread when it is big.
//
// A whole-page render of a 36" x 48" sheet at the 4096 px cap is 12.6 Mpx
// (48 MB of RGBA). Building the ImageData and ImageBitmap for it on the main
// thread took ~250 ms, long enough to freeze the page mid-zoom (measured as a
// 250-270 ms frame gap when such a render landed). A worker does that work
// instead; the bytes go there by transfer and the bitmap comes back the same
// way, so the main thread only hands over pointers. The page-sharpen filter
// (on by default) runs there too: on such a render it took another ~300 ms.

import { sharpenRgba } from './render-sharpen.js';

// Below this the transfer round trip costs more than it saves.
const WORKER_MIN_PIXELS = 2_000_000;

let _worker = null;
let _workerBroken = false;
let _seq = 0;
const _waiting = new Map(); // id -> { resolve, reject }

function _getWorker() {
  if (_workerBroken || typeof Worker === 'undefined') return null;
  if (_worker) return _worker;
  try {
    _worker = new Worker(new URL('./rgba-bitmap.worker.js', import.meta.url), { type: 'module' });
  } catch {
    _workerBroken = true;
    return null;
  }
  _worker.onmessage = (e) => {
    const { id, bitmap, fout } = e.data || {};
    const w = _waiting.get(id);
    if (!w) return;
    _waiting.delete(id);
    if (bitmap) w.resolve(bitmap);
    else w.reject(new Error(fout || 'rgba-bitmap worker failed'));
  };
  _worker.onerror = (e) => {
    // The worker did not load or crashed: fail what it holds and stop using it.
    _workerBroken = true;
    try { _worker.terminate(); } catch { /* gone already */ }
    _worker = null;
    for (const w of _waiting.values()) w.reject(new Error(e?.message || 'rgba-bitmap worker error'));
    _waiting.clear();
  };
  return _worker;
}

function _onMainThread(bytes, w, h, sharpen) {
  const rgba = sharpenRgba(new Uint8ClampedArray(bytes.buffer, bytes.byteOffset + 8, w * h * 4), w, h, sharpen);
  return createImageBitmap(new ImageData(rgba, w, h));
}

/**
 * ImageBitmap of a render in the `[w u32][h u32][rgba…]` wire format, with
 * the page-sharpen filter of strength `sharpen` (0 = off) applied.
 * `bytes` must not be used afterwards: for a big render its buffer moves to
 * the worker. Rejects when the bitmap cannot be built.
 */
export async function rgbaToImageBitmap(bytes, w, h, { sharpen = 0 } = {}) {
  const worker = w * h >= WORKER_MIN_PIXELS ? _getWorker() : null;
  if (!worker) return _onMainThread(bytes, w, h, sharpen);
  // Transfer the whole buffer when the bytes fill it; otherwise copy just them.
  let buf = bytes.buffer;
  let off = bytes.byteOffset + 8;
  if (bytes.byteOffset !== 0 || bytes.byteLength !== buf.byteLength || !(buf instanceof ArrayBuffer)) {
    buf = bytes.slice(8, 8 + w * h * 4).buffer;
    off = 0;
  }
  const id = ++_seq;
  return new Promise((resolve, reject) => {
    _waiting.set(id, { resolve, reject });
    try {
      worker.postMessage({ id, buf, off, w, h, sharpen }, [buf]);
    } catch (err) {
      _waiting.delete(id);
      reject(err);
    }
  });
}
