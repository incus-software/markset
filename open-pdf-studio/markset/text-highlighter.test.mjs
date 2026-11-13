// Markset: the Text Highlighter (markset/text-highlighter.js).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { PDFDocument, PDFName, PDFString, PDFHexString } from 'pdf-lib';

register('../js/core/app-test-hooks.mjs', import.meta.url);
const { installeerBrowserStubs } = await import('../js/core/app-test-hooks.mjs');
installeerBrowserStubs();

const { buildTextModel, hitTest } = await import('../js/annotations/corrections/text-model.js');
const {
  highlightProps, highlightStyle, wordAt, cleanText, noteText, hasText, ocrTextItems,
  TEXT_HIGHLIGHTER_TOOL, DEFAULT_HIGHLIGHT_COLOR, registerTextHighlighter,
} = await import('./text-highlighter.js');
const { getTool } = await import('../js/tools/tool-registry.js');
const { makePointMapper } = await import('../js/pdf/saver/correction-dicts.js');
const { buildTextMarkupDict } = await import('../js/pdf/saver/text-markup-dict.js');

const V0 = [1, 0, 0, -1, 0, 792];
const item = (str, x, y, extra = {}) => ({
  str, dir: 'ltr', width: str.length * 5, height: 10, transform: [10, 0, 0, 10, x, y], hasEOL: false, ...extra,
});
// 'The contractor shall' (0..20) | 'submit all shop drawings' (21..)
const model = buildTextModel([
  item('The contractor shall', 72, 700, { hasEOL: true }),
  item('submit all shop drawings', 72, 686),
], { transform: V0 });

test('a drag over two lines is one highlight with a rectangle per line and the words', () => {
  const p = highlightProps(model, 4, 27, { page: 2, color: '#00FF00', opacity: 0.5 });
  assert.equal(p.type, 'textHighlight');
  assert.equal(p.page, 2);
  assert.equal(p.rects.length, 2);
  assert.equal(p.markedText, 'contractor shall submit');
  assert.deepEqual([p.color, p.opacity], ['#00FF00', 0.5]);
  assert.ok(p.width > 0 && p.height > 0);
});

test('dragging backwards gives the same highlight', () => {
  assert.deepEqual(highlightProps(model, 27, 4, { page: 1 }), highlightProps(model, 4, 27, { page: 1 }));
});

test('nothing is made from a click, an empty page or only spaces', () => {
  assert.equal(highlightProps(model, 5, 5, { page: 1 }), null);
  assert.equal(highlightProps(null, 0, 3, { page: 1 }), null);
  assert.equal(highlightProps(model, 3, 4, { page: 1 }), null, 'a single space');
  const leeg = buildTextModel([], { transform: V0 });
  assert.equal(hasText(leeg), false);
  assert.equal(hasText(model), true);
});

test('a double-click takes the whole word', () => {
  const w = wordAt(model, 7); // inside "contractor"
  assert.equal(highlightProps(model, w.start, w.end, { page: 1 }).markedText, 'contractor');
});

test('with snapWords a drag that starts or ends inside a word takes the whole word', () => {
  // 7 is inside "contractor", 25 inside "submit"
  assert.equal(highlightProps(model, 7, 25, { page: 1 }).markedText, 'tractor shall subm');
  assert.equal(highlightProps(model, 7, 25, { page: 1, snapWords: true }).markedText, 'contractor shall submit');
  // ends on spaces are dropped, edges already on a word boundary stay
  assert.equal(highlightProps(model, 3, 15, { page: 1, snapWords: true }).markedText, 'contractor');
  assert.equal(highlightProps(model, 3, 4, { page: 1, snapWords: true }), null, 'only a space');
});

