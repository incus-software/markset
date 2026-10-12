import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, PDFHexString, PDFString } from 'pdf-lib';
import { pdfTextString, decodePdfTextObject } from '../js/pdf/saver/pdf-text.js';

const NOTE = "1) 3'-3\" CONFIRMED\n\n2) CONFIRMED - THERE IS NOT STONE VENEER\n\n3) SEE WALL SECTIONS. ";

test('text with an unbalanced ) or a backslash is written as hex', () => {
  assert.ok(pdfTextString(NOTE) instanceof PDFHexString);
  assert.ok(pdfTextString('ends with \\') instanceof PDFHexString); // would escape the closing )
  assert.ok(pdfTextString('a \\) b (') instanceof PDFHexString);
  assert.ok(pdfTextString('{"a":"b\\"c"}') instanceof PDFString); // JSON escapes are harmless
  assert.ok(pdfTextString('(open') instanceof PDFHexString);
  assert.ok(pdfTextString('see (A1.0)') instanceof PDFString); // balanced: unchanged
  assert.ok(pdfTextString('OK') instanceof PDFString);
});

test('a saved FreeText with numbered lines stays readable, in every annotation', async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const refs = [NOTE, 'OK', '2) second'].map(t => pdf.context.register(pdf.context.obj({
    Type: 'Annot', Subtype: 'FreeText', Rect: [10, 10, 200, 100], Contents: pdfTextString(t),
  })));
  page.node.set(PDFName.of('Annots'), pdf.context.obj(refs));
  const bytes = await pdf.save(); // object streams, as the app saves
  const back = await PDFDocument.load(bytes, { throwOnInvalidObject: true });
  const texts = back.getPage(0).node.Annots().asArray().map(r => decodePdfTextObject(back.context.lookup(r).get(PDFName.of('Contents'))));
  assert.deepEqual(texts, [NOTE, 'OK', '2) second']);
  // pdf.js (what most viewers do) sees all three too.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const an = await (await doc.getPage(1)).getAnnotations();
  assert.deepEqual(an.map(a => a.contentsObj.str), [NOTE, 'OK', '2) second']);
});
