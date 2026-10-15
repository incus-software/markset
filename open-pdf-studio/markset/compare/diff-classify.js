// Markset: change classification and colours for the compare view.
//
// Upstream's change detector marks a pixel as "ink" only when it is nearly
// black (darkness sum > 600 of 765) and then flags pixels that are ink on one
// side only. Thin CAD linework and text render grey at the detection
// resolution, so real drawing changes fell below that bar and the change list
// stayed empty. Here a pixel counts as changed when its darkness differs
// between the two sheets by more than MIN_DIFF, whatever its absolute shade.
// The result is fed back to upstream's detectChanges() as two black-on-white
// buffers, so its clustering, merging and change types are unchanged.

/** Darkness difference (0-255) above which a pixel counts as changed. */
export const MIN_DIFF = 30;

/**
 * Colour-blind-safe compare colours (orange / blue pair), chosen so the two
 * sheets stay distinct for red-green colour vision deficiency. Modified
 * regions are dark grey and drawn dashed, so they never depend on hue alone.
 */
export const COMPARE_COLORS = {
  old: { r: 230, g: 97, b: 0 },   // #E66100, the old sheet / removed
  new: { r: 0, g: 90, b: 181 },   // #005AB5, the new sheet / added
  modified: { r: 85, g: 85, b: 85 },
};

const hex = ({ r, g, b }) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const rgba = ({ r, g, b }, a) => `rgba(${r}, ${g}, ${b}, ${a})`;

export const OLD_HEX = hex(COMPARE_COLORS.old);
export const NEW_HEX = hex(COMPARE_COLORS.new);
export const MODIFIED_HEX = hex(COMPARE_COLORS.modified);
export const OLD_TINT_CSS = `rgb(${COMPARE_COLORS.old.r}, ${COMPARE_COLORS.old.g}, ${COMPARE_COLORS.old.b})`;
export const NEW_TINT_CSS = `rgb(${COMPARE_COLORS.new.r}, ${COMPARE_COLORS.new.g}, ${COMPARE_COLORS.new.b})`;

/** Highlight fill/stroke per change type, in the shape upstream expects. */
export const HIGHLIGHT_COLORS = {
  added: { fill: rgba(COMPARE_COLORS.new, 0.22), stroke: rgba(COMPARE_COLORS.new, 0.95) },
  removed: { fill: rgba(COMPARE_COLORS.old, 0.22), stroke: rgba(COMPARE_COLORS.old, 0.95) },
  modified: { fill: rgba(COMPARE_COLORS.modified, 0.18), stroke: rgba(COMPARE_COLORS.modified, 0.95), dash: [6, 4] },
};

/** Colour for a change type: 'added' | 'removed' | anything else = modified. */
export function changeTypeColor(type) {
  return type === 'added' ? NEW_HEX : type === 'removed' ? OLD_HEX : MODIFIED_HEX;
}

const darkness = (d, p) => (765 - d[p] - d[p + 1] - d[p + 2]) / 3;

/**
 * Turn two equally sized RGBA buffers into the pair of black-on-white buffers
 * that upstream's detectChanges() reads: black in `old` where the old sheet is
 * noticeably darker (something removed), black in `new` where the new sheet
 * is (something added). Transparent pixels count as paper.
 *
 * @returns {[{width,height,data}, {width,height,data}] | null} null if sizes differ
 */
export function markChangedPixels(oldData, newData, minDiff = MIN_DIFF) {
  if (!oldData || !newData || oldData.width !== newData.width || oldData.height !== newData.height) return null;
  const { width, height } = newData;
  const n = width * height;
  const od = oldData.data, nd = newData.data;
  const bo = new Uint8ClampedArray(n * 4).fill(255);
  const bn = new Uint8ClampedArray(n * 4).fill(255);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const o = od[p + 3] === 0 ? 0 : darkness(od, p);
    const w = nd[p + 3] === 0 ? 0 : darkness(nd, p);
    const d = o - w;
    if (d > minDiff) bo[p] = bo[p + 1] = bo[p + 2] = 0;
    else if (d < -minDiff) bn[p] = bn[p + 1] = bn[p + 2] = 0;
  }
  // Grow the marks by GROW px so the letters of a word, or a dashed line,
  // join into one cluster: upstream drops clusters under 36 px before it
  // merges neighbours, which otherwise erased small text letter by letter.
  return [grow(bo, width, height), grow(bn, width, height)];
}

/** Marked-pixel growth radius (px at detection resolution). */
export const GROW = 2;

function grow(buf, width, height, r = GROW) {
  const n = width * height;
  const on = new Uint8Array(n);
  for (let i = 0; i < n; i++) on[i] = buf[i * 4] === 0 ? 1 : 0;
  // Separable square dilation: rows, then columns.
  const rows = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    const base = y * width;
    for (let x = 0; x < width; x++) {
      if (!on[base + x]) continue;
      for (let k = Math.max(0, x - r); k <= Math.min(width - 1, x + r); k++) rows[base + k] = 1;
    }
  }
  const out = new Uint8ClampedArray(n * 4).fill(255);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (!rows[y * width + x]) continue;
      for (let k = Math.max(0, y - r); k <= Math.min(height - 1, y + r); k++) {
        const p = (k * width + x) * 4;
        out[p] = out[p + 1] = out[p + 2] = 0;
      }
    }
  }
  return { width, height, data: out };
}

/**
 * Compare two page sizes (in PDF points). Returns null when they match within
 * `tolerance` (fraction of the larger side), else a description for a warning.
 */
export function pageSizeMismatch(oldSize, newSize, tolerance = 0.005) {
  if (!oldSize || !newSize) return null;
  const tol = tolerance * Math.max(oldSize.width, oldSize.height, newSize.width, newSize.height);
  if (Math.abs(oldSize.width - newSize.width) <= tol && Math.abs(oldSize.height - newSize.height) <= tol) return null;
  const inches = (s) => `${(s.width / 72).toFixed(1)}" × ${(s.height / 72).toFixed(1)}"`;
  return { old: inches(oldSize), new: inches(newSize) };
}

/**
 * Tint a black-on-white render so ink takes `cssColor` and paper stays white
 * ('screen' blend: white stays white, black becomes the tint). Stack two
 * tinted sheets with mix-blend-mode: multiply and lines on both sheets come
 * out dark, lines on one sheet only keep that sheet's colour.
 */
export function tintInk(canvas, cssColor) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
