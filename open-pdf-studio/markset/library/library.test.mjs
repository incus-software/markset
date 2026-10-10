// Markset: the bundled library loads, follows the library format and sizes
// to the sheet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundledGroups, symbolForShortcut } from './bundle.js';
import { sheetSymbolHeight, MIN_HEIGHT_IN } from './sizing.js';
import { isSafeSymbolSvg } from '../../js/solid/data/symbolLibraryOnline.js';
import { svgToPdfAppearance } from '../svg-to-pdf.js';

const here = fileURLToPath(new URL('.', import.meta.url));

function readTree(dir) {
  const out = {};
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) Object.assign(out, readTree(p));
    else if (/\.(json|svg)$/.test(name)) out['./' + relative(here, p).replace(/\\/g, '/')] = readFileSync(p, 'utf8');
  }
  return out;
}
const files = readTree(here);
const groups = bundledGroups(files);
const starter = groups.find(g => g.id === 'markset-us-starter');

test('the US Starter Library loads as a built-in group', () => {
  assert.ok(starter);
  assert.equal(starter.builtin, true);
  assert.equal(starter.name, 'US Starter Library');
  assert.deepEqual(starter.symbols.slice(0, 2).map(s => s.name), ['Checkmark', 'X']);
});

test('the review marks batch is complete, in palette order', () => {
  const review = starter.symbols.filter(s => s.markset?.role === 'review').map(s => s.markset.id);
  assert.deepEqual(review, [
    'checkmark', 'x-mark', 'circled-check', 'circled-x', 'question-mark',
    'vif', 'nic', 'ok', 'eq', 'see-comment-dot', 'strike-line',
  ]);
  for (const s of starter.symbols) assert.match(s.svg, /#d00/, `${s.name}: drawn in the recolorable review red`);
});

test('every symbol follows the library format and draws as vectors', () => {
  const svgs = Object.entries(files).filter(([p]) => p.endsWith('.svg'));
  assert.ok(svgs.length >= 2);
  for (const [path, svg] of svgs) {
    const name = path.split('/').pop();
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/, `${path}: kebab-case file name`);
    assert.match(svg, /viewBox="0 0 64 64"/, `${path}: 64-unit viewBox`);
    assert.ok(isSafeSymbolSvg(svg), `${path}: self-contained`);
    assert.ok(svgToPdfAppearance(svg, 64, 64), `${path}: converts to a vector appearance`);
  }
});

test('markset.json only describes symbols that exist, with valid data', () => {
  for (const g of groups) {
    const dir = g.id.replace(/^markset-/, '');
    const extra = JSON.parse(files[`./${dir}/markset.json`] || '{"symbols":{}}').symbols;
    const ids = new Set(g.symbols.map(s => s.id.replace(`lib-${dir}-`, '')));
    const keys = new Set();
    for (const [id, x] of Object.entries(extra)) {
      assert.ok(ids.has(id), `${dir}/${id} in markset.json has no SVG`);
      if (x.paperHeightIn != null) assert.ok(x.paperHeightIn > 0 && x.paperHeightIn < 3, `${id}: paperHeightIn`);
      if (x.role != null) assert.ok(['review', 'drawing'].includes(x.role), `${id}: role`);
      if (x.shortcut != null) {
        assert.match(x.shortcut, /^[a-z]$/, `${id}: one lower-case key`);
        assert.ok(!keys.has(x.shortcut), `${id}: shortcut ${x.shortcut} used twice`);
        keys.add(x.shortcut);
      }
    }
  }
});

test('K places the checkmark and X the X; app keys stay free', () => {
  assert.equal(symbolForShortcut(groups, 'K').name, 'Checkmark');
  assert.equal(symbolForShortcut(groups, 'x').name, 'X');
  // Single keys the app already uses (keyboard-handlers.js) or that start CAD chords.
  for (const k of ['v', 'h', 't', 'n', 'g', 'c', 'e', 'm', 'r', 'a']) {
    assert.equal(symbolForShortcut(groups, k), null, k);
  }
});

test('sheet-relative height: 3/8" on 24x36, scaled down on smaller sheets', () => {
  const pt = (inch) => inch * 72;
  assert.equal(sheetSymbolHeight(0.375, pt(36), pt(24)), 27);           // 3/8" on ARCH D
  assert.equal(sheetSymbolHeight(0.375, pt(48), pt(36)), 36);           // 1/2" on ARCH E
  assert.equal(sheetSymbolHeight(0.375, pt(17), pt(11)), MIN_HEIGHT_IN * 72); // clamped
  assert.equal(sheetSymbolHeight(0.375, pt(8.5), pt(11)), MIN_HEIGHT_IN * 72);
  assert.equal(sheetSymbolHeight(0, 612, 792), null);
  assert.equal(sheetSymbolHeight(0.375, 0, 792), null);
});
