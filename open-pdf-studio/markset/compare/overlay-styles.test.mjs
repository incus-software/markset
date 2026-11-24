import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OVERLAY_STYLES, DEFAULT_OVERLAY_STYLE, UNCHANGED_GREY,
  normalizeOverlayStyle, clampFade, oldLayerCss, composeDifference,
} from './overlay-styles.js';
import { COMPARE_COLORS, OLD_TINT_CSS, NEW_TINT_CSS } from './diff-classify.js';
import { sheetZone, changeSizeInches, stepChange, SHEET_ZONES } from './change-list.js';

test('Tint stays the default; unknown styles fall back to it', () => {
  assert.equal(DEFAULT_OVERLAY_STYLE, 'tint');
  assert.deepEqual(OVERLAY_STYLES, ['tint', 'difference', 'fade']);
  for (const s of OVERLAY_STYLES) assert.equal(normalizeOverlayStyle(s), s);
  assert.equal(normalizeOverlayStyle('bogus'), 'tint');
  assert.equal(normalizeOverlayStyle(undefined), 'tint');
});

test('fade position is clamped to 0..1', () => {
  assert.equal(clampFade(-1), 0);
  assert.equal(clampFade(2), 1);
  assert.equal(clampFade(0.25), 0.25);
  assert.equal(clampFade('x'), 0.5);
});

test('the old layer multiplies for Tint, hides for Difference, fades for Fade', () => {
  assert.deepEqual(oldLayerCss('tint', 0.3), { display: 'block', blend: 'multiply', opacity: 1 });
  assert.deepEqual(oldLayerCss('difference', 0.3), { display: 'none', blend: 'normal', opacity: 1 });
  // 0 = only the old sheet (opaque on top), 1 = only the new sheet.
  assert.equal(oldLayerCss('fade', 0).opacity, 1);
  assert.equal(oldLayerCss('fade', 1).opacity, 0);
  assert.equal(oldLayerCss('fade', 0.25).opacity, 0.75);
  assert.equal(oldLayerCss('fade', 0.25).blend, 'normal');
});

// ── A tiny software canvas with the blend modes composeDifference uses ──
// (opaque pixels only, which is what the compare renders are).
const BLEND = {
  'source-over': (s) => s,
  multiply: (s, d) => (s * d) / 255,
  screen: (s, d) => 255 - ((255 - s) * (255 - d)) / 255,
  lighten: (s, d) => Math.max(s, d),
  difference: (s, d) => Math.abs(s - d),
};
function parseColor(css) {
  if (css.startsWith('#')) return [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16));
  return css.match(/\d+/g).slice(0, 3).map(Number);
}
function fakeCanvas(w, h) {
  const px = new Float64Array(w * h * 3).fill(255);
  const canvas = { width: w, height: h, px, ownerDocument: { createElement: () => fakeCanvas(0, 0) } };
  const state = { op: 'source-over', fill: '#000000' };
  const stack = [];
  const apply = (getSrc) => {
    if (canvas.px.length !== canvas.width * canvas.height * 3) canvas.px = new Float64Array(canvas.width * canvas.height * 3).fill(255);
    const d = canvas.px;
    for (let i = 0; i < canvas.width * canvas.height; i++) {
      const s = getSrc(i);
      if (state.op === 'saturation') {
        // Grey source: keep the destination's luminosity, drop its saturation.
        const lum = 0.3 * d[i * 3] + 0.59 * d[i * 3 + 1] + 0.11 * d[i * 3 + 2];
        d[i * 3] = d[i * 3 + 1] = d[i * 3 + 2] = lum;
        continue;
      }
      for (let k = 0; k < 3; k++) d[i * 3 + k] = BLEND[state.op](s[k], d[i * 3 + k]);
    }
  };
  const ctx = {
    save: () => stack.push({ ...state }),
    restore: () => Object.assign(state, stack.pop()),
    set globalCompositeOperation(v) { state.op = v; },
    get globalCompositeOperation() { return state.op; },
    set fillStyle(v) { state.fill = v; },
    fillRect: () => { const c = parseColor(state.fill); apply(() => c); },
    drawImage: (src) => apply((i) => [src.px[i * 3], src.px[i * 3 + 1], src.px[i * 3 + 2]]),
  };
  canvas.getContext = () => ctx;
  return canvas;
}
function paint(canvas, i, rgb) { canvas.px.set(rgb, i * 3); }
function pixel(canvas, i) { return Array.from(canvas.px.slice(i * 3, i * 3 + 3), Math.round); }

