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
const T = (id) => getTemplate(id);
const box = (t, h = 64, x = 0, y = 0) => ({ x, y, width: h * (t.defaultSize.width / t.defaultSize.height), height: h });

test('19 US templates are registered with English labels and defaults', () => {
  assert.deepEqual(MARKSET_TEMPLATES.map(t => t.id), [
    'us-building-section', 'us-wall-section', 'us-detail-section', 'us-enlarged-detail',
    'us-exterior-elevation', 'us-interior-elevation', 'us-elevation-target', 'us-spot-elevation',
    'us-grid-bubble', 'us-drawing-title', 'us-revision-delta',
    'us-room-tag', 'us-ceiling-height', 'us-door-tag', 'us-window-tag', 'us-partition-type',
    'us-keynote-tag', 'us-equipment-tag', 'us-punch-marker',
  ]);
  for (const t of MARKSET_TEMPLATES) {
    assert.equal(T(t.id), t, t.id);
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
    const b = box(t, 36, 10, 20);
    const cmds = renderTemplate(t, {}, b);
    assert.ok(cmds.length > 0, t.id);
    const svg = cmdsToSvg(cmds, b);
    assert.ok(svg, `${t.id}: svg`);
    assert.ok(svgToPdfAppearance(svg, b.width, b.height), `${t.id}: vector`);
  }
});

test('drawing symbols use regular-weight text; the punch marker is bold', () => {
  for (const t of MARKSET_TEMPLATES) {
    const bold = renderTemplate(t, {}, box(t)).filter(c => c.kind === 'text' && c.bold).length;
    assert.equal(bold > 0, t.id === 'us-punch-marker', t.id);
  }
});

test('typed values reach the drawing (escaped)', () => {
  const t = T('us-enlarged-detail');
  const svg = cmdsToSvg(renderTemplate(t, { number: '7', sheet: 'A-999' }, box(t)), box(t));
  assert.match(svg, />7<\/text>/);
  assert.match(svg, />A-999<\/text>/);
  const room = T('us-room-tag');
  assert.match(cmdsToSvg(renderTemplate(room, { name: 'LOBBY & STAIR' }, box(room)), box(room)), />LOBBY &amp; STAIR</);
  const lvl = T('us-elevation-target');
  assert.match(cmdsToSvg(renderTemplate(lvl, {}, box(lvl)), box(lvl)), />EL\. 100'-0"</);
});

test('section and elevation hoods point where the symbol looks', () => {
  const ext = T('us-exterior-elevation');
  const apex = (dir) => renderTemplate(ext, { direction: dir }, box(ext)).find(c => c.kind === 'polyline' && c.fill).points[0];
  const up = apex('up'), right = apex('right');
  assert.ok(Math.abs(up.x - 32) < 1e-6 && up.y < 32 - 17, 'up: apex above the bubble');
  assert.ok(Math.abs(right.y - 32) < 1e-6 && right.x > 32 + 17, 'right: apex right of the bubble');
  // Building section: bubble and cut line swap ends with `side`.
  const bs = T('us-building-section');
  const circleX = (side) => renderTemplate(bs, { side }, box(bs)).find(c => c.kind === 'circle').cx;
  assert.equal(circleX('left'), 24);
  assert.equal(circleX('right'), 104);
});

test('interior elevation: four editable elevation numbers around a detail/sheet box', () => {
  const ie = T('us-interior-elevation');
  const texts = renderTemplate(ie, { n1: 'A', n2: 'B', n3: 'C', n4: 'D' }, box(ie)).filter(c => c.kind === 'text').map(c => c.text);
  assert.deepEqual(texts, ['5', 'A-401', 'A', 'B', 'C', 'D']);
});

test('grid bubble line can be switched off', () => {
  const gb = T('us-grid-bubble');
  const dashed = (on) => renderTemplate(gb, { gridLine: on }, box(gb)).filter(c => c.dash).length;
  assert.equal(dashed(true), 1);
  assert.equal(dashed(false), 0);
});

test('editable labels lie inside the symbol and name real fields', () => {
  for (const t of MARKSET_TEMPLATES) {
    if (!t.editableLabels) continue;
    const b = box(t, 64, 100, 200);
    for (const side of ['left', 'right']) {
      for (const l of t.editableLabels({ side }, b)) {
        assert.ok(l.rect.x >= b.x - 0.01 && l.rect.y >= b.y - 0.01, `${t.id}/${l.id}`);
        assert.ok(l.rect.x + l.rect.width <= b.x + b.width + 0.01 && l.rect.y + l.rect.height <= b.y + b.height + 0.01, `${t.id}/${l.id}`);
        for (const f of l.fields) assert.ok(t.params.some(p => p.key === f), `${t.id}/${l.id}: ${f}`);
      }
    }
  }
});

test('placement: printed height on the sheet, centred on the click', () => {
  assert.deepEqual(smartPlacementBox(T('us-exterior-elevation'), 500, 300, ...ARCH_D), { x: 477.5, y: 277.5, width: 45, height: 45 }); // 5/8"
  const title = smartPlacementBox(T('us-drawing-title'), 0, 0, ...ARCH_D);
  assert.deepEqual([title.width, title.height], [144, 36]);
  assert.equal(smartPlacementBox(T('peilmaat'), 0, 0, ...ARCH_D), null); // upstream keeps its size
});

test('colors: only the punch marker takes the review color', () => {
  assert.deepEqual(smartColors(T('us-punch-marker'), '#0000ff'), { color: '#0000ff', strokeColor: '#0000ff' });
  assert.deepEqual(smartColors(T('us-grid-bubble'), '#0000ff'), {});
  assert.deepEqual(smartColors(T('peilmaat'), '#0000ff'), {});
});

test('palette entries carry the template id and a vector preview', () => {
  const entries = smartPaletteEntries();
  assert.equal(entries.length, 19);
  for (const e of entries) {
    assert.ok(T(e.parametricId), e.id);
    const vb = e.svg.match(/viewBox="0 0 ([\d.]+) 64"/);
    assert.ok(vb && svgToPdfAppearance(e.svg, Number(vb[1]), 64), e.id);
  }
  assert.match(templatePreviewSvg(T('us-punch-marker'), '#dd0000'), /#dd0000/);
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
  assert.equal(writeVectorParametricAppearance({ ann: { ...ann, symbolId: 'peilmaat' }, annotDict: ctx.obj({}), context: ctx, pdf: { PDFName }, rectW: 36, rectH: 72 }), false);
  assert.equal(writeVectorParametricAppearance({ ann, annotDict: ctx.obj({}), context: ctx, pdf: { PDFName }, rectW: 36, rectH: 72, pageRot: 90 }), false);
});
