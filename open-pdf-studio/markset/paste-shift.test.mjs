import test from 'node:test';
import assert from 'node:assert/strict';
import { pasteShift } from './paste-shift.js';

test('the pasted outline is centred on the pointer', () => {
  assert.deepEqual(pasteShift([{ x: 100, y: 100, width: 50, height: 20 }], { x: 500, y: 300 }), { dx: 375, dy: 190 });
  // Several markups move together around their combined centre.
  const s = pasteShift([{ x: 0, y: 0, width: 10, height: 10 }, { x: 90, y: 40, width: 10, height: 10 }, null], { x: 50, y: 25 });
  assert.deepEqual(s, { dx: 0, dy: 0 });
});

test('no move off the page or without anything to place', () => {
  const dims = { widthPt: 2592, heightPt: 1728 };
  assert.equal(pasteShift([{ x: 0, y: 0, width: 1, height: 1 }], { x: -5, y: 10 }, dims), null);
  assert.equal(pasteShift([{ x: 0, y: 0, width: 1, height: 1 }], { x: 10, y: 2000 }, dims), null);
  assert.ok(pasteShift([{ x: 0, y: 0, width: 1, height: 1 }], { x: 10, y: 10 }, dims));
  assert.equal(pasteShift([], { x: 1, y: 1 }), null);
  assert.equal(pasteShift([{ x: 0, y: 0, width: 1, height: 1 }], null), null);
});
