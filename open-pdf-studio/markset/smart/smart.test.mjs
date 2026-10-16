import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName } from 'pdf-lib';
import { getTemplate } from '../../js/symbols/registry.js';
import { MARKSET_TEMPLATES } from './templates.js';
import { cmdsToSvg } from './cmds-svg.js';
import {
  registerMarksetTemplates, renderTemplate, templatePreviewSvg, smartPaletteEntries,
  smartPlacementBox, smartColors, writeVectorParametricAppearance, smartTwoPointSize,
} from './index.js';
import { runGeometry } from './wiring.js';
import { svgToPdfAppearance } from '../svg-to-pdf.js';

registerMarksetTemplates();
const ARCH_D = [36 * 72, 24 * 72];
const T = (id) => getTemplate(id);
const box = (t, h = 64, x = 0, y = 0) => ({ x, y, width: h * (t.defaultSize.width / t.defaultSize.height), height: h });

test('27 US templates are registered with English labels and defaults', () => {
  assert.deepEqual(MARKSET_TEMPLATES.map(t => t.id), [
    'us-building-section', 'us-wall-section', 'us-detail-section', 'us-enlarged-detail',
    'us-exterior-elevation', 'us-interior-elevation', 'us-elevation-target', 'us-spot-elevation',
    'us-grid-bubble', 'us-drawing-title', 'us-revision-delta',
    'us-room-tag', 'us-ceiling-height', 'us-door-tag', 'us-window-tag', 'us-partition-type',
    'us-keynote-tag', 'us-equipment-tag', 'us-punch-marker', 'us-plan-door', 'us-plan-window',
    'us-wire-circuit', 'us-wire-2', 'us-wire-3', 'us-wire-4', 'us-wire-switch-leg', 'us-wire-home-run',
  ]);
  for (const t of MARKSET_TEMPLATES) {
    assert.equal(T(t.id), t, t.id);
    assert.equal(t.category, 'US');
    assert.ok((t.markset.paperHeightIn > 0 || t.markset.realSize || t.markset.bandHeightIn > 0) && ['drawing', 'review'].includes(t.markset.role), t.id);
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

test('interior elevation: black corner pointers with numbers around a sheet circle', () => {
  const ie = T('us-interior-elevation');
  const cmds = renderTemplate(ie, { n1: 'A', n2: 'B', n3: 'C', n4: 'D' }, box(ie));
  assert.deepEqual(cmds.filter(c => c.kind === 'text').map(c => c.text), ['A', 'B', 'C', 'D', 'A-441']);
  assert.equal(cmds.filter(c => c.kind === 'polyline' && c.fill).length, 4);
  const two = renderTemplate(ie, { show_left: false, show_down: false }, box(ie));
  assert.equal(two.filter(c => c.kind === 'polyline' && c.fill).length, 2);
  assert.deepEqual(two.filter(c => c.kind === 'text').map(c => c.text), ['1', '2', 'A-441']);
});

test('sections: winged hood, rectangular foot on the hood side, optional SIM', () => {
  const ws = T('us-wall-section');
  const feet = (p) => renderTemplate(ws, p, box(ws)).filter(c => c.kind === 'polyline' && c.fill && c.points.length === 4);
  const [up] = feet({}), [down] = feet({ direction: 'down' });
  assert.ok(up.points.some(pt => pt.y < 32) && down.points.some(pt => pt.y > 32), 'foot stands on the hood side');
  assert.ok(Math.min(...up.points.map(pt => pt.x)) > 100, 'foot at the far end');
  // The winged hood reaches past the bubble along the center line.
  const hoodPts = renderTemplate(ws, {}, box(ws)).find(c => c.kind === 'polyline' && c.fill && c.points.length > 4).points;
  assert.ok(Math.max(...hoodPts.map(pt => pt.x)) > 24 + 16, 'wings wider than the bubble');
  const ds = T('us-detail-section');
  assert.equal(renderTemplate(ds, {}, box(ds)).filter(c => c.kind === 'polyline' && c.fill).length, 1, 'detail section: foot, no hood');
  const sim = (on) => renderTemplate(T('us-building-section'), { sim: on }, box(T('us-building-section'))).some(c => c.text === 'SIM');
  assert.equal(sim(true), true);
  assert.equal(sim(false), false);
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
  assert.equal(entries.length, 21);
  assert.equal(smartPaletteEntries(undefined, 'electrical').length, 6);
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
  // A page shown rotated 90: the saver hands the box over swapped (36 x 72) and
  // the drawing is turned back by the page's quarter turn, which here cancels
  // the symbol's own quarter turn, so it reads upright on screen as in Markset.
  const onRotated = ctx.obj({});
  assert.equal(writeVectorParametricAppearance({ ann: { ...ann, width: 36, height: 72 }, annotDict: onRotated, context: ctx, pdf: { PDFName }, rectW: 36, rectH: 72, pageRot: 90 }), true);
  const turned = Buffer.from(ctx.lookup(ctx.lookup(onRotated.get(PDFName.of('AP'))).get(PDFName.of('N'))).getContents()).toString('latin1');
  assert.match(turned, /1 0 0 1 18 36 cm\n1 -?0 -?0 1 0 0 cm\n1 0 0 1 -36 -18 cm/);
});

test('plan door: real size from feet and inches, swing and hand', () => {
  const d = T('us-plan-door');
  assert.deepEqual(d.realSizeMm({ width: "3'-0\"", wall: "0'-4 7/8\"" }), { width: 914.4, height: 914.4 + 123.825 });
  assert.equal(d.realSizeMm({ width: "6'-0\"", wall: "0'-6\"", leaves: 'double' }).height, 914.4 + 152.4);
  assert.deepEqual(d.realSizeMm({ width: 'nonsense', wall: '' }), { width: 914.4, height: 914.4 + 123.825 });
  // 1/4" = 1'-0": 3'-0" is 3/4" (54 pt) on paper.
  const b = { x: 0, y: 0, width: 54, height: 54 * (1038.225 / 914.4) };
  const single = renderTemplate(d, {}, b);
  assert.equal(single.filter(c => c.kind === 'arc').length, 1);
  const leaf = single.find(c => c.kind === 'line' && c.lineWidth === 1.4);
  assert.equal(leaf.x1, 0, 'hinge on the left');
  assert.ok(leaf.y2 < leaf.y1, 'swings in (up, away from the wall at the bottom)');
  const right = renderTemplate(d, { hinge: 'right', swing: 'out' }, b).find(c => c.kind === 'line' && c.lineWidth === 1.4);
  assert.equal(right.x1, 54);
  assert.ok(right.y2 > right.y1, 'swings out');
  assert.equal(renderTemplate(d, { leaves: 'double' }, b).filter(c => c.kind === 'arc').length, 2);
  for (const p of [{}, { hinge: 'right' }, { swing: 'out' }, { leaves: 'double' }]) {
    assert.ok(svgToPdfAppearance(cmdsToSvg(renderTemplate(d, p, b), b), b.width, b.height), JSON.stringify(p));
  }
});

test('plan window: jambs, wall faces and double glass line', () => {
  const w = T('us-plan-window');
  assert.deepEqual(w.realSizeMm({ width: "4'-0\"", wall: "0'-8\"" }), { width: 1219.2, height: 203.2 });
  const cmds = renderTemplate(w, {}, { x: 0, y: 0, width: 54, height: 9 });
  assert.equal(cmds.length, 6);
  assert.equal(cmds.filter(c => c.lineWidth === 0.5).length, 2);
});

test('real-size templates keep upstream placement (scale), not sheet size', () => {
  assert.equal(smartPlacementBox(T('us-plan-door'), 0, 0, ...ARCH_D), null);
});

test('wiring runs: two-point, curve through the middle, hashes, dash, home-run arrow', () => {
  const b = { x: 0, y: 0, width: 108, height: 27 };
  const g = runGeometry({}, b);
  assert.ok(Math.abs(Math.hypot(g.S.x - g.C.x, g.S.y - g.C.y) - g.R) < 1e-9 && Math.abs(Math.hypot(g.E.x - g.C.x, g.E.y - g.C.y) - g.R) < 1e-9, 'arc passes through both ends');
  assert.ok(g.mid.y < 13.5, 'bends left (up) by default');
  assert.ok(runGeometry({ bend: 'right' }, b).mid.y > 13.5, 'bends right');
  assert.equal(runGeometry({ shape: 'straight' }, b).straight, true);
  const kinds = (id, p = {}) => renderTemplate(T(id), p, b).map(c => c.kind);
  assert.deepEqual(kinds('us-wire-circuit'), ['arc']);
  assert.equal(kinds('us-wire-3').filter(k => k === 'line').length, 3);
  assert.ok(renderTemplate(T('us-wire-switch-leg'), {}, b)[0].dash, 'switch leg is dashed');
  const hr = renderTemplate(T('us-wire-home-run'), {}, b);
  assert.equal(hr.filter(c => c.kind === 'line').length, 2, 'arrowhead');
  assert.equal(hr.find(c => c.kind === 'text').text, 'LP-1, 3');
  assert.equal(renderTemplate(T('us-wire-home-run'), { label: '' }, b).some(c => c.kind === 'text'), false);
  for (const t of MARKSET_TEMPLATES.filter(t => t.placement === 'two-point')) {
    assert.equal(t.markset.group, 'electrical', t.id);
    for (const p of [{}, { shape: 'straight' }, { bend: 'right' }]) {
      assert.ok(svgToPdfAppearance(cmdsToSvg(renderTemplate(t, p, b), b), b.width, b.height), `${t.id} ${JSON.stringify(p)}`);
    }
  }
  assert.deepEqual(smartTwoPointSize(T('us-wire-2'), ...ARCH_D), { band: 27, length: 108 });
  assert.equal(smartTwoPointSize(T('us-room-tag'), ...ARCH_D), null);
});
