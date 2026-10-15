import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { detectChanges } from '../../js/compare/change-detector.js';
import {
  markChangedPixels, pageSizeMismatch, changeTypeColor, HIGHLIGHT_COLORS, OLD_HEX, NEW_HEX,
} from './diff-classify.js';

// A white W×H RGBA buffer with optional grey rectangles [x, y, w, h, shade].
function sheet(W, H, rects = []) {
  const data = new Uint8ClampedArray(W * H * 4).fill(255);
  for (const [x, y, w, h, shade] of rects) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const p = (j * W + i) * 4;
      data[p] = data[p + 1] = data[p + 2] = shade;
    }
  }
  return { width: W, height: H, data };
}

test('grey linework that upstream ignores is found', () => {
  // A 3px grey line (shade 150, the way thin CAD lines render at detection
  // resolution) added in the new sheet, plus one removed from the old sheet.
  const oldS = sheet(200, 100, [[20, 20, 3, 50, 150]]);
  const newS = sheet(200, 100, [[120, 20, 60, 3, 150]]);
  assert.equal(detectChanges(oldS, newS).length, 0, 'upstream ink test misses grey lines');
  const [o, n] = markChangedPixels(oldS, newS);
  const types = detectChanges(o, n).map((c) => c.type).sort();
  assert.deepEqual(types, ['added', 'removed']);
});

test('identical sheets and faint differences give no changes', () => {
  const a = sheet(120, 80, [[10, 10, 40, 2, 120], [60, 30, 2, 40, 60]]);
  const [o, n] = markChangedPixels(a, a);
  assert.equal(detectChanges(o, n).length, 0);
  // Anti-aliasing jitter of a few levels is not a change.
  const b = sheet(120, 80, [[10, 10, 40, 2, 130], [60, 30, 2, 40, 70]]);
  const [o2, n2] = markChangedPixels(a, b);
  assert.equal(detectChanges(o2, n2).length, 0);
});

test('a line that only changes position is reported once, as modified', () => {
  const oldS = sheet(200, 120, [[50, 40, 3, 40, 0]]);
  const newS = sheet(200, 120, [[56, 40, 3, 40, 0]]);
  const [o, n] = markChangedPixels(oldS, newS);
  const changes = detectChanges(o, n);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].type, 'modified');
});

test('size mismatch and bad input', () => {
  assert.equal(markChangedPixels(sheet(10, 10), sheet(12, 10)), null);
  assert.equal(pageSizeMismatch({ width: 2592, height: 1728 }, { width: 2592.5, height: 1728 }), null);
  assert.deepEqual(pageSizeMismatch({ width: 2592, height: 1728 }, { width: 3024, height: 2160 }),
    { old: '36.0" × 24.0"', new: '42.0" × 30.0"' });
});

test('compare colours avoid red and green and mark modified by shape', () => {
  assert.equal(changeTypeColor('removed'), OLD_HEX);
  assert.equal(changeTypeColor('added'), NEW_HEX);
  for (const hex of [OLD_HEX, NEW_HEX]) {
    const [r, g] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16)];
    // Not a green (g dominant) — the old pair was red-600 / green-600.
    assert.ok(!(g > r && g > parseInt(hex.slice(5, 7), 16)), `${hex} reads as green`);
  }
  assert.ok(Array.isArray(HIGHLIGHT_COLORS.modified.dash), 'modified changes are dashed');
});

// End to end on real PDFs: a drawing revision with a moved door, a new window
// and a deleted label, rendered at Markset's detection resolution.
test('finds drawing changes on rendered PDF revisions', async (t) => {
  let createCanvas;
  try { ({ createCanvas } = await import('@napi-rs/canvas')); } catch { t.skip('no canvas backend'); return; }
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  async function plan(rev) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([2592, 1728]); // ARCH D
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const line = (x1, y1, x2, y2, t = 0.6) => page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color: rgb(0, 0, 0) });
    page.drawRectangle({ x: 400, y: 400, width: 1200, height: 800, borderColor: rgb(0, 0, 0), borderWidth: 1.2 });
    line(1000, 400, 1000, 1200);
    const doorX = rev === 2 ? 1060 : 1100;               // moved door
    line(doorX, 800, doorX + 54, 800, 1.2);
    page.drawText('BATH', { x: 1200, y: 900, size: 11, font });
    if (rev === 1) page.drawText('LAUNDRY', { x: 1350, y: 600, size: 11, font }); // deleted in rev 2
    if (rev === 2) { line(1450, 400, 1550, 400, 0.5); line(1450, 404, 1550, 404, 0.5); } // new window
    return pdf.save();
  }
  async function render(bytes) {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
    const page = await doc.getPage(1);
    const scale = Math.min(1.5, 1600 / 2592); // compare-viewport.js DETECTION_MAX_DIM
    const vp = page.getViewport({ scale });
    const c = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return ctx.getImageData(0, 0, c.width, c.height);
  }
  const [a, b] = await Promise.all([plan(1).then(render), plan(2).then(render)]);
  const [o, n] = markChangedPixels(a, b);
  const found = detectChanges(o, n);
  assert.ok(found.length >= 3, `expected the door, window and label, got ${found.length}`);
  const [sa, sb] = markChangedPixels(a, a);
  assert.equal(detectChanges(sa, sb).length, 0);
});
