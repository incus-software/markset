// Markset: decoded images for smart symbol `image` commands (a review stamp's
// logo, a seal's signature). The canvas renderer draws synchronously, so getMarksetImage() gives
// the image once it has loaded and starts loading it otherwise; when it
// arrives, the registered redraw runs.
const cache = new Map(); // src → HTMLImageElement | null (loading or failed)
const MAX = 32;
let redraw = null;
let pending = false;

export function registerMarksetImageRedraw(fn) {
  redraw = typeof fn === 'function' ? fn : null;
}

function notify() {
  if (!redraw || pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    try { redraw(); } catch { /* redraw is best effort */ }
  });
}

/** The loaded image for a data URL, or null while it loads (or if it cannot). */
export function getMarksetImage(src) {
  if (typeof src !== 'string' || !src.startsWith('data:image/') || typeof Image === 'undefined') return null;
  if (cache.has(src)) {
    const img = cache.get(src);
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  }
  if (cache.size >= MAX) cache.delete(cache.keys().next().value);
  const img = new Image();
  img.onload = notify;
  img.onerror = () => cache.set(src, null);
  img.src = src;
  cache.set(src, img);
  return null;
}
