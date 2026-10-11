import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PRESET_SCHEMES, DEFAULT_SCHEME, SCHEME_KEYS, allSchemes, schemeValues, matchingScheme,
  saveCustomScheme, removeCustomScheme,
} from './color-schemes.js';

test('presets: bright blue, red, green, orange and black', () => {
  assert.deepEqual(PRESET_SCHEMES.map(s => s.id), ['blue', 'red', 'green', 'orange', 'black']);
  assert.equal(DEFAULT_SCHEME, 'red');
  for (const s of PRESET_SCHEMES) assert.match(s.color, /^#[0-9a-f]{6}$/);
});

test('every scheme key is a real preference with a color default', () => {
  const constants = readFileSync(new URL('../js/core/constants.ts', import.meta.url), 'utf8');
  for (const k of SCHEME_KEYS) assert.match(constants, new RegExp(`\\b${k}: '#[0-9A-Fa-f]{6}'`), k);
  // Fills, highlighter and measurements keep their own colors.
  for (const k of ['highlightColor', 'cloudFillColor', 'measureAreaStrokeColor', 'redactionOverlayColor']) {
    assert.ok(!SCHEME_KEYS.includes(k), k);
  }
});

test('applying a scheme sets every key; the scheme is recognised back', () => {
  const prefs = { ...schemeValues('#0066FF'), highlightColor: '#ffff00' };
  assert.equal(prefs.cloudStrokeColor, '#0066ff');
  assert.equal(matchingScheme(prefs).id, 'blue');
  assert.equal(matchingScheme({ ...prefs, lineStrokeColor: '#123456' }), null); // a mix
  assert.equal(matchingScheme(schemeValues('#123456')), null);                   // not a scheme
});

test('custom schemes: save, rename-safe ids, update by name, remove', () => {
  const a = saveCustomScheme([], 'Navy markup', '#1f3a93');
  assert.deepEqual(a.scheme, { id: 'custom-navy-markup', name: 'Navy markup', color: '#1f3a93' });
  const b = saveCustomScheme(a.list, 'navy markup', '#112233'); // same name: update
  assert.equal(b.list.length, 1);
  assert.equal(b.list[0].color, '#112233');
  const c = saveCustomScheme(b.list, 'Navy-Markup!', '#000080'); // different name, same slug
  assert.equal(c.scheme.id, 'custom-navy-markup-2');
  assert.equal(saveCustomScheme(c.list, '', '#000000'), null);
  assert.equal(saveCustomScheme(c.list, 'Bad', 'blue'), null);
  assert.deepEqual(allSchemes(c.list).slice(5).map(s => s.custom), [true, true]);
  assert.equal(matchingScheme(schemeValues('#000080'), c.list).id, 'custom-navy-markup-2');
  assert.deepEqual(removeCustomScheme(c.list, 'custom-navy-markup').map(s => s.id), ['custom-navy-markup-2']);
  assert.deepEqual(removeCustomScheme(c.list, 'red').length, 2); // presets are not in the list
});
