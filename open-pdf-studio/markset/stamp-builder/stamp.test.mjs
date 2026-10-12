import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName } from 'pdf-lib';
import { getTemplate } from '../../js/symbols/registry.js';
import { helveticaWidth, svgToPdfAppearance } from '../svg-to-pdf.js';
import { cmdsToSvg } from '../smart/cmds-svg.js';
import {
  registerMarksetTemplates, smartPlacementBox, smartColors, embedSmartImages, writeVectorParametricAppearance,
} from '../smart/index.js';
import {
  STAMP_TEMPLATE_ID, DEFAULT_DISCLAIMER, REVIEW_TERMS, defaultStampDesign, stampLayout, stampCommands,
  stampSizeIn, stampWarnings, actionList, wrapText, fitStampToDesign,
} from './layout.js';
import { withPngDpi, pngDpi } from './png.js';

registerMarksetTemplates();
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const LOGO = `data:image/png;base64,${PNG_1PX}`;

test('the stamp template is registered and English', () => {
  const t = getTemplate(STAMP_TEMPLATE_ID);
  assert.ok(t, 'registered');
  assert.equal(t.markset.stamp, true);
  assert.equal(t.markset.group, 'stamps'); // not listed in the Starter Library
  assert.ok(!/approved/i.test(defaultStampDesign().title));
  assert.ok(!/DCI/i.test(DEFAULT_DISCLAIMER));
  assert.deepEqual(actionList(defaultStampDesign()).slice(0, 4), REVIEW_TERMS);
});

test('true size: width from widthIn, limitation text at discPt and inside the border', () => {
  const four = stampLayout({});
  assert.equal(four.width, 288);
  const s = stampSizeIn({});
  assert.equal(s.width, 4);
  assert.ok(s.height > 2 && s.height < 5, `height ${s.height}`);
  const disc = four.cmds.filter(c => c.kind === 'text' && four.discLines.includes(c.text));
  assert.equal(disc.length, four.discLines.length);
  for (const c of disc) {
    assert.equal(c.size, 8);
    assert.ok(c.x + helveticaWidth(c.text, c.size) <= four.width - 10 + 1e-6, c.text);
  }
  // Bigger text → more lines → a taller stamp; a narrower stamp keeps the pt size.
  assert.ok(stampLayout({ discPt: 9 }).height > four.height);
  const three = stampLayout({ widthIn: 3 });
  assert.equal(three.width, 216);
  assert.ok(three.discLines.length > four.discLines.length);
  assert.equal(three.cmds.find(c => c.text === three.discLines[0]).size, 8);
});

test('checkboxes: one box per action, a check mark only on the checked one', () => {
  const boxes = (p) => stampLayout(p).cmds.filter(c => c.kind === 'polyline' && c.close).length - 2; // minus the double border
  assert.equal(boxes({}), 5);
  assert.equal(boxes({ actions: 'A\n\nB\n' }), 2);
  assert.equal(stampLayout({}).cmds.filter(c => c.role === 'check').length, 0);
  assert.equal(stampLayout({ checked: 2 }).cmds.filter(c => c.role === 'check').length, 1);
  assert.equal(stampLayout({ checked: 99 }).cmds.filter(c => c.role === 'check').length, 0);
});

test('fill-in values and lines follow the options', () => {
  const texts = (p) => stampLayout(p).cmds.filter(c => c.kind === 'text').map(c => c.text);
  assert.ok(texts({ by: 'JS', date: '10/12/2026' }).includes('JS'));
  assert.ok(texts({ by: 'JS', date: '10/12/2026' }).includes('10/12/2026'));
  const none = texts({ showProject: false, showSubmittal: false, showBy: false, showDate: false });
  for (const l of ['PROJECT NO.:', 'SUBMITTAL NO.:', 'BY:', 'DATE:']) assert.ok(!none.includes(l), l);
  assert.ok(stampLayout({ showBy: false, showDate: false }).height < stampLayout({}).height);
});

test('logo: an image command left of the firm name, capped in width', () => {
  const plain = stampLayout({});
  const withLogo = stampLayout({ logo: LOGO, logoAspect: 1 });
  const img = withLogo.cmds.find(c => c.kind === 'image');
  assert.ok(img);
  assert.equal(img.src, LOGO);
  const firmX = (l) => l.cmds.find(c => c.text === 'YOUR FIRM NAME').x;
  assert.ok(firmX(withLogo) > firmX(plain));
  const wide = stampLayout({ logo: LOGO, logoAspect: 10 }).cmds.find(c => c.kind === 'image');
  assert.ok(wide.width <= 288 * 0.35 + 1e-9);
});

test('wrapText keeps words whole and honours line breaks', () => {
  assert.deepEqual(wrapText('one two three', 10, helveticaWidth('one two', 10)), ['one two', 'three']);
  assert.deepEqual(wrapText('a\nb', 10, 1000), ['a', 'b']);
});

