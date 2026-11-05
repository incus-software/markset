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
  assert.match(tab, /id="tool-text"[\s\S]*?onClick=\{\(\) => setTool\('plainText'\)\}/);
  assert.match(tab, /id="btn-markset-set-scale"[\s\S]*?onClick=\{openSetScale\}/);
  assert.match(tab, /id="btn-markset-calibrate"[\s\S]*?onClick=\{startCalibrate\}/);
  assert.match(tab, /registerMarksetScaleTools\(\);/);
});

// Set Scale in feet (upstream divided by 12 instead of multiplying): fixed
// upstream in 2026.44 and covered by js/annotations/kalibratie-schaal.test.mjs.
