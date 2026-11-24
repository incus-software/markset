// Markset: the Tool Palette offers US libraries only. The upstream NL,
// NEN 1414, INB and built-in groups stay as data (old markups still draw)
// but are never listed in the palette.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COUNTRIES, DEFAULT_COUNTRY } from '../../js/solid/data/symbolLocales.js';
import { NL_CATEGORIES } from '../../js/solid/data/nlSymbolLibrary.js';

const store = readFileSync(new URL('../../js/solid/stores/symbolStore.js', import.meta.url), 'utf8');

test('the palette store does not list the upstream non-US groups', () => {
  for (const name of ['NL_CATEGORIES', 'NEN1414_CATEGORIES', 'INB_CATEGORIES', 'BUILT_IN_CATEGORIES']) {
    assert.ok(!store.includes(name), `symbolStore.js still uses ${name}`);
  }
  assert.ok(store.includes('...MARKSET_CATEGORIES'), 'US libraries are still listed');
});

test('the country choice is the United States only', () => {
  assert.deepEqual(COUNTRIES.map(c => c.id), ['us']);
  assert.equal(DEFAULT_COUNTRY, 'us');
});

test('the NL data stays for markups already placed in PDFs', () => {
  assert.ok(NL_CATEGORIES.some(c => c.id === 'nl-ifc-bouw'));
});
