// Saved markups open the same in other PDF apps: PDF dates, /P and /NM,
// and a flattened copy that draws every markup into its page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, PDFString, PDFArray, PDFDict, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { flattenPdf, placementMatrix } from './flatten-pdf.js';
import { setAnnotIdentity } from './annot-identity.js';
import { flattenedCopyPath } from './flattened-copy.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test('the saver writes markup dates as PDF dates (D:...), never ISO strings', () => {
  const dir = path.join(here, '../js/pdf');
  const files = ['saver.js', ...readdirSync(path.join(dir, 'saver')).filter((f) => f.endsWith('.js')).map((f) => `saver/${f}`)];
  for (const f of files) {
    const src = readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/PDFString\.of\([^)]*toISOString\(\)/.test(src), `${f} writes an ISO date into the PDF`);
  }
  assert.match(PDFString.fromDate(new Date(Date.UTC(2026, 9, 15, 12, 0, 0))).asString(), /^D:20261015120000Z$/);
});

test('every markup gets its page and a unique, stable name', async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const ctx = pdf.context;
  const a = ctx.obj({ Type: 'Annot', Subtype: 'Square' });
  const b = ctx.obj({ Type: 'Annot', Subtype: 'Square' });
  const c = ctx.obj({ Type: 'Annot', Subtype: 'Square', NM: PDFString.of('kept-from-another-app') });
  setAnnotIdentity(a, { pageRef: page.ref, id: 'abc123', pdfNm: 'markset-abc123', context: ctx });
  setAnnotIdentity(b, { pageRef: page.ref, id: 'def456', pdfNm: 'markset-abc123', context: ctx }); // a pasted copy
  setAnnotIdentity(c, { pageRef: page.ref, id: 'x', context: ctx });
  assert.equal(String(a.get(PDFName.of('P'))), String(page.ref));
  assert.equal(a.get(PDFName.of('NM')).asString(), 'markset-abc123', 'the name it was opened with');
  assert.equal(b.get(PDFName.of('NM')).asString(), 'markset-def456', 'a copy gets its own name');
  assert.equal(c.get(PDFName.of('NM')).asString(), 'kept-from-another-app');
});

test('placing an appearance onto its Rect', () => {
  assert.deepEqual(placementMatrix([0, 0, 100, 50], null, [10, 20, 110, 70]), [1, 0, 0, 1, 10, 20]);
  // Markset's own appearances: absolute BBox with a Matrix that moves it to the origin.
  assert.deepEqual(placementMatrix([200, 300, 250, 320], [1, 0, 0, 1, -200, -300], [200, 300, 250, 320]), [1, 0, 0, 1, 200, 300]);
  assert.deepEqual(placementMatrix([0, 0, 10, 10], null, [0, 0, 20, 40]), [2, 0, 0, 4, 0, 0]);
  assert.equal(placementMatrix([0, 0, 0, 10], null, [0, 0, 5, 5]), null);
});

test('flattening draws visible markups into the page and keeps links and form fields', async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const ctx = pdf.context;
  const ap = (ops) => ctx.register(ctx.stream(ops, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 100, 50] }));
  const square = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Square', Rect: [10, 20, 110, 70], F: 4, AP: { N: ap('0 0 1 RG 2 w 1 1 98 48 re S') } }));
  const popup = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Popup', Rect: [0, 0, 1, 1], Parent: square }));
  const hidden = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Square', Rect: [0, 0, 10, 10], F: 2, AP: { N: ap('0 0 m') } }));
  const states = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Stamp', Rect: [200, 200, 300, 250], AS: PDFName.of('On'), AP: { N: { On: ap('0 1 0 rg 0 0 100 50 re f'), Off: ap('') } } }));
  const noAp = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Text', Rect: [300, 300, 320, 320] }));
  const link = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 700, 100, 720] }));
  page.node.set(PDFName.of('Annots'), ctx.obj([square, popup, hidden, states, noAp, link]));
  const { bytes, flattened, kept } = await flattenPdf(await pdf.save());
  assert.deepEqual({ flattened, kept }, { flattened: 2, kept: 1 });

  const out = await PDFDocument.load(bytes);
  const p = out.getPages()[0];
  const left = out.context.lookup(p.node.get(PDFName.of('Annots')));
  assert.ok(left instanceof PDFArray);
  assert.deepEqual(left.asArray().map((r) => String(out.context.lookup(r).get(PDFName.of('Subtype')))), ['/Text', '/Link']);
  const xobjects = out.context.lookup(out.context.lookup(p.node.get(PDFName.of('Resources'))).get(PDFName.of('XObject')));
  assert.ok(xobjects instanceof PDFDict && xobjects.keys().length === 2);
  const contents = out.context.lookup(p.node.get(PDFName.of('Contents')));
  const streams = contents instanceof PDFArray ? contents.asArray().map((r) => out.context.lookup(r)) : [contents];
  const text = streams.map((s) => Buffer.from(s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents()).toString('latin1')).join('\n');
  assert.match(text, /1 0 0 1 10 20 cm\s+\/MsFlat1[-0-9]* Do/);
  assert.match(text, /1 0 0 1 200 200 cm\s+\/MsFlat2[-0-9]* Do/, 'a markup with states draws its current one');
});

test('the flattened copy is named after the PDF, beside it', () => {
  assert.equal(flattenedCopyPath({ fileName: 'A-101.pdf', filePath: 'C:\\Jobs\\A-101.pdf' }), 'C:\\Jobs\\A-101 (flattened).pdf');
  assert.equal(flattenedCopyPath({ fileName: 'A-101.pdf', filePath: '/home/jq/A-101.pdf' }), '/home/jq/A-101 (flattened).pdf');
  assert.equal(flattenedCopyPath({ fileName: 'Untitled', isUntitled: true, filePath: 'C:\\Temp\\x.pdf' }), 'Untitled (flattened).pdf');
});
