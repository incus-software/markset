import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName } from 'pdf-lib';
import { getTemplate } from '../../js/symbols/registry.js';
import { MARKSET_TEMPLATES } from './templates.js';
import { cmdsToSvg } from './cmds-svg.js';
import {
  registerMarksetTemplates, renderTemplate, templatePreviewSvg, smartPaletteEntries,
  smartPlacementBox, smartColors, writeVectorParametricAppearance,
} from './index.js';
import { svgToPdfAppearance } from '../svg-to-pdf.js';

registerMarksetTemplates();
const ARCH_D = [36 * 72, 24 * 72];

test('13 US templates are registered with English labels and defaults', () => {
  assert.equal(MARKSET_TEMPLATES.length, 13);
  const ids = new Set();
  for (const t of MARKSET_TEMPLATES) {
    assert.equal(getTemplate(t.id), t, t.id);
    assert.ok(!ids.has(t.id)); ids.add(t.id);
    assert.match(t.id, /^us-/);
    assert.equal(t.category, 'US');
    assert.ok(t.markset.paperHeightIn > 0 && ['drawing', 'review'].includes(t.markset.role), t.id);
    for (const p of t.params) {
      assert.ok(p.labelEn && p.label && p.default !== undefined, `${t.id}.${p.key}`);
      if (p.type === 'enum') assert.ok(p.options.some(o => o.value === p.default), `${t.id}.${p.key}`);
    }
  }
});

test('every template renders, converts to SVG and to a vector appearance', () => {
  for (const t of MARKSET_TEMPLATES) {
    const box = { x: 10, y: 20, width: 36 * (t.defaultSize.width / t.defaultSize.height), height: 36 };
    const cmds = renderTemplate(t, {}, box);
    assert.ok(cmds.length > 0, t.id);
    const svg = cmdsToSvg(cmds, box);
    assert.ok(svg, `${t.id}: svg`);
    assert.ok(svgToPdfAppearance(svg, box.width, box.height), `${t.id}: vector`);
  }
});

test('typed values reach the drawing', () => {
  const t = getTemplate('us-detail-callout');
  const box = { x: 0, y: 0, width: 64, height: 64 };
  const svg = cmdsToSvg(renderTemplate(t, { number: '7', sheet: 'A-999' }, box), box);
  assert.match(svg, />7<\/text>/);
  assert.match(svg, />A-999<\/text>/);
  const room = cmdsToSvg(renderTemplate(getTemplate('us-room-tag'), { name: 'LOBBY & STAIR' }, { x: 0, y: 0, width: 128, height: 64 }), { x: 0, y: 0, width: 128, height: 64 });
  assert.match(room, />LOBBY &amp; STAIR</);
});

test('section and elevation pointers follow the direction', () => {
  const t = getTemplate('us-exterior-elevation');
  const box = { x: 0, y: 0, width: 64, height: 64 };
  const tip = (dir) => renderTemplate(t, { direction: dir }, box).find(c => c.kind === 'polyline').points[0];
  assert.deepEqual(tip('up'), { x: 32, y: 2 });
  assert.deepEqual(tip('right'), { x: 62, y: 32 });
  const s = getTemplate('us-section-marker');
  const cut = (on) => renderTemplate(s, { cutLine: on }, { x: 0, y: 0, width: 128, height: 64 }).filter(c => c.kind === 'line' && c.dash).length;
  assert.equal(cut(true), 1);
  assert.equal(cut(false), 0);
  const ie = getTemplate('us-interior-elevation');
  const arrows = (p) => renderTemplate(ie, p, box).filter(c => c.kind === 'polyline').length;
  assert.equal(arrows({}), 4);
  assert.equal(arrows({ show_left: false, show_down: false }), 2);
});

test('editable labels lie inside the symbol', () => {
  for (const t of MARKSET_TEMPLATES) {
    if (!t.editableLabels) continue;
    const box = { x: 100, y: 200, width: 64 * (t.defaultSize.width / t.defaultSize.height), height: 64 };
    for (const l of t.editableLabels(t.params, box)) {
      assert.ok(l.rect.x >= box.x - 0.01 && l.rect.y >= box.y - 0.01, `${t.id}/${l.id}`);
      assert.ok(l.rect.x + l.rect.width <= box.x + box.width + 0.01 && l.rect.y + l.rect.height <= box.y + box.height + 0.01, `${t.id}/${l.id}`);
      for (const f of l.fields) assert.ok(t.params.some(p => p.key === f), `${t.id}/${l.id}: ${f}`);
    }
  }
});

test('placement: printed height on the sheet, centred on the click', () => {
  const callout = smartPlacementBox(getTemplate('us-detail-callout'), 500, 300, ...ARCH_D);
  assert.deepEqual(callout, { x: 482, y: 282, width: 36, height: 36 }); // 1/2" on 24x36
  const room = smartPlacementBox(getTemplate('us-room-tag'), 0, 0, ...ARCH_D);
  assert.deepEqual([room.width, room.height], [72, 36]);
  assert.equal(smartPlacementBox(getTemplate('peilmaat'), 0, 0, ...ARCH_D), null); // upstream keeps its size
});

test('colors: only the punch marker takes the review color', () => {
  assert.deepEqual(smartColors(getTemplate('us-punch-marker'), '#0000ff'), { color: '#0000ff', strokeColor: '#0000ff' });
  assert.deepEqual(smartColors(getTemplate('us-grid-bubble'), '#0000ff'), {});
  assert.deepEqual(smartColors(getTemplate('peilmaat'), '#0000ff'), {});
});

test('palette entries carry the template id and a vector preview', () => {
  const entries = smartPaletteEntries();
  assert.equal(entries.length, 13);
  for (const e of entries) {
    assert.ok(getTemplate(e.parametricId), e.id);
    assert.ok(svgToPdfAppearance(e.svg, 64, 64), e.id);
  }
  assert.match(templatePreviewSvg(getTemplate('us-punch-marker'), '#dd0000'), /#dd0000/);
});

test('vector appearance: rotated into the envelope; PNG kept for others', async () => {
  const doc = await PDFDocument.create();
  const ctx = doc.context;
  const ann = { symbolId: 'us-room-tag', params: { name: 'OFFICE', number: '101' }, width: 72, height: 36, rotation: 90, strokeColor: '#000000' };
  const dict = ctx.obj({});
  assert.equal(writeVectorParametricAppearance({ ann, annotDict: dict, context: ctx, pdf: { PDFName }, rectW: 36, rectH: 72 }), true);
  const ap = ctx.lookup(ctx.lookup(dict.get(PDFName.of('AP'))).get(PDFName.of('N')));
  const content = Buffer.from(ap.getContents()).toString('latin1');
  assert.match(content, /1 0 0 1 18 36 cm\n0 -1 1 0 0 0 cm\n1 0 0 1 -36 -18 cm/);
  assert.match(content, /\(OFFICE\) Tj/);
  // Upstream templates and rotated pages keep the raster appearance.
  assert.equal(writeVectorParametricAppearance({ ann: { ...ann, symbolId: 'peilmaat' }, annotDict: ctx.obj({}), context: ctx, pdf: { PDFName }, rectW: 36, rectH: 72 }), false);
  assert.equal(writeVectorParametricAppearance({ ann, annotDict: ctx.obj({}), context: ctx, pdf: { PDFName }, rectW: 36, rectH: 72, pageRot: 90 }), false);
});
