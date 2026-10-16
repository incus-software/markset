import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName } from 'pdf-lib';
import { getTemplate } from '../../js/symbols/registry.js';
import {
  registerMarksetTemplates, registerPluginTemplate, smartPlacementBox, smartColors, frozenForSave,
  smartTemplateFor, writeVectorParametricAppearance,
} from './index.js';
import { freezeCmds, thawCmds, parseFrozen, frozenTemplate, ASSET_PREFIX } from './assets.js';
import { toggleAt, editHitAt, fitToContent, propertiesPanel } from './hooks.js';
import { registerSymbolCategory, pluginCategories } from './plugin-categories.js';
import { createSmartSymbolApi } from '../plugin-smart-api.js';
import { findImageAnnotationSources } from '../../js/pdf/loader/annotation-image-sources.mjs';
import { createPluginPdfAnnotation } from '../../js/plugins/plugin-pdf.js';

registerMarksetTemplates();
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const IMG = `data:image/png;base64,${PNG_1PX}`;

// A plugin-style template: a box with a title and an image param.
const CARD = {
  id: 'test-plugin-card', name: 'Card', nameEn: 'Card',
  params: [{ key: 'title', type: 'string', default: 'A' }, { key: 'pic', type: 'string', default: '' }, { key: 'on', type: 'boolean', default: false }],
  render: (p, b) => [
    { kind: 'polyline', points: [{ x: b.x, y: b.y }, { x: b.x + b.width, y: b.y }, { x: b.x + b.width, y: b.y + b.height }], close: true },
    { kind: 'text', text: p.title, x: b.x + b.width / 2, y: b.y + 10, size: 8 },
    ...(p.pic ? [{ kind: 'image', src: p.pic, x: b.x + 2, y: b.y + 2, width: 10, height: 10 }] : []),
  ],
  markset: {
    contentSize: (p) => ({ width: 144, height: p.title.length > 3 ? 96 : 72 }),
    colors: () => ({ color: '#123456', strokeColor: '#123456' }),
    toggleAt: (p, b, x, y) => (x < b.x + 20 ? { params: { ...p, on: !p.on }, key: 'corner' } : null),
    editHitAt: (p, b, x, y) => y < b.y + 20,
    propertiesPanel: () => {},
  },
};

test('freeze and thaw: commands move with the box and scale with it; images become asset references', () => {
  const box = { x: 100, y: 50, width: 144, height: 72 };
  const params = { title: 'Hi', pic: IMG };
  const cmds = CARD.render(params, box);
  const f = parseFrozen(JSON.stringify(freezeCmds(cmds, box, params)));
  assert.equal(f.w, 144);
  assert.equal(f.cmds[0].points[0].x, 0);
  assert.equal(f.cmds[2].src, ASSET_PREFIX + 'pic');
  assert.deepEqual(thawCmds(f, box, params), cmds); // same place: same commands
  const moved = thawCmds(f, { x: 0, y: 0, width: 288, height: 144 }, params);
  assert.equal(moved[1].x, 144);
  assert.equal(moved[1].size, 16);
  assert.equal(moved[2].src, IMG);
  assert.equal(parseFrozen('{"w":0}'), null);
  assert.equal(parseFrozen('nope'), null);
});

test('a plugin template is sized, coloured and drawn like a bundled one, and can be removed', () => {
  const remove = registerPluginTemplate(CARD);
  const t = getTemplate(CARD.id);
  assert.ok(t);
  assert.deepEqual(smartPlacementBox(t, 200, 200, 2592, 1728, 1, { title: 'Long title' }), { x: 128, y: 152, width: 144, height: 96 });
  assert.deepEqual(smartColors(t, '#ff0000', {}), { color: '#123456', strokeColor: '#123456' });
  const ann = { type: 'parametricSymbol', symbolId: CARD.id, params: { title: 'Hi', pic: '', on: false }, x: 0, y: 0, width: 144, height: 72 };
  assert.ok(frozenForSave(ann).cmds.length >= 2);
  assert.deepEqual(toggleAt(t, ann.params, ann, 5, 40), { params: { ...ann.params, on: true }, key: 'corner' });
  assert.equal(toggleAt(t, ann.params, ann, 100, 40), null);
  assert.equal(editHitAt(t, ann.params, ann, 100, 5), true);
  assert.equal(typeof propertiesPanel(t), 'function');
  const grown = { ...ann, params: { title: 'Long title' }, width: 288, height: 10, y: 100 };
  fitToContent(grown, t); // keeps the width, height from the content, around the centre
  assert.equal(grown.height, 192);
  assert.equal(grown.y, 100 + 5 - 96);
  remove();
  assert.equal(getTemplate(CARD.id), null);
});

test('without its template a symbol draws its frozen copy, and saving keeps that copy', async () => {
  const remove = registerPluginTemplate(CARD);
  const ann = { type: 'parametricSymbol', symbolId: CARD.id, params: { title: 'Hi', pic: '' }, x: 10, y: 20, width: 144, height: 72, rotation: 0 };
  const frozen = parseFrozen(JSON.stringify(frozenForSave(ann)));
  remove();
  const loaded = { ...ann, frozen };
  const stand = smartTemplateFor(loaded);
  assert.equal(stand, frozenTemplate(loaded)); // the same stand-in each time
  assert.equal(stand.render(loaded.params, loaded)[1].text, 'Hi');
  assert.equal(stand.render(loaded.params, loaded)[1].x, 10 + 72);
  assert.equal(frozenForSave(loaded), frozen);
  // ...and still gets a vector appearance
  const pdf = await PDFDocument.create();
  const dict = pdf.context.obj({ Type: 'Annot', Subtype: 'Square' });
  assert.equal(writeVectorParametricAppearance({ ann: loaded, annotDict: dict, context: pdf.context, pdf: { PDFName }, rectW: 144, rectH: 72 }), true);
  assert.equal(smartTemplateFor({ symbolId: 'nothing' }), null);
});

