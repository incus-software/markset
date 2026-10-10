import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertLength,
  formatFeetInches,
  formatFractionalInches,
  parseLength,
  parseLengthAs,
  ARCHITECTURAL_SCALES,
  ENGINEERING_SCALES,
  usScaleLabel,
  pointsPerFoot,
  findUsScale,
  US_SHEETS,
  sheetOptionLabel,
  formatImperialLength,
  isFeetInchText,
  imperialOr,
  defaultScaleBar,
  unitDefaultsFor,
} from './us-units.js';

test('formatFeetInches rounds to the fraction and reduces it', () => {
  assert.equal(formatFeetInches(12 + 6.375 / 12), `12'-6 3/8"`);
  assert.equal(formatFeetInches(0.5), `0'-6"`);
  assert.equal(formatFeetInches(2), `2'-0"`);
  assert.equal(formatFeetInches(10 + 0.25 / 12), `10'-0 1/4"`);
  assert.equal(formatFeetInches(0.03 / 12), `0'-0"`);
  assert.equal(formatFeetInches(-1.5), `-1'-6"`);
});

test('formatFeetInches carries 11 15/16+ up to the next foot', () => {
  assert.equal(formatFeetInches(3 + 11.99 / 12), `4'-0"`);
  assert.equal(formatFeetInches(3 + 11.99 / 12, 64), `3'-11 63/64"`);
});

test('formatFeetInches honours the denominator and falls back to 1/16', () => {
  assert.equal(formatFeetInches(1 + 6.3 / 12, 8), `1'-6 1/4"`);
  assert.equal(formatFeetInches(1 + 6.3 / 12, 2), `1'-6 1/2"`);
  assert.equal(formatFeetInches(1 + 6.3 / 12, 7), `1'-6 5/16"`);
});

test('formatFractionalInches', () => {
  assert.equal(formatFractionalInches(6.375), `6 3/8"`);
  assert.equal(formatFractionalInches(0.25), `1/4"`);
  assert.equal(formatFractionalInches(150), `150"`);
  assert.equal(formatFractionalInches(0), `0"`);
});

test('parseLength reads feet-inch input', () => {
  const ft = (s) => parseLength(s, 'mm');
  assert.deepEqual(ft(`12'-6 3/8"`), { value: 12 + 6.375 / 12, unit: 'ft' });
  assert.deepEqual(ft(`12' 6"`), { value: 12.5, unit: 'ft' });
  assert.deepEqual(ft(`12'6"`), { value: 12.5, unit: 'ft' });
  assert.deepEqual(ft(`12'-6-3/8"`), { value: 12 + 6.375 / 12, unit: 'ft' });
  assert.deepEqual(ft(`12ft 6in`), { value: 12.5, unit: 'ft' });
  assert.deepEqual(ft(`12'`), { value: 12, unit: 'ft' });
  assert.deepEqual(ft(`12.5 ft`), { value: 12.5, unit: 'ft' });
  assert.deepEqual(ft(`3 feet`), { value: 3, unit: 'ft' });
  assert.deepEqual(ft(`12′-6″`), { value: 12.5, unit: 'ft' });
});

test('parseLength reads inches and fractions', () => {
  assert.deepEqual(parseLength(`6 3/8"`), { value: 6.375, unit: 'in' });
  assert.deepEqual(parseLength(`3/8 in`), { value: 0.375, unit: 'in' });
  assert.deepEqual(parseLength(`6''`), { value: 6, unit: 'in' });
  assert.deepEqual(parseLength(`1 1/2`, 'ft'), { value: 1.5, unit: 'ft' });
});

test('parseLength keeps metric and plain input working', () => {
  assert.deepEqual(parseLength('1500', 'mm'), { value: 1500, unit: 'mm' });
  assert.deepEqual(parseLength('1,5 m'), { value: 1.5, unit: 'm' });
  assert.deepEqual(parseLength('2.4m'), { value: 2.4, unit: 'm' });
  assert.deepEqual(parseLength('.5 in'), { value: 0.5, unit: 'in' });
  assert.deepEqual(parseLength('10 meters'), { value: 10, unit: 'm' });
});

test('parseLength rejects nonsense and non-positive lengths', () => {
  for (const s of ['', '  ', 'abc', '0', `0'`, '12 parsecs', '3/0"', `12'-x"`, '-5 mm']) {
    assert.equal(parseLength(s), null, s);
  }
});

test('parseLengthAs converts to the requested unit', () => {
  assert.equal(parseLengthAs(`1'-6"`, 'in'), 18);
  assert.ok(Math.abs(parseLengthAs(`1'`, 'mm') - 304.8) < 1e-9);
  assert.equal(parseLengthAs('250', 'mm'), 250);
  assert.ok(Number.isNaN(parseLengthAs('nope', 'mm')));
});

test('convertLength', () => {
  assert.equal(convertLength(1, 'ft', 'in'), 12);
  assert.equal(convertLength(25.4, 'mm', 'in'), 1);
  assert.ok(Number.isNaN(convertLength(1, 'ft', 'px')));
});

