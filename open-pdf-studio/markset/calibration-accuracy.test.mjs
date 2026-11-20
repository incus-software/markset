// Markset: calibrate on one dimension string, measure another on the same
// sheet, and get the printed value back to the nearest 1/16".
//
// Reported: a printed 28'-1" measured 28'-1 1/16". The known-distance field
// then took only plain numbers, so 11'-11 1/4" went in as rounded decimal
// feet: 11.94 instead of 11.9375 makes the scale 0.02 % short, exactly
// 1/16" over 28 feet. Upstream's length field (data-getal="lengte",
// core/voet-inch.js) now takes feet-inches; these tests pin the end-to-end
// result with it, and the two Markset parts of the dialog: the picked length
// is used unrounded, and the entry is read back live.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

register('../js/core/app-test-hooks.mjs', import.meta.url);
const { installeerBrowserStubs } = await import('../js/core/app-test-hooks.mjs');
installeerBrowserStubs();
const { schaalUitKalibratie } = await import('../js/annotations/kalibratie-schaal.js');
const { leesLengte, formatVoetInch } = await import('../js/core/voet-inch.js');

const ft = (s) => leesLengte(s, 'ft');
const fmt = (feet) => formatVoetInch(feet, 'ft', { precisie: 16 });

// A sheet at 1/4" = 1'-0": 18 PDF points per real foot. Points are the
// extension-line ends a snap lands on, written to 3 decimals as PDF writers
// do. The strings run in different directions, like the reported sheet.
const PT_PER_FT = 18;
const q = (v) => Math.round(v * 1000) / 1000;
function dimension(x, y, feet, angleDeg) {
  const a = angleDeg * Math.PI / 180;
  const len = feet * PT_PER_FT;
  return { p1: { x: q(x), y: q(y) }, p2: { x: q(x + len * Math.cos(a)), y: q(y + len * Math.sin(a)) } };
}
const length = ({ p1, p2 }) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
const measure = (scale, dim) => fmt(length(dim) / scale.pixelsPerUnit);

test('calibrate on one dimension string, measure another: matches the print to 1/16"', () => {
  const calib = dimension(300.25, 1210.5, ft(`11'-11 1/4"`), 0);
  const scale = schaalUitKalibratie({ method: 'reference', distance: ft(`11'-11 1/4"`), pixels: length(calib), unit: 'ft' });
  assert.equal(scale.unit, 'ft');
  for (const printed of [`28'-1"`, `28'-1 1/16"`, `11'-11 1/4"`, `48'-0"`, `3'-4 3/4"`, `0'-5 1/2"`]) {
    for (const angle of [0, 90, -90, 37]) {
      const dim = dimension(812.75, 640.125, ft(printed), angle);
      assert.equal(measure(scale, dim), printed, `${printed} at ${angle}°`);
    }
  }
});

test('the cause: decimal feet rounded to 0.01 put 28\'-1" at 28\'-1 1/16"', () => {
  const calib = dimension(300, 1210, ft(`11'-11 1/4"`), 0);
  const rounded = schaalUitKalibratie({ method: 'reference', distance: 11.94, pixels: length(calib), unit: 'ft' });
  assert.equal(measure(rounded, dimension(812, 640, ft(`28'-1"`), 90)), `28'-1 1/16"`);
});

const dialog = readFileSync(new URL('../js/solid/components/dialogs/CalibrationDialog.jsx', import.meta.url), 'utf8');

test('the calibration dialog calibrates with the picked length unrounded', () => {
  assert.match(dialog, /exactPixels = refPx;/);
  assert.match(dialog, /pixels: exactPixels \?\? pixels\(\)/);
  // Typing in the pixels field drops the exact value; the typed one counts.
  assert.match(dialog, /onInput=\{\(e\) => \{ exactPixels = null; setPixels\(e\.target\.value\); \}\}/);
});

test('the calibration dialog reads the known distance back as it is understood', () => {
  assert.match(dialog, /\{distancePreview\(\)\}/);
  assert.match(dialog, /formatVoetInch\(v, unit\(\)\)/);
});
