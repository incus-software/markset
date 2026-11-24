// Markset: display styles for the compare overlay.
//
//   tint       — the old sheet orange, the new sheet blue, stacked with
//                multiply: unchanged lines read dark (the default, unchanged).
//   difference — only what changed keeps its colour (orange = only in old,
//                blue = only in new); lines on both sheets turn light grey,
//                so a busy sheet shows its changes at a glance.
//   fade       — both sheets as plotted (no tint), the old one on top with an
//                opacity the user slides between old and new: lines on both
//                sheets stay put while changes fade in and out.
//
// The style and fade position are kept here (like size-warning.js) so the
// upstream compare store stays untouched. compare-viewport.js paints the
// canvases for a style; CompareView.jsx shows the controls.

import { createSignal } from 'solid-js';
import { tintInk } from './diff-classify.js';

export const OVERLAY_STYLES = ['tint', 'difference', 'fade'];
export const DEFAULT_OVERLAY_STYLE = 'tint';

/** Grey level (0-255) that lines found on both sheets take in Difference. */
export const UNCHANGED_GREY = 200;

export function normalizeOverlayStyle(style) {
  return OVERLAY_STYLES.includes(style) ? style : DEFAULT_OVERLAY_STYLE;
}

/** Clamp a fade position to 0..1 (0 = only the old sheet, 1 = only the new). */
export function clampFade(pos) {
  const n = Number(pos);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

/**
 * CSS for the OLD canvas, which sits on top of NEW in overlay mode.
 * @returns {{display:string, blend:string, opacity:number}}
 */
export function oldLayerCss(style, fadePos) {
  const s = normalizeOverlayStyle(style);
  if (s === 'difference') return { display: 'none', blend: 'normal', opacity: 1 };
  if (s === 'fade') return { display: 'block', blend: 'normal', opacity: 1 - clampFade(fadePos) };
  return { display: 'block', blend: 'multiply', opacity: 1 };
}

const [style, setStyleSignal] = createSignal(DEFAULT_OVERLAY_STYLE);
const [fade, setFadeSignal] = createSignal(0.5);

export { style as compareOverlayStyle, fade as compareFadePos };
export function setCompareOverlayStyle(value) { setStyleSignal(normalizeOverlayStyle(value)); }
export function setCompareFadePos(value) { setFadeSignal(clampFade(value)); }

// Drop colour so Difference compares lightness only: a red cloud or a blue
// grid line found on both sheets greys out like black linework does.
function desaturate(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/**
 * Paint the Difference style into `canvasNew`. Both canvases hold plain
 * renders of the same size (OLD already aligned to NEW). With paper = 1 and
 * ink = 0, every step is a canvas blend mode, so this stays fast at any zoom:
 *   C       = lighten(old, new)            ink only where both sheets have it
 *   removed = C − old  (difference)        how much ink only the old sheet has
 *   added   = C − new  (difference)        how much ink only the new sheet has
 *   out     = screen(C, grey) × orange(removed) × blue(added)
 * Shared lines keep their relative shade but lifted into grey..white; ink on
 * one sheet only keeps that sheet's colour, in proportion to how much changed.
 * `canvasOld` is left holding the tinted "removed" layer; the view hides it.
 */
export function composeDifference(canvasOld, canvasNew, oldTint, newTint, grey = UNCHANGED_GREY) {
  if (!canvasOld || !canvasNew) return;
  const w = canvasNew.width;
  const h = canvasNew.height;
  desaturate(canvasOld);
  desaturate(canvasNew);

  const common = (canvasNew.ownerDocument || document).createElement('canvas');
  common.width = w;
  common.height = h;
  const c = common.getContext('2d');
  c.drawImage(canvasNew, 0, 0);
  c.globalCompositeOperation = 'lighten';
  c.drawImage(canvasOld, 0, 0);

  // Each sheet becomes "ink it has that the other lacks", tinted its colour.
  for (const [canvas, tint] of [[canvasOld, oldTint], [canvasNew, newTint]]) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.drawImage(common, 0, 0); // C − sheet: the amount only this sheet has
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);    // invert: paper white, the extra ink dark
    ctx.restore();
    tintInk(canvas, tint);
  }

  // Shared ink lifted to grey: screen(C, grey) maps black to grey, white to white.
  c.globalCompositeOperation = 'screen';
  c.fillStyle = `rgb(${grey}, ${grey}, ${grey})`;
  c.fillRect(0, 0, w, h);

  const n = canvasNew.getContext('2d');
  n.save();
  n.globalCompositeOperation = 'multiply';
  n.drawImage(canvasOld, 0, 0);
  n.drawImage(common, 0, 0);
  n.restore();
  common.width = common.height = 0; // free the bitmap now, not at GC
}
