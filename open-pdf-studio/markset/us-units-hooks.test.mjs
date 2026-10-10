// Markset: the US units hooks in upstream modules that load under plain Node.
import test from 'node:test';
import assert from 'node:assert/strict';
import { findScaleInText } from '../js/annotations/document-scale.js';
import { maatlijnTekst } from '../js/annotations/maat-label.js';

const items = (...strs) => strs.map((str) => ({ str }));

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
