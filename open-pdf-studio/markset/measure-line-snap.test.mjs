// Markset: measuring and calibrating snap onto the drawing's own lines.
//
// Reported: a dimension started mid-wall had nothing to snap to for its
// second point on the opposite wall. Upstream's snap engine can snap to the
// nearest point on a PDF line and to the perpendicular foot from the first
// point, but both are off by default. The measuring and calibrating tools
// pass { measure: true } (js/tools/snap-engine.js), which turns both on for
// them only. These tests run the real engine on a small generated PDF.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';

// --- The real snap engine on a real PDF ---------------------------------------
//
// A tiny PDF: two walls as 6 pt thick stroked centrelines, a cross wall meeting
// wall A, and a short line whose end sits next to wall B. Loaded with pdf.js
// into the snap cache, then performSnap is asked what it snaps to.

register('../js/core/app-test-hooks.mjs', import.meta.url);
const { installeerBrowserStubs } = await import('../js/core/app-test-hooks.mjs');
installeerBrowserStubs();
const { state } = await import('../js/core/state.ts');
const snapEngine = await import('../js/tools/snap-engine.js');
const extractor = await import('../js/tools/pdf-snap-extractor.js');
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

function pdfBytes(content) {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

// PDF space (y up). In page space (y down, 792 high): wall A at x=100,
// wall B at x=400, both from y=92 to y=692; cross wall at y=492 from
// x=100 to x=250; short line ending at (390, 342).
const CONTENT = [
  '6 w 100 100 m 100 700 l S',
  '6 w 400 100 m 400 700 l S',
  '1 w 100 300 m 250 300 l S',
  '1 w 300 450 m 390 450 l S',
].join('\n');

async function openPdf() {
  const pdfDoc = await pdfjs.getDocument({ data: pdfBytes(CONTENT), isEvalSupported: false }).promise;
  state.documents = [{
    id: 'doc-line-snap', filePath: null, pdfDoc, currentPage: 1, scale: 1, viewMode: 'single',
    annotations: [], selectedAnnotation: null, selectedAnnotations: [], undoStack: [], redoStack: [],
    pageRotations: {}, measureScale: null,
  }];
  state.activeDocumentIndex = 0;
  await extractor.loadAllPdfSnapData();
  assert.ok(extractor.isPdfSnapLoaded(1), 'PDF line work loaded');
}

function prefs(extra = {}) {
  Object.assign(state.preferences, {
    enableObjectSnap: true, snapToEndpoints: true, snapToMidpoints: true, snapToCenters: true,
    snapToVertices: true, snapToStartPoints: true, snapToEdges: false, snapToIntersections: true,
    snapToPerpendicular: false, snapToQuadrant: false, snapToTangent: false, snapToNearest: false,
    snapToPdfContent: true, enableGridSnap: false, polarTrackingEnabled: false, objectSnapRadius: 12,
  }, extra);
}

const snap = (x, y, pts, opts) => snapEngine.performSnap(x, y, [], 1, 1, null, pts, opts);
const M = { measure: true };

test('engine: measuring mid-wall to mid-wall snaps onto both wall centrelines, square', async () => {
  await openPdf();
  prefs();
  const first = snap(102, 230, null, M);               // near wall A, no point nearby
  assert.deepEqual([first.x, first.y, first.type], [100, 230, 'nearest']);
  const second = snap(398, 236, [{ x: first.x, y: first.y }], M);
  assert.deepEqual([second.x, second.y, second.type], [400, 230, 'perpendicular']);
  assert.equal(Math.hypot(second.x - first.x, second.y - first.y), 300);
});

test('engine: without the measure option, the snap toggles still decide (off by default)', async () => {
  prefs();
  assert.equal(snap(398, 236, [{ x: 100, y: 230 }]).snapped, false);
  prefs({ snapToEdges: true });
  const edge = snap(398, 236, [{ x: 100, y: 230 }]);
  assert.deepEqual([edge.x, edge.y, edge.type], [400, 236, 'edge']);
  prefs({ snapToPerpendicular: true });
  assert.equal(snap(398, 236, [{ x: 100, y: 230 }]).type, 'perpendicular');
  prefs({ enableObjectSnap: false });
  assert.equal(snap(398, 236, [{ x: 100, y: 230 }], M).snapped, false);
  prefs({ snapToPdfContent: false });
  assert.equal(snap(398, 236, [{ x: 100, y: 230 }], M).snapped, false);
});

test('engine: an endpoint and an intersection still win over the line', async () => {
  prefs();
  // Endpoint of the short line, 10 pt from wall B.
  const end = snap(392, 344, [{ x: 100, y: 340 }], M);
  assert.deepEqual([end.x, end.y, end.type], [390, 342, 'endpoint']);
  // Where the cross wall meets wall A (also an endpoint of the cross wall, so
  // it is caught as that point, not as a point along the wall).
  const corner = snap(103, 494, null, M);
  assert.deepEqual([corner.x, corner.y], [100, 492]);
  assert.notEqual(corner.type, 'nearest');
});

test('engine: the snap tolerance applies', async () => {
  prefs({ objectSnapRadius: 4 });
  assert.equal(snap(394, 236, [{ x: 100, y: 230 }], M).snapped, false);
  prefs({ objectSnapRadius: 12 });
  assert.equal(snap(394, 236, [{ x: 100, y: 230 }], M).type, 'perpendicular');
});

test('the measuring and calibrating tools ask for line snapping', () => {
  const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  assert.equal(src('../js/tools/tools/measurement-tool.js').match(/state\.dimPoints, \{ measure: true \}/g)?.length, 2);
  assert.equal(src('../js/tools/tools/calibration-pick-tool.js').match(/\{ measure: true \}/g)?.length, 3);
  assert.equal(src('../js/tools/tools/scale-measure-tool.js').match(/\{ measure: true \}/g)?.length, 3);
  assert.match(src('./scale-tools.js'), /st\.p1 \? \[st\.p1\] : null, \{ measure: true \}/);
});
