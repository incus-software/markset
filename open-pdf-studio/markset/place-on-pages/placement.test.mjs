import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePageList, anchorShift, unionBounds, fitsOnSheet, planPlacement, nearestAnchor,
} from './placement.js';

const ARCH_D = { widthPt: 2592, heightPt: 1728 };
const ARCH_E = { widthPt: 3456, heightPt: 2592 };
const LETTER = { widthPt: 612, heightPt: 792 };

test('page lists', () => {
  assert.deepEqual(parsePageList('1-3, 5, 8-', 10), [1, 2, 3, 5, 8, 9, 10]);
  assert.deepEqual(parsePageList(' 4 ; 2 ;2', 5), [2, 4]);
  assert.deepEqual(parsePageList('-3', 9), [1, 2, 3]);
  assert.deepEqual(parsePageList('7-20', 9), [7, 8, 9]);
  assert.deepEqual(parsePageList('', 9), []);
  assert.equal(parsePageList('A-101', 9), null);
  assert.equal(parsePageList('5-2', 9), null);
  assert.equal(parsePageList('0', 9), null);
});

test('anchoring keeps the distance from the chosen corner', () => {
  assert.deepEqual(anchorShift(ARCH_D, ARCH_E, 'bottom-right'), { dx: 864, dy: 864 });
  assert.deepEqual(anchorShift(ARCH_D, ARCH_E, 'top-left'), { dx: 0, dy: 0 });
  assert.deepEqual(anchorShift(ARCH_D, ARCH_E, 'bottom-left'), { dx: 0, dy: 864 });
  assert.deepEqual(anchorShift(ARCH_D, ARCH_E, 'top-right'), { dx: 864, dy: 0 });
  assert.deepEqual(anchorShift(ARCH_D, ARCH_E, 'same'), { dx: 0, dy: 0 });
  assert.deepEqual(anchorShift(ARCH_D, ARCH_D, 'bottom-right'), { dx: 0, dy: 0 });
});

test('bounds and fit', () => {
  assert.deepEqual(unionBounds([{ x: 10, y: 20, width: 5, height: 5 }, null, { x: 0, y: 30, width: 2, height: 10 }]),
    { x: 0, y: 20, width: 15, height: 20 });
  assert.equal(unionBounds([]), null);
  const seal = { x: 2200, y: 1500, width: 144, height: 144 };
  assert.ok(fitsOnSheet(seal, ARCH_D));
  assert.ok(!fitsOnSheet(seal, LETTER));
});

test('a title-block seal lands in the title block of every sheet size', () => {
  // A 2" seal 1/2" from the right and bottom edges of an ARCH D sheet.
  const seal = { x: 2592 - 36 - 144, y: 1728 - 36 - 144, width: 144, height: 144 };
  const pageDims = { 1: ARCH_D, 2: ARCH_D, 3: ARCH_E, 4: LETTER };
  const { place, skipped } = planPlacement({ bounds: seal, sourcePage: 1, pages: [1, 2, 3, 4], pageDims, anchor: 'bottom-right' });
  assert.deepEqual(place, [{ page: 2, dx: 0, dy: 0 }, { page: 3, dx: 864, dy: 864 }, { page: 4, dx: -1980, dy: -936 }]);
  assert.deepEqual(skipped, []);
  // Same x/y on a letter page would fall off the sheet: skipped, not clipped.
  const same = planPlacement({ bounds: seal, sourcePage: 1, pages: [2, 4], pageDims, anchor: 'same' });
  assert.deepEqual(same.place.map((p) => p.page), [2]);
  assert.deepEqual(same.skipped, [4]);
  // Unknown page sizes are skipped rather than guessed.
  assert.deepEqual(planPlacement({ bounds: seal, sourcePage: 1, pages: [9], pageDims, anchor: 'bottom-right' }).skipped, [9]);
});

test('default anchor is the nearest corner', () => {
  assert.equal(nearestAnchor({ x: 2300, y: 1500, width: 100, height: 100 }, ARCH_D), 'bottom-right');
  assert.equal(nearestAnchor({ x: 50, y: 40, width: 100, height: 100 }, ARCH_D), 'top-left');
  assert.equal(nearestAnchor(null, ARCH_D), 'bottom-right');
});
