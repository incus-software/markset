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

// --- Saved in the PDF ------------------------------------------------------
import { PDFDocument, PDFName, PDFArray, PDFString } from 'pdf-lib';
import { writePageCalibrations, measureFormats } from './page-scale-pdf.js';
import { leesViewportsVanPagina } from '../js/pdf/pdf-viewports.js';
import { restorePageCalibrations, mergeStoredScale, MARKSET_VP_NAME } from './page-scale.js';

const lib = { PDFName, PDFArray, PDFString };

async function cadPdf() {
  // Two ARCH D sheets; sheet 1 carries a CAD viewport with a wrong scale (18 pt/ft).
  const pdf = await PDFDocument.create();
  const p1 = pdf.addPage([2592, 1728]);
  pdf.addPage([2592, 1728]);
  const nf = pdf.context.obj({ Type: 'NumberFormat', U: PDFString.of('ft'), C: 1 / 18 });
  const m = pdf.context.obj({ Type: 'Measure', Subtype: 'RL', R: PDFString.of('1/4" = 1\'-0"'), X: [nf], D: [nf], A: [nf] });
  p1.node.set(PDFName.of('VP'), pdf.context.obj([pdf.context.obj({ Type: 'Viewport', BBox: [100, 100, 1500, 1200], Name: PDFString.of('Plan'), Measure: m })]));
  return pdf;
}

test('a sheet calibration is written as a standard viewport and read back', async () => {
  const pdf = await cadPdf();
  const ms = withPageScale(null, 1, cal(19.635)); // 1.98" = 7'-3"
  assert.equal(writePageCalibrations(pdf, ms, lib), 1);
  const reloaded = await PDFDocument.load(await pdf.save());
  const vps = leesViewportsVanPagina(reloaded.getPage(0));
  assert.equal(vps.length, 1); // the CAD viewport is set aside, ours covers the sheet
  assert.equal(vps[0].name, MARKSET_VP_NAME);
  assert.ok(Math.abs(vps[0].pixelsPerUnit - 19.635) < 1e-6);
  assert.equal(vps[0].unit, 'ft');
  assert.equal(vps[0].width, 2592);
  assert.ok(reloaded.getPage(0).node.lookup(PDFName.of('OPS_OriginalVP')) instanceof PDFArray);
  assert.equal(leesViewportsVanPagina(reloaded.getPage(1)).length, 0); // sheet 2 untouched
  // Opening on another computer: the viewport becomes sheet 1's calibration.
  const restored = restorePageCalibrations(null, { 1: vps });
  assert.ok(Math.abs(pageScaleAt({ measureScale: restored }, 1).pixelsPerUnit - 19.635) < 1e-6);
});

test('reset gives the CAD viewport back', async () => {
  const pdf = await cadPdf();
  writePageCalibrations(pdf, withPageScale(null, 1, cal(20)), lib);
  const again = await PDFDocument.load(await pdf.save());
  writePageCalibrations(again, null, lib); // calibration reset
  const vps = leesViewportsVanPagina((await PDFDocument.load(await again.save())).getPage(0));
  assert.deepEqual(vps.map(v => v.name), ['Plan']);
  assert.ok(Math.abs(vps[0].pixelsPerUnit - 18) < 1e-6);
});

test('number formats show feet and inches; this computer\'s calibration wins on merge', () => {
  const f = measureFormats(18, 'ft');
  assert.equal(f.X[0].U, 'ft');
  assert.ok(Math.abs(f.X[0].C - 1 / 18) < 1e-12);
  assert.deepEqual(f.D.map(d => d.U), ['ft', 'in']);
  const fromPdf = { pages: { 1: cal(19), 2: cal(9) } };
  const local = withPageScale(null, 1, cal(20));
  const m = mergeStoredScale(local, fromPdf);
  assert.equal(m.pages[1].pixelsPerUnit, 20);
  assert.equal(m.pages[2].pixelsPerUnit, 9);
  assert.equal(mergeStoredScale(local, null), local);
  assert.equal(restorePageCalibrations(local, { 1: [{ name: MARKSET_VP_NAME, pixelsPerUnit: 5, unit: 'ft' }] }), local);
});

// --- Measure tools respect the calibration ------------------------------------
import { docHasScale } from './page-scale.js';
import { usMeasureFallback } from './us-units.js';

test('a calibration, Set Scale or the PDF\'s scale stops the 1 pt = 1 mm fallback', () => {
  assert.equal(docHasScale({ annotations: [] }), false);
  assert.equal(docHasScale({ annotations: [], measureScale: withPageScale(null, 2, cal(19.6)) }), true);
  assert.equal(docHasScale({ annotations: [], measureScale: { pages: { 2: cal(19.6) } } }), true);
  assert.equal(docHasScale({ annotations: [], measureScale: { pixelsPerUnit: 18, unit: 'ft' } }), true);
  assert.equal(docHasScale({ annotations: [], pdfViewports: { 1: [{}] } }), true);
  assert.equal(docHasScale({ annotations: [{ type: 'scaleRegion' }] }), true);
  assert.equal(docHasScale(null), false);
});

test('US units: no-scale measurements are paper feet-and-inches; user choices stay', () => {
  const upstream = { measureDistDimScale: 1, measureDistDimUnit: 'mm', measureAreaDimScale: 1, measureAreaDimUnit: 'mm', measurePerimDimScale: 1, measurePerimDimUnit: 'mm' };
  const out = usMeasureFallback(upstream);
  assert.equal(out.measureDistDimUnit, 'ft');
  assert.equal(out.measureDistDimScale, 1 / 864); // 1 pt = 1/72 in on paper
  assert.equal(72 * out.measureDistDimScale * 12, 1); // one paper inch reads 0'-1"
  assert.deepEqual(usMeasureFallback({ ...upstream, unitSystem: 'metric' }), {});
  assert.equal(usMeasureFallback({ ...upstream, measureDistDimUnit: 'in' }).measureDistDimUnit, undefined); // the user's own choice
});
