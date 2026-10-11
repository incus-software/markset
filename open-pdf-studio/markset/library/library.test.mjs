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
import { svgToPdfAppearance, helveticaWidth } from '../svg-to-pdf.js';

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
  assert.deepEqual(review.slice(0, 11), [
    'checkmark', 'x-mark', 'circled-check', 'circled-x', 'question-mark',
    'vif', 'nic', 'ok', 'eq', 'see-comment-dot', 'strike-line',
  ]);
});

test('batch 2: drawing symbols and punch / field icons', () => {
  const ids = (role) => starter.symbols.filter(s => s.markset?.role === role).map(s => s.markset.id);
  assert.deepEqual(ids('drawing'), ['north-arrow', 'centerline', 'break-line', 'match-line', 'align-note']);
  assert.deepEqual(ids('review').slice(11), [
    'punch-pin', 'finish', 'door-hardware', 'mep', 'safety', 'damage', 'water-moisture', 'crack', 'camera',
  ]);
});

test('review marks are drawn in the recolorable red, drawing symbols in black', () => {
  for (const s of starter.symbols) {
    if (s.markset?.role === 'review') {
      assert.match(s.svg, /#d00/, `${s.name}: review red`);
      assert.doesNotMatch(s.svg, /#000/, `${s.name}: no black in a review mark`);
    } else if (s.markset?.role === 'stamp') {
      // A stamp's color carries its meaning, so it is not the review red.
      assert.doesNotMatch(s.svg, /#d00\b/, `${s.name}: stamps keep their own color`);
    } else {
      assert.doesNotMatch(s.svg, /#d00/, `${s.name}: drawing symbols print black`);
    }
  }
});

test('stamps: 15, wide, one meaning color each, text that fits', () => {
  const stamps = starter.symbols.filter(s => s.markset?.role === 'stamp');
  assert.equal(stamps.length, 15);
  const meaning = new Set(['#15803d', '#b45309', '#b91c1c', '#1d4ed8', '#4b5563']);
  for (const s of stamps) {
    assert.match(s.markset.id, /^stamp-/, s.name);
    assert.match(s.svg, /viewBox="0 0 256 64"/, `${s.name}: 4:1 stamp`);
    const colors = new Set(s.svg.match(/#[0-9a-f]{6}/g));
    assert.equal(colors.size, 1, `${s.name}: one color`);
    assert.ok(meaning.has([...colors][0]), `${s.name}: a meaning color`);
    for (const [, size, text] of s.svg.matchAll(/font-size="([\d.]+)"[^>]*>([^<]+)</g)) {
      assert.ok(helveticaWidth(text, Number(size), true) <= 236, `${s.name}: "${text}" fits inside the inner border`);
      assert.ok(Number(size) >= 15, `${s.name}: text large enough to read`);
    }
  }
});

test('every symbol follows the library format and draws as vectors', () => {
  const svgs = Object.entries(files).filter(([p]) => p.endsWith('.svg'));
  assert.ok(svgs.length >= 2);
  for (const [path, svg] of svgs) {
    const name = path.split('/').pop();
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/, `${path}: kebab-case file name`);
    // 64 units high like the upstream format; wide symbols (match line,
    // break line, level datum) may be 2, 3 or 4 squares wide.
    assert.match(svg, /viewBox="0 0 (64|128|192|256) 64"/, `${path}: 64-unit-high viewBox`);
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
      if (x.role != null) assert.ok(['review', 'drawing', 'stamp'].includes(x.role), `${id}: role`);
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

test('US Electrical: its own group after the Starter Library, 22 black symbols', () => {
  assert.deepEqual(groups.map(g => g.id), ['markset-us-starter', 'markset-us-electrical-starter']);
  const el = groups[1];
  assert.equal(el.name, 'US Electrical');
  assert.equal(el.symbols.length, 22);
  for (const s of el.symbols) {
    assert.equal(s.markset?.role, 'drawing', s.name);
    assert.doesNotMatch(s.svg, /#d00/, `${s.name}: prints black`);
  }
  assert.deepEqual(el.symbols.slice(0, 2).map(s => s.name), ['Single receptacle', 'Duplex receptacle']);
});