test('architectural and engineering ratios match their labels', () => {
  for (const s of [...ARCHITECTURAL_SCALES, ...ENGINEERING_SCALES]) {
    assert.equal(findUsScale(s.label)?.ratio, s.ratio, s.label);
  }
  assert.equal(usScaleLabel('1:48'), `1/4" = 1'-0"`);
  assert.equal(usScaleLabel(240), `1" = 20'`);
  assert.equal(usScaleLabel('1:100'), null);
});

test('pointsPerFoot: at 1/4" = 1\'-0" one foot is 18 pt on paper', () => {
  assert.equal(pointsPerFoot(48), 18);
});

test('findUsScale reads title-block text', () => {
  assert.deepEqual(findUsScale(`SCALE: 1/4" = 1'-0"`), { ratio: 48, scaleText: `1/4" = 1'-0"` });
  assert.equal(findUsScale(`SCALE 1/8"=1'-0"`).ratio, 96);
  assert.equal(findUsScale(`1-1/2" = 1'-0"`).ratio, 8);
  assert.equal(findUsScale(`1" = 20'-0"`).ratio, 240);
  assert.equal(findUsScale(`1/8 in = 1 ft`).ratio, 96);
  assert.equal(findUsScale(`3/16″ = 1′-0″`).ratio, 64);
});

test('findUsScale ignores sheet numbers and implausible matches', () => {
  assert.equal(findUsScale(`A-101 1/4" = 1'-0"`).ratio, 48);
  assert.equal(findUsScale(`SHEET 101 1/4" = 1'-0"`).ratio, 48);
  assert.equal(findUsScale('1:100'), null);
  assert.equal(findUsScale(`12'-6"`), null);
  assert.equal(findUsScale(`24" = 1'`), null);
  assert.equal(findUsScale(''), null);
});

test('US sheets are in points and portrait', () => {
  assert.deepEqual(
    [US_SHEETS['arch-d'].width, US_SHEETS['arch-d'].height],
    [24 * 72, 36 * 72]);
  assert.deepEqual(
    [US_SHEETS['ansi-a'].width, US_SHEETS['ansi-a'].height],
    [612, 792]);
  for (const [key, s] of Object.entries(US_SHEETS)) {
    assert.ok(s.width <= s.height, key);
    assert.equal(s.widthMm, Math.round(s.widthIn * 25.4), key);
  }
  assert.equal(sheetOptionLabel('arch-e1'), 'ARCH E1 (30 x 42 in)');
  assert.equal(sheetOptionLabel('a4'), '');
});

test('formatImperialLength picks feet-inch only for ft and in lengths', () => {
  assert.equal(formatImperialLength(12.5, 'ft'), `12'-6"`);
  assert.equal(formatImperialLength(6.375, 'in'), `6 3/8"`);
  assert.equal(formatImperialLength(12.5, 'ft', 'decimal'), null);
  assert.equal(formatImperialLength(12.5, 'ft²'), null);
  assert.equal(formatImperialLength(1500, 'mm'), null);
});

test('isFeetInchText', () => {
  for (const s of [`12'-6 3/8"`, `0'-6"`, `3/8"`, `6 3/8"`, `150"`]) assert.ok(isFeetInchText(s), s);
  for (const s of ['1550 mm', '12.50 ft', '45°', '', null]) assert.ok(!isFeetInchText(s), String(s));
});

test('imperialOr: feet-inch per the preferences, else the caller text', () => {
  assert.equal(imperialOr(12.5, 'ft', {}, '12.50 ft'), `12'-6"`);
  assert.equal(imperialOr(12 + 6.3 / 12, 'ft', { measureFractionDenominator: 8 }, 'x'), `12'-6 1/4"`);
  assert.equal(imperialOr(12.5, 'ft', { measureImperialFormat: 'decimal' }, '12.50 ft'), '12.50 ft');
  assert.equal(imperialOr(1500, 'mm', {}, '1500'), '1500');
  assert.equal(imperialOr(10, 'ft²', {}, '10.00 ft²'), '10.00 ft²');
  assert.equal(imperialOr(3.0625, 'in', undefined, 'x'), '3 1/16"');
});

test('defaultScaleBar: 5 m metric, 20 ft or 24 in imperial', () => {
  assert.deepEqual(defaultScaleBar('mm'), { totalUnits: 5000, divisions: 5 });
  assert.deepEqual(defaultScaleBar('m'), { totalUnits: 5, divisions: 5 });
  assert.deepEqual(defaultScaleBar('ft'), { totalUnits: 20, divisions: 4 });
  assert.deepEqual(defaultScaleBar('in'), { totalUnits: 24, divisions: 4 });
  assert.deepEqual(defaultScaleBar('px'), { totalUnits: 5000, divisions: 5 });
});

test('unitDefaultsFor: US unless the preference says metric', () => {
  assert.equal(unitDefaultsFor(undefined).unit, 'ft');
  assert.deepEqual(unitDefaultsFor({ unitSystem: 'us' }),
    { unit: 'ft', ratio: 48, scaleString: '1:48', viewportPreset: 'us:48', paper: 'arch-d' });
  assert.deepEqual(unitDefaultsFor({ unitSystem: 'metric' }),
    { unit: 'mm', ratio: 100, scaleString: '1:100', viewportPreset: '100', paper: 'a1' });
});
