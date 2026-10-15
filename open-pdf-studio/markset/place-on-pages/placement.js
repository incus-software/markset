// Markset: place a stamp, seal or any markup on many pages at once, in the
// same spot on each sheet. Pure helpers (no app state), tested in Node.
//
// Positions are kept relative to a chosen corner of the sheet, so a seal in
// the title block (bottom-right) lands in the title block of every sheet,
// even when the set mixes sheet sizes. Coordinates are page points with the
// origin at the top-left, as in doc.pageDims and annotationBounds().

/** Corners a placement can be measured from; 'same' keeps the exact x/y. */
export const ANCHORS = ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'same'];

/**
 * Parse a page list such as "1-3, 5, 8-" (8 to the end) into sorted, unique
 * page numbers within 1..pageCount. Returns null when the text is not a page
 * list; an empty or whitespace string means no pages.
 */
export function parsePageList(text, pageCount) {
  const s = String(text ?? '').trim();
  if (!s) return [];
  const pages = new Set();
  for (const part of s.split(/[,;]+/).map((p) => p.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)?\s*(-)?\s*(\d+)?$/);
    if (!m || (!m[1] && !m[3])) return null;
    const from = m[1] ? Number(m[1]) : 1;
    const to = m[2] ? (m[3] ? Number(m[3]) : pageCount) : from;
    if (!(from >= 1) || !(to >= from)) return null;
    for (let p = from; p <= Math.min(to, pageCount); p++) pages.add(p);
  }
  return [...pages].sort((a, b) => a - b);
}

/**
 * Move needed to put markups with combined `bounds` from a sheet of size
 * `src` onto a sheet of size `dst`, keeping the same distance from `anchor`.
 * Sizes are { widthPt, heightPt }. Returns { dx, dy }.
 */
export function anchorShift(src, dst, anchor) {
  if (!src || !dst || anchor === 'same') return { dx: 0, dy: 0 };
  const right = anchor === 'bottom-right' || anchor === 'top-right';
  const bottom = anchor === 'bottom-right' || anchor === 'bottom-left';
  return {
    dx: right ? dst.widthPt - src.widthPt : 0,
    dy: bottom ? dst.heightPt - src.heightPt : 0,
  };
}

/** Union of bounds ({x, y, width, height}, nulls skipped), or null. */
export function unionBounds(list) {
  const bs = (list || []).filter((b) => b && [b.x, b.y, b.width, b.height].every(Number.isFinite));
  if (!bs.length) return null;
  const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.width)), y1 = Math.max(...bs.map((b) => b.y + b.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** True when `b` moved by (dx, dy) lies inside a sheet of size `dims` (1 pt slack). */
export function fitsOnSheet(b, dims, dx = 0, dy = 0) {
  if (!b || !dims) return false;
  const x = b.x + dx, y = b.y + dy;
  return x >= -1 && y >= -1 && x + b.width <= dims.widthPt + 1 && y + b.height <= dims.heightPt + 1;
}

/**
 * Plan a placement. Returns, per target page, the move to apply, and the
 * pages skipped because the markups would fall off that sheet.
 *
 * @param {object} args
 * @param {{x,y,width,height}} args.bounds  combined bounds of the markups
 * @param {number} args.sourcePage          page the markups are on (never a target)
 * @param {number[]} args.pages             requested target pages
 * @param {Record<number,{widthPt,heightPt}>} args.pageDims
 * @param {string} args.anchor              one of ANCHORS
 * @returns {{ place: {page:number, dx:number, dy:number}[], skipped: number[] }}
 */
export function planPlacement({ bounds, sourcePage, pages, pageDims, anchor }) {
  const src = pageDims?.[sourcePage];
  const place = [], skipped = [];
  for (const page of pages || []) {
    if (page === sourcePage) continue;
    const dst = pageDims?.[page];
    const { dx, dy } = anchorShift(src, dst, ANCHORS.includes(anchor) ? anchor : 'bottom-right');
    if (dst && fitsOnSheet(bounds, dst, dx, dy)) place.push({ page, dx, dy });
    else skipped.push(page);
  }
  return { place, skipped };
}

/** The corner nearest the markups, as the default anchor for the dialog. */
export function nearestAnchor(bounds, dims) {
  if (!bounds || !dims) return 'bottom-right';
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  const right = cx > dims.widthPt / 2, bottom = cy > dims.heightPt / 2;
  return `${bottom ? 'bottom' : 'top'}-${right ? 'right' : 'left'}`;
}
