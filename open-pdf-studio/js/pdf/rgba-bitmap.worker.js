// Turns raw RGBA bytes from a PDFium render into an ImageBitmap off the main
// thread (see rgba-bitmap.js), applying the page-sharpen filter first. The
// bitmap is transferred back, not copied.
import { sharpenRgba } from './render-sharpen.js';

self.onmessage = async (e) => {
  const { id, buf, off, w, h, sharpen } = e.data || {};
  try {
    const rgba = sharpenRgba(new Uint8ClampedArray(buf, off, w * h * 4), w, h, sharpen || 0);
    const img = new ImageData(rgba, w, h);
    const bitmap = await createImageBitmap(img);
    self.postMessage({ id, bitmap }, [bitmap]);
  } catch (err) {
    self.postMessage({ id, fout: String(err && err.message ? err.message : err) });
  }
};
