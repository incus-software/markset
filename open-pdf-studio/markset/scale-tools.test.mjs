import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { referenceLength } from './scale-reference.js';

test('reference line length in page units; slips are ignored', () => {
  assert.equal(referenceLength({ x: 0, y: 0 }, { x: 30, y: 40 }), 50);
  assert.equal(referenceLength({ x: 0, y: 0 }, { x: 1, y: 1 }, 1), null); // 1.4 screen px
  assert.ok(referenceLength({ x: 0, y: 0 }, { x: 1, y: 1 }, 4) > 0); // zoomed in: 5.7 screen px
  assert.equal(referenceLength(null, { x: 1, y: 1 }), null);
});

test('the Annotation tab has Text, Set Scale and Calibrate', () => {
  const tab = readFileSync(new URL('../js/solid/components/ribbon/CommentTab.jsx', import.meta.url), 'utf8');
  assert.match(tab, /id="tool-text"[\s\S]*?onClick=\{\(\) => setTool\('text'\)\}/);
  assert.match(tab, /id="btn-markset-set-scale"[\s\S]*?onClick=\{openSetScale\}/);
  assert.match(tab, /id="btn-markset-calibrate"[\s\S]*?onClick=\{startCalibrate\}/);
  assert.match(tab, /registerMarksetScaleTools\(\);/);
});

test('Set Scale in feet matches the scale regions (upstream divided by 12 instead of multiplying)', () => {
  const dlg = readFileSync(new URL('../js/solid/components/dialogs/CalibrationDialog.jsx', import.meta.url), 'utf8');
  const m = dlg.match(/u === 'ft'\) \{[^}]*?pixelsPerUnit = ([^;]+);/);
  assert.ok(m, 'ft branch');
  const S = 48;
  const ppu = Function('S', `return ${m[1]};`)(S);
  assert.equal(ppu, 18); // 1/4" = 1'-0": one real foot is 1/4" = 18 pt on paper
  // Same as scale-region.js pixelsPerUnitFor('1:48', 'ft'): (72 / 25.4) / 48 * 304.8
  assert.ok(Math.abs((72 / 25.4) / S * 304.8 - ppu) < 1e-9);
});
