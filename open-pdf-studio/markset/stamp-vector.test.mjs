// Markset: symbol stamps saved as vector drawings, also on rotated pages and
// when the stamp itself is turned (placement from saver/stempel-draaiing.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, PDFHexString } from 'pdf-lib';
import { writeVectorStampAppearance } from './stamp-vector.js';
import { stempelAppearance } from '../js/pdf/saver/stempel-draaiing.js';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"><rect x="2" y="2" width="60" height="28" fill="none" stroke="#ff0000" stroke-width="2"/></svg>';

async function write(ann, pageRot) {
  const pdf = await PDFDocument.create();
  const context = pdf.context;
  const annotDict = context.obj({ Type: 'Annot', Subtype: 'Stamp' });
  const placement = stempelAppearance({ w: ann.width, h: ann.height, paginaRotatie: pageRot, rotatie: ann.rotation });
  const ok = writeVectorStampAppearance({ ann, annotDict, context, pdf: { PDFName, PDFHexString }, placement });
  if (!ok) return { ok };
  const ap = context.lookup(context.lookup(annotDict.get(PDFName.of('AP'))).get(PDFName.of('N')));
  const bbox = context.lookup(ap.dict.get(PDFName.of('BBox'))).asArray().map((n) => n.asNumber());
  const content = Buffer.from(ap.getContents()).toString('latin1');
  return { ok, bbox, content, svgKept: !!annotDict.get(PDFName.of('OPS_StampSvg')), placement };
}

test('an upright stamp: the box is the BBox, clipped, no turn', async () => {
  const r = await write({ width: 64, height: 32, stampSvg: SVG }, 0);
  assert.ok(r.ok && r.svgKept);
  assert.deepEqual(r.bbox, [0, 0, 64, 32]);
  assert.ok(r.content.startsWith('q\n0 0 64 32 re W n\n'), 'clip first, no rotation before it');
});

test('on a page shown turned 90°: drawn turned back, BBox keeps the box size', async () => {
  const r = await write({ width: 64, height: 32, stampSvg: SVG }, 90);
  assert.deepEqual(r.bbox, [0, 0, 64, 32]);
  assert.match(r.content, /0 1 -1 0 0 0 cm/, 'turned by the page rotation');
  assert.match(r.content, /0 0 32 64 re W n/, 'drawn in the shown (swapped) size');
});

test('a stamp turned 30°: BBox grows to the turned outline', async () => {
  const r = await write({ width: 64, height: 32, stampSvg: SVG, rotation: 30 }, 0);
  assert.ok(r.bbox[2] > 64 && r.bbox[3] > 32);
  assert.equal(r.bbox[2], r.placement.bboxW);
});

test('no SVG or a text stamp: the PNG path is used instead', async () => {
  assert.equal((await write({ width: 64, height: 32 }, 0)).ok, false);
  assert.equal((await write({ width: 64, height: 32, stampSvg: SVG, stampText: 'APPROVED' }, 0)).ok, false);
});