test('OCR words from a scan make a text model: lines, spaces and boxes', () => {
  // Tesseract boxes in points, top-left origin; "shop" is taller (descender).
  const words = [
    { text: 'submit', left: 72, top: 100, width: 40, height: 10 },
    { text: 'all', left: 115, top: 100, width: 15, height: 10 },
    { text: 'shop', left: 133, top: 100, width: 28, height: 12.5 },
    { text: 'drawings', left: 72, top: 116, width: 50, height: 12.5 },
    { text: ' ', left: 130, top: 116, width: 3, height: 10 },
    { text: 'late', left: 0, top: 0, width: 0, height: 10 },
  ];
  const items = ocrTextItems(words);
  assert.equal(items.length, 4, 'blank and zero-width words are dropped');
  const ocr = buildTextModel(items);
  assert.equal(ocr.lines.length, 2);
  const all = highlightProps(ocr, 0, 10_000, { page: 1 });
  assert.equal(all.markedText, 'submit all shop drawings');
  assert.equal(all.rects.length, 2);
  const [r1] = all.rects;
  assert.ok(Math.abs(r1.x - 72) < 0.01 && Math.abs(r1.y - 100) < 0.01, 'rect starts at the first word box');
  assert.ok(Math.abs(r1.x + r1.width - 161) < 0.01, 'and ends at the last word of the line');
  // A click inside "all" finds it.
  const w = wordAt(ocr, hitTest(ocr, 120, 105));
  assert.equal(highlightProps(ocr, w.start, w.end, { page: 1 }).markedText, 'all');
});

test('color and opacity follow the Highlight preferences', () => {
  assert.deepEqual(highlightStyle({ highlightColor: '#FF00FF', highlightOpacity: 30 }), { color: '#FF00FF', opacity: 0.3 });
  assert.equal(highlightStyle({}).color, DEFAULT_HIGHLIGHT_COLOR);
  assert.equal(highlightStyle({ highlightColor: 'red', highlightOpacity: 0 }).color, DEFAULT_HIGHLIGHT_COLOR);
  assert.ok(highlightStyle({ highlightOpacity: 0 }).opacity > 0);
});

test('note and quoted text are cleaned up', () => {
  assert.equal(cleanText('  shop\n drawings  '), 'shop drawings');
  assert.equal(noteText('  check spec 08 71 00\r\nsee RFI 12 '), 'check spec 08 71 00\nsee RFI 12');
  assert.equal(noteText('   '), '');
});

test('the tool registers once, with a text cursor', () => {
  registerTextHighlighter();
  registerTextHighlighter();
  const tool = getTool(TEXT_HIGHLIGHTER_TOOL);
  assert.ok(tool);
  assert.equal(tool.cursor, 'text');
});

test('the saved highlight keeps its note in /Contents and its words in /OPS_MarkedText', async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const ann = { ...highlightProps(model, 4, 27, { page: 1 }), subject: 'Check against spec 08 71 00', author: 'JS' };
  const dict = buildTextMarkupDict(pdf.context, ann, makePointMapper(0, { x: 0, y: 0, width: 612, height: 792 }), { opacity: 0.4 });
  const tekst = (k) => {
    const v = dict.get(PDFName.of(k));
    return v instanceof PDFString || v instanceof PDFHexString ? v.decodeText() : undefined;
  };
  assert.equal(dict.get(PDFName.of('Subtype')).toString(), '/Highlight');
  assert.equal(tekst('Contents'), 'Check against spec 08 71 00');
  assert.equal(tekst('OPS_MarkedText'), 'contractor shall submit');
});

test('the Annotation tab has the Highlight Text button next to Highlight', () => {
  const src = readFileSync(new URL('../js/solid/components/ribbon/CommentTab.jsx', import.meta.url), 'utf8');
  const hl = src.indexOf('id="tool-highlight"');
  const ht = src.indexOf('id="tool-highlight-text"');
  assert.ok(hl > 0 && ht > hl, 'Highlight Text follows Highlight');
  assert.match(src, /setTool\(TEXT_HIGHLIGHTER_TOOL\)/);
});