test('Difference: shared lines go grey, changes keep orange / blue, paper stays white', () => {
  // Pixel 0: paper on both. 1: black on both. 2: only in old. 3: only in new.
  // 4: a red line on both sheets (colour must not survive as a "change").
  const oldC = fakeCanvas(5, 1);
  const newC = fakeCanvas(5, 1);
  paint(oldC, 1, [0, 0, 0]); paint(newC, 1, [0, 0, 0]);
  paint(oldC, 2, [0, 0, 0]);
  paint(newC, 3, [0, 0, 0]);
  paint(oldC, 4, [220, 0, 0]); paint(newC, 4, [220, 0, 0]);
  composeDifference(oldC, newC, OLD_TINT_CSS, NEW_TINT_CSS);
  const { old: o, new: n } = COMPARE_COLORS;
  assert.deepEqual(pixel(newC, 0), [255, 255, 255]);
  assert.deepEqual(pixel(newC, 1), [UNCHANGED_GREY, UNCHANGED_GREY, UNCHANGED_GREY]);
  assert.deepEqual(pixel(newC, 2), [o.r, o.g, o.b]);
  assert.deepEqual(pixel(newC, 3), [n.r, n.g, n.b]);
  const red = pixel(newC, 4);
  assert.ok(red.every((v) => v >= UNCHANGED_GREY - 1), `shared red line reads grey or lighter, got ${red}`);
  assert.ok(Math.max(...red) - Math.min(...red) <= 2, `shared red line has no hue left, got ${red}`);
});

test('a change is placed on the 3×3 sheet grid from the centre of its box', () => {
  const at = (x, y) => sheetZone({ x, y, width: 10, height: 10, sheetW: 300, sheetH: 300 });
  assert.equal(at(0, 0), 'upperLeft');
  assert.equal(at(145, 0), 'upperCenter');
  assert.equal(at(290, 0), 'upperRight');
  assert.equal(at(145, 145), 'center');
  assert.equal(at(0, 290), 'lowerLeft');
  assert.equal(at(290, 290), 'lowerRight');
  assert.equal(sheetZone({ x: 0, y: 0, width: 1, height: 1 }), null, 'no sheet size, no zone');
  assert.equal(SHEET_ZONES.length, 9);
});

test('change size is given in inches on paper', () => {
  // detectScale 1 => 1 px = 1 pt; 144 pt = 2.0", 36 pt = 0.5".
  assert.equal(changeSizeInches({ width: 144, height: 36, detectScale: 1 }), '2.0" × 0.5"');
  // At detectScale 0.5, 72 px = 144 pt = 2.0".
  assert.equal(changeSizeInches({ width: 72, height: 2, detectScale: 0.5 }), '2.0" × <0.1"');
  assert.equal(changeSizeInches({ width: 10, height: 10 }), null);
});

test('stepping through changes wraps around both ends', () => {
  const a = {}, b = {}, c = {};
  const list = [a, b, c];
  assert.equal(stepChange(list, null, 1), a);
  assert.equal(stepChange(list, null, -1), c);
  assert.equal(stepChange(list, a, 1), b);
  assert.equal(stepChange(list, c, 1), a);
  assert.equal(stepChange(list, a, -1), c);
  assert.equal(stepChange([], a, 1), null);
});
