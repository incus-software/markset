// Markset: pure part of paste-at-pointer.js.

/**
 * The move that centres the union of `bounds` ({x,y,width,height}, nulls
 * skipped) on `pointer` ({x,y}), or null when there is nothing to place or
 * the pointer is off the page (`dims` = {widthPt, heightPt}, optional).
 */
export function pasteShift(bounds, pointer, dims) {
  if (!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return null;
  if (dims?.widthPt > 0 && dims?.heightPt > 0
      && (pointer.x < 0 || pointer.y < 0 || pointer.x > dims.widthPt || pointer.y > dims.heightPt)) return null;
  const bs = (bounds || []).filter(b => b && [b.x, b.y, b.width, b.height].every(Number.isFinite));
  if (!bs.length) return null;
  const x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y));
  const x1 = Math.max(...bs.map(b => b.x + b.width)), y1 = Math.max(...bs.map(b => b.y + b.height));
  return { dx: pointer.x - (x0 + x1) / 2, dy: pointer.y - (y0 + y1) / 2 };
}
