// Markset: Ctrl+V (and right-click Paste) puts the copy where the mouse is,
// as in Bluebeam, instead of upstream's few-pixel offset from the original.
// That offset also skipped multi-point markups (clouds, polylines, areas),
// so their copies landed exactly on the original and paste looked broken.
//
// The tool dispatcher reports the pointer's page position (recordPointer);
// a pointer outside the page area, or over the ribbon or a panel, leaves the
// upstream placement alone. Ctrl+Shift+V (paste in place) is not touched.
import { annotationBounds } from '../js/annotations/spatial-index.js';
import { applyMoveGeneric } from '../js/annotations/transforms.js';
import { pasteShift } from './paste-shift.js';

let pointer = null; // { page, x, y } in page coordinates, or null
let overPage = false;

/** Called by the tool dispatcher on every pointer move over a page. */
export function recordPointer(page, x, y) {
  if (page > 0 && Number.isFinite(x) && Number.isFinite(y)) pointer = { page, x, y };
}

// Leaving the page area (ribbon, panels) turns pasting at the pointer off;
// the right-click menu keeps the position where it was opened.
if (typeof document !== 'undefined') {
  document.addEventListener('pointermove', (e) => {
    const t = e.target;
    if (!t?.closest || t.closest('.context-menu')) return;
    overPage = !!t.closest('#annotation-canvas, .canvas-container-cont, .page-wrapper, #pdf-container');
  }, true);
}

/**
 * Move freshly pasted annotations (already cloned, on their page) so their
 * combined outline is centred on the pointer. `pageDims` = doc.pageDims.
 * Returns true when it moved them.
 */
export function moveToPointer(annotations, pageDims) {
  if (!overPage || !pointer || !annotations?.length) return false;
  const dims = pageDims?.[pointer.page];
  const shift = pasteShift(annotations.map(a => annotationBounds(a)), pointer, dims);
  if (!shift) return false;
  for (const a of annotations) {
    applyMoveGeneric(a, shift.dx, shift.dy);
    a.page = pointer.page;
  }
  return true;
}

/**
 * Without a pointer on the page, upstream's cascade offset (`off` points)
 * applies, but it skipped markups made of points (clouds, polylines,
 * polygons, areas): their copy landed exactly on the original. Give those
 * the same offset. `sources` are the copied originals, in the same order.
 */
export function shiftUnmoved(annotations, sources, off) {
  if (!(off > 0) || !annotations?.length) return;
  annotations.forEach((a, i) => {
    const b = annotationBounds(a), s = annotationBounds(sources?.[i]);
    if (b && s && Math.abs(b.x - s.x) < 1e-6 && Math.abs(b.y - s.y) < 1e-6) applyMoveGeneric(a, off, off);
  });
}