test('stampCommands scales uniformly into any box', () => {
  const { width, height } = stampLayout({});
  const cmds = stampCommands({}, { x: 100, y: 50, width: width * 2, height: height * 2 });
  const t = cmds.find(c => c.text === 'YOUR FIRM NAME');
  assert.equal(t.size, 12 * 2);
  assert.ok(t.x > 100 && t.y > 50);
});

test('placement: true size centred on the click, on any sheet; ink color', () => {
  const t = getTemplate(STAMP_TEMPLATE_ID);
  const { width, height } = stampLayout({ widthIn: 4.5 });
  for (const [w, h] of [[612, 792], [36 * 72, 24 * 72]]) {
    const b = smartPlacementBox(t, 500, 400, w, h, 1, { widthIn: 4.5 });
    assert.deepEqual(b, { x: 500 - width / 2, y: 400 - height / 2, width, height });
  }
  assert.deepEqual(smartColors(t, '#ff0000', { ink: '#0066ff' }), { color: '#0066ff', strokeColor: '#0066ff' });
  assert.deepEqual(smartColors(t, '#ff0000', {}), {});
});

test('fitStampToDesign keeps the width and centre, sets the height', () => {
  const { width, height } = stampLayout({});
  const ann = { type: 'parametricSymbol', symbolId: STAMP_TEMPLATE_ID, x: 0, y: 0, width: width * 2, height: height * 2, params: {} };
  ann.params = { showBy: false, showDate: false };
  const cy = ann.y + ann.height / 2;
  fitStampToDesign(ann);
  const l = stampLayout(ann.params);
  assert.equal(ann.width, width * 2);
  assert.ok(Math.abs(ann.height - l.height * 2) < 1e-9);
  assert.ok(Math.abs(ann.y + ann.height / 2 - cy) < 1e-9);
  const other = { type: 'parametricSymbol', symbolId: 'us-room-tag', x: 0, y: 0, width: 10, height: 10 };
  fitStampToDesign(other);
  assert.equal(other.height, 10);
});

test('warnings: "Approved" title, small text, no actions', () => {
  assert.equal(stampWarnings(defaultStampDesign()).length, 0);
  assert.ok(stampWarnings({ ...defaultStampDesign(), title: 'APPROVED' })[0].includes('Approved'));
  assert.ok(stampWarnings({ ...defaultStampDesign(), discPt: 6 }).some(w => w.includes('7 pt')));
  assert.ok(stampWarnings({ ...defaultStampDesign(), actions: ' \n' }).some(w => w.includes('checkbox')));
});

test('left-aligned text in the SVG, and the converter draws it', () => {
  const l = stampLayout({ checked: 0 });
  const svg = cmdsToSvg(l.cmds, { x: 0, y: 0, width: l.width, height: l.height });
  assert.ok(svg.includes('text-anchor="start"'));
  assert.ok(svgToPdfAppearance(svg, l.width, l.height));
  const withLogo = stampLayout({ logo: LOGO });
  assert.ok(cmdsToSvg(withLogo.cmds, { x: 0, y: 0, width: 288, height: withLogo.height }).includes('<image href="data:image/png'));
});

test('PDF appearance: vectors plus the embedded logo', async () => {
  const pdf = await PDFDocument.create();
  const params = { ...defaultStampDesign(), logo: LOGO, checked: 1, by: 'JS' };
  const { width, height } = stampLayout(params);
  const ann = { symbolId: STAMP_TEMPLATE_ID, params, width, height, strokeColor: '#0066ff' };
  const images = await embedSmartImages(ann, pdf);
  assert.equal(images.length, 1);
  const annotDict = pdf.context.obj({});
  assert.equal(writeVectorParametricAppearance({ ann, annotDict, context: pdf.context, pdf: { PDFName }, rectW: width, rectH: height, images }), true);
  const ap = pdf.context.lookup(annotDict.get(PDFName.of('AP')).get(PDFName.of('N')));
  const ops = Buffer.from(ap.getContents()).toString('latin1');
  assert.ok(ops.includes('/Im0 Do'));
  assert.ok(ops.includes('(JS) Tj'));
  assert.ok(ops.includes('0 0.4 1 RG') || ops.includes('0 0.4 1 rg'), 'stamp ink');
  const res = ap.dict.get(PDFName.of('Resources'));
  assert.ok(res.get(PDFName.of('XObject')).get(PDFName.of('Im0')));
  // Not an image: skipped, the rest still draws.
  assert.deepEqual(await embedSmartImages({ ...ann, params: { ...params, logo: 'data:image/png;base64,AAAA' } }, pdf), []);
});

test('PNG export carries 300 dpi', () => {
  const bytes = Uint8Array.from(Buffer.from(PNG_1PX, 'base64'));
  assert.equal(pngDpi(bytes), null);
  const out = withPngDpi(bytes, 300);
  assert.equal(out.length, bytes.length + 21);
  assert.equal(pngDpi(out), 300);
  assert.deepEqual(withPngDpi(new Uint8Array([1, 2, 3]), 300), new Uint8Array([1, 2, 3]));
});
