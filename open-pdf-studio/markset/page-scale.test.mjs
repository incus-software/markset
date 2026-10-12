import test from 'node:test';
import assert from 'node:assert/strict';
import { withPageScale, withoutPageScale, pageScaleAt, sheetInches } from './page-scale.js';
import { verzamelSchaalBronnen, schaalOpPuntUitBronnen } from '../js/annotations/schaal-op-punt.js';
import { formatPageSizeIn } from './us-units.js';

const cal = (ppu) => ({ pixelsPerUnit: ppu, unit: 'ft', method: 'reference', scaleRatio: null });

test('a calibration is stored per sheet and is also the document default', () => {
  const a = withPageScale(null, 3, cal(18));
  assert.equal(a.pixelsPerUnit, 18);
  assert.equal(a.pages[3].pixelsPerUnit, 18);
  const b = withPageScale(a, 5, cal(9));
  assert.equal(b.pages[3].pixelsPerUnit, 18);
  assert.equal(b.pages[5].pixelsPerUnit, 9);
  assert.equal(b.pixelsPerUnit, 9);
  assert.equal(pageScaleAt({ measureScale: b }, 3).pixelsPerUnit, 18);
  assert.equal(pageScaleAt({ measureScale: b }, 4), null);
  // Reset clears one sheet; the last one clears everything (upstream Reset).
  const c = withoutPageScale(b, 5);
  assert.deepEqual(Object.keys(c.pages), ['3']);
  assert.equal(withoutPageScale(c, 3), null);
  assert.equal(withoutPageScale({ pixelsPerUnit: 2, unit: 'mm' }, 1), null);
});

test('the sheet calibration beats the PDF\'s own scale and a scale bar, not a drawn viewport', () => {
  const pdfVp = { 1: [{ bbox: [0, 0, 2592, 1728], pixelsPerUnit: 4, unit: 'ft' }] };
  const doc = { annotations: [], pdfViewports: pdfVp, measureScale: withPageScale(null, 1, cal(18)) };
  const at = (d) => schaalOpPuntUitBronnen(verzamelSchaalBronnen(d), d, 1, 100, 100);
  assert.equal(at(doc).pixelsPerUnit, 18);
  assert.equal(at(doc).method, 'page');
  const withBar = { ...doc, annotations: [{ type: 'scaleBar', page: 1, pixelsPerUnit: 7, unit: 'ft' }] };
  assert.equal(at(withBar).pixelsPerUnit, 18);
  const withDrawnVp = { ...doc, annotations: [{ type: 'viewport', page: 1, x: 0, y: 0, width: 500, height: 500, pixelsPerUnit: 3, unit: 'ft' }] };
  assert.equal(at(withDrawnVp).pixelsPerUnit, 3);
  // Another sheet without its own calibration keeps the PDF's scale there.
  const other = schaalOpPuntUitBronnen(verzamelSchaalBronnen({ ...doc, pdfViewports: { 2: pdfVp[1] } }), { ...doc, pdfViewports: { 2: pdfVp[1] } }, 2, 100, 100);
  assert.notEqual(other?.method, 'page');
});

test('page sizes and reference lines in inches', () => {
  assert.equal(formatPageSizeIn(36 * 72, 24 * 72), '36" x 24" (ARCH D)');
  assert.equal(formatPageSizeIn(11 * 72, 17 * 72), '11" x 17" (ANSI B)');
  assert.equal(formatPageSizeIn(595, 842), '8.26" x 11.69"');
  assert.equal(formatPageSizeIn(0, 10), null);
  assert.equal(sheetInches(142.36), '1.98"');
  assert.equal(sheetInches(''), '');
});