test('plugin Toolpalette groups: add, update, remove; deactivating a plugin removes its things', async () => {
  const g = registerSymbolCategory({ id: 'test-group', name: 'Mine', symbols: [{ id: 'a', name: 'A', svg: '<svg/>' }, { id: 'bad' }], onAdd: () => {} });
  let cat = pluginCategories().find(c => c.id === 'test-group');
  assert.equal(cat.symbols.length, 1); // an entry without a picture is left out
  assert.equal(typeof cat.onAdd, 'function');
  g.update({ symbols: [] });
  cat = pluginCategories().find(c => c.id === 'test-group');
  assert.equal(cat.symbols.length, 0);
  assert.equal(cat.name, 'Mine');
  g.remove();
  assert.equal(pluginCategories().some(c => c.id === 'test-group'), false);

  const api = createSmartSymbolApi();
  api.methods.registerParametricTemplate(CARD);
  api.methods.registerParametricTemplate(CARD); // registering again replaces it
  api.methods.registerSymbolCategory({ id: 'test-group-2', name: 'Two', symbols: [] });
  assert.throws(() => api.methods.registerParametricTemplate({ ...CARD, id: 'us-room-tag' }), /already exists/);
  const svg = api.methods.symbolPreviewSvg([{ kind: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }], { x: 0, y: 0, width: 10, height: 10 }, { color: '#00f' });
  assert.ok(svg.startsWith('<svg') && svg.includes('stroke="#00f"'));
  // File paths: nothing to read without a path, and no write without one.
  assert.equal(await api.methods.readFileAt(''), null);
  await assert.rejects(api.methods.writeFileAt('', new Uint8Array(1)), /no path/);
  api.cleanup();
  assert.equal(getTemplate(CARD.id), null);
  assert.ok(getTemplate('us-room-tag')); // a bundled template is never removed
  assert.equal(pluginCategories().some(c => c.id === 'test-group-2'), false);
});

test("a plugin annotation's picture is read only when its plugin is missing", async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const ann = { id: 'p1', type: 'demo-seal', x: 10, y: 10, width: 72, height: 72, pluginFallback: { src: IMG } };
  const dict = await createPluginPdfAnnotation(pdf, ann, [10, 10, 82, 82], Buffer.from(PNG_1PX, 'base64'));
  assert.equal(String(dict.get(PDFName.of('OPS_PluginData'))).includes('pluginFallback'), false); // never saved
  page.node.set(PDFName.of('Annots'), pdf.context.obj([pdf.context.register(dict)]));
  assert.equal(findImageAnnotationSources(1, pdf).length, 0);
  assert.equal(findImageAnnotationSources(1, pdf, () => false).length, 0);
  const found = findImageAnnotationSources(1, pdf, (type) => type === 'demo-seal');
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'plugin-image');
});

test('on a page shown rotated, a symbol is drawn turned back so it reads upright; it is named in other apps', async () => {
  const { writeVectorParametricAppearance, smartSubject, registerPluginTemplate } = await import('./index.js');
  const remove = registerPluginTemplate({ ...CARD, id: 'test-rotated-card' });
  try {
    const pdf = await PDFDocument.create();
    const context = pdf.context;
    const draw = (pageRot, ann) => {
      const annotDict = context.obj({});
      const ok = writeVectorParametricAppearance({ ann, annotDict, context, pdf: { PDFName }, rectW: ann.width, rectH: ann.height, pageRot });
      const stream = ok && context.lookup(context.lookup(annotDict.get(PDFName.of('AP'))).get(PDFName.of('N')));
      return ok ? Buffer.from(stream.getContents()).toString('latin1') : null;
    };
    // Upright page: no turn. The symbol is 144 wide, 72 high.
    assert.match(draw(0, { symbolId: 'test-rotated-card', width: 144, height: 72, params: { title: 'A' } }), /1 0 0 1 72 36 cm\n1 0 -?0 1 0 0 cm\n1 0 0 1 -72 -36 cm/);
    // Page /Rotate 90: the saver hands over the box with width and height swapped (72 x 144);
    // the symbol keeps its 144 x 72 shape and is turned a quarter counter-clockwise.
    const turned = draw(90, { symbolId: 'test-rotated-card', width: 72, height: 144, params: { title: 'A' } });
    assert.match(turned, /1 0 0 1 36 72 cm\n0 1 -1 0 0 0 cm\n1 0 0 1 -72 -36 cm/);
    assert.match(draw(180, { symbolId: 'test-rotated-card', width: 144, height: 72, params: { title: 'A' } }), /-1 -?0 -?0 -1 0 0 cm/);
    // Two-point symbols on rotated pages keep the picture path.
    assert.equal(draw(90, { symbolId: 'test-rotated-card', width: 72, height: 144, params: {}, startX: 0, startY: 0, endX: 1, endY: 1 }), null);
    assert.equal(smartSubject({ symbolId: 'test-rotated-card' }), 'Card');
    assert.equal(smartSubject({ symbolId: 'no-such-template' }), '');
  } finally { remove(); }
});
