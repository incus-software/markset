// What to render after a zoom on a large sheet, and what to show meanwhile.
//
// A 36" x 48" sheet is 3456 x 2592 pt. A whole-page bitmap is capped at
// 4096 px on its long axis (MAX_BITMAP_AXIS_PX), so above ~118 % zoom (at
// dpr 1) the whole page can never be sharp on its own and the visible-region
// tile has to carry the detail. Three rules keep zooming on such a sheet fast
// and sharp:
//
//   1. Render the whole page once, at the scale the screen needs, never above
//      the axis cap. Rounding up to a power-of-two bucket first meant a
//      6912 x 5184 px (143 MB) render on a 48" sheet, followed by a second
//      exact render: seconds of PDFium time and a long main-thread stall when
//      the big bitmap landed.
//   2. While waiting, show the sharpest bitmap already cached for the page,
//      whatever scale it was rendered at, instead of only the power-of-two
//      buckets (exact renders were never found as a stand-in).
//   3. When the whole page at the needed scale is much bigger than the screen
//      and not cached yet, render the visible region first. On dense vector
//      sheets PDFium clips to the region, so a screen-sized tile arrives in a
//      fraction of the whole-page time; the whole page follows for panning.

/** Rounds a render scale the way the bitmap cache keys it. */
export function roundRenderScale(scale) {
  return Math.round(scale * 1000) / 1000;
}

/**
 * The scale to render the whole page at: what the screen needs (zoom x dpr),
 * capped so neither axis exceeds `maxAxisPx`.
 */
export function wholePageRenderScale({ zoom, devicePixelRatio, pageWpt, pageHpt, maxAxisPx = 4096 }) {
  const need = zoom * (devicePixelRatio || 1);
  const maxAxisPt = Math.max(pageWpt, pageHpt);
  if (!Number.isFinite(need) || need <= 0 || !(maxAxisPt > 0)) return 0;
  return roundRenderScale(Math.min(need, maxAxisPx / maxAxisPt));
}

/**
 * Picks the stand-in bitmap to show while the exact one renders: the
 * smallest one that is at least as sharp as needed (2 % tolerance), else the
 * sharpest one there is. `entries` are cache entries with a numeric `scale`.
 */
export function pickPreviewBitmap(entries, targetScale) {
  let atLeast = null;
  let sharpest = null;
  for (const e of entries || []) {
    if (!e || !(e.scale > 0)) continue;
    if (e.scale >= targetScale * 0.98) {
      if (!atLeast || e.scale < atLeast.scale) atLeast = e;
    }
    if (!sharpest || e.scale > sharpest.scale) sharpest = e;
  }
  return atLeast || sharpest;
}

// A tile covers the visible area plus a 25 % buffer on every side, so it has
// about (1.5 x 1.5) = 2.25 x the screen's pixels. Only when the whole page
// is clearly bigger than that is rendering the tile first worth an extra
// request.
const TILE_FIRST_MIN_RATIO = 4;

/**
 * Should the visible region be rendered as a tile?
 *  - always above the axis cap (the whole page cannot be sharp there);
 *  - below it, only while the whole page at the needed scale is not cached
 *    and would be much bigger than the screen (it would take far longer).
 */
export function needsRegionTile({
  zoom,
  devicePixelRatio,
  pageWpt,
  pageHpt,
  viewWcss,
  viewHcss,
  wholePageReady,
  maxAxisPx = 4096,
}) {
  const dpr = devicePixelRatio || 1;
  const need = zoom * dpr;
  const maxAxisPt = Math.max(pageWpt, pageHpt);
  if (!(need > 0) || !(maxAxisPt > 0)) return false;
  if (need > maxAxisPx / maxAxisPt + 0.001) return true;
  if (wholePageReady) return false;
  const pagePx = pageWpt * need * pageHpt * need;
  const viewPx = viewWcss * dpr * viewHcss * dpr;
  return viewPx > 0 && pagePx > viewPx * TILE_FIRST_MIN_RATIO;
}

/**
 * Which cache entries to drop so the cache fits both limits. `entries` are in
 * eviction order (oldest first) as [key, { w, h }]; `keep(key)` protects an
 * entry (shown, claimed, just added). Returns the keys to drop.
 */
export function bitmapsToEvict(entries, { maxEntries, maxBytes, keep = () => false }) {
  let count = 0;
  let bytes = 0;
  for (const [, e] of entries) {
    count++;
    bytes += entryBytes(e);
  }
  const drop = [];
  for (const [key, e] of entries) {
    if (count <= maxEntries && bytes <= maxBytes) break;
    if (keep(key)) continue;
    drop.push(key);
    count--;
    bytes -= entryBytes(e);
  }
  return drop;
}

export function entryBytes(e) {
  const w = Number(e && e.w) || 0;
  const h = Number(e && e.h) || 0;
  return w * h * 4;
}
