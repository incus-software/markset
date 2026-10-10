// Markset: the US units hooks in upstream modules that load under plain Node.
import test from 'node:test';
import assert from 'node:assert/strict';
import { findScaleInText } from '../js/annotations/document-scale.js';
import { maatlijnTekst } from '../js/annotations/maat-label.js';
import { readFileSync } from 'node:fs';
import { PAPIERFORMATEN, formaatTekst } from '../js/pdf/print-pagina-instelling.js';
import { PAPIERFORMATEN as CAD_PAPIER } from '../js/pdf/cad-import-logica.js';
import { US_PRINT_FORMATS } from './us-units.js';

const items = (...strs) => strs.map((str) => ({ str }));

test('print: every US sheet key and size matches print_instelling.rs', () => {
  const rs = readFileSync(new URL('../src-tauri/src/print_instelling.rs', import.meta.url), 'utf8');
  const rows = [...rs.matchAll(/\(Papier::\w+, "([\w-]+)", ([\d.]+), ([\d.]+)\)/g)]
    .map(([, key, k, l]) => [key, Math.round(Number(k) * 254) / 10, Math.round(Number(l) * 254) / 10]);
  assert.equal(rows.length, 9);
  assert.deepEqual(rows, Object.entries(US_PRINT_FORMATS).map(([key, f]) => [key, f.breedte, f.hoogte]));
  for (const [key] of rows) assert.ok(PAPIERFORMATEN[key], `${key} missing in PAPIERFORMATEN`);
  assert.equal(formaatTekst('arch-d'), 'ARCH D (24 x 36 in)');
  assert.equal(formaatTekst('a3'), 'A3 (297 x 420 mm)');
});

test('CAD import: US sheets are listed but never picked automatically', () => {
  const archD = CAD_PAPIER.find((p) => p.id === 'ARCH-D');
  assert.deepEqual([archD.breedte, archD.hoogte, archD.automatic], [609.6, 914.4, false]);
  assert.equal(CAD_PAPIER.filter((p) => p.automatic === false).length, 9);
});

test('title block: a US scale is read in feet, not as the bare 1/N pattern', () => {
  assert.deepEqual(findScaleInText(items(`SCALE: 1/4" = 1'-0"`)),
    { ratio: 48, scaleText: `1/4" = 1'-0"`, unit: 'ft' });
  assert.deepEqual(findScaleInText(items('FLOOR PLAN', 'SCALE:', `1/8" = 1'-0"`)).ratio, 96);
  assert.equal(findScaleInText(items(`1" = 20'-0"`)).ratio, 240);
});

test('title block: metric scales are unchanged', () => {
  assert.deepEqual(findScaleInText(items('SCALE: 1:200')), { ratio: 200, scaleText: 'SCALE: 1:200' });
  assert.deepEqual(findScaleInText(items('Maßstab 1/50')), { ratio: 50, scaleText: 'Maßstab 1/50' });
});

test('dimension label: hiding the unit keeps feet-inch marks', () => {
  assert.equal(maatlijnTekst(`12'-6 3/8"`, false), `12'-6 3/8"`);
  assert.equal(maatlijnTekst(`6 3/8"`, false), `6 3/8"`);
  assert.equal(maatlijnTekst('1550 mm', false), '1550');
  assert.equal(maatlijnTekst('12.50 ft', false), '12.50');
});
