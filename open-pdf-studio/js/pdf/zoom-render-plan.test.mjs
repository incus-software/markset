// Zooming on a 36" x 48" sheet (3456 x 2592 pt): what to render and what to
// show meanwhile (zoom-render-plan.js), the render queue dropping renders of a
// zoom level the user already left, and the page-bitmap cache finding the
// sharpest stand-in and staying within its memory budget.

import assert from 'node:assert/strict';
import test from 'node:test';
import { register } from 'node:module';

import {
  bitmapsToEvict,
  needsRegionTile,
  pickPreviewBitmap,
  roundRenderScale,
  wholePageRenderScale,
} from './zoom-render-plan.js';
import { RENDER_PRIORITY, createRenderQueue, isRenderCancelled } from './render-queue.js';

register('../core/app-test-hooks.mjs', import.meta.url);
const { installeerBrowserStubs } = await import('../core/app-test-hooks.mjs');
installeerBrowserStubs();
const pbc = await import('./page-bitmap-cache.js');

const SHEET = { pageWpt: 3456, pageHpt: 2592 }; // 48" x 36"
const CAP = 4096;
const capScale = CAP / 3456;

test('whole page renders at the scale the screen needs, never above the 4096 px axis', () => {
  const s = wholePageRenderScale({ zoom: 0.5, devicePixelRatio: 1.5, ...SHEET, maxAxisPx: CAP });
  assert.equal(s, 0.75);
  // At 115 % the old power-of-two bucket was 2: a 6912 x 5184 px bitmap.
  assert.equal(wholePageRenderScale({ zoom: 1.146, devicePixelRatio: 1, ...SHEET, maxAxisPx: CAP }), 1.146);
  const capped = wholePageRenderScale({ zoom: 1.5, devicePixelRatio: 1, ...SHEET, maxAxisPx: CAP });
  assert.equal(capped, roundRenderScale(capScale));
  assert.ok(Math.ceil(3456 * capped) <= CAP + 1, 'long axis within the cap');
  // Far above the cap it stays at the cap.
  assert.equal(wholePageRenderScale({ zoom: 12, devicePixelRatio: 2, ...SHEET, maxAxisPx: CAP }), roundRenderScale(capScale));
  assert.equal(wholePageRenderScale({ zoom: 0, devicePixelRatio: 1, ...SHEET }), 0);
  assert.equal(wholePageRenderScale({ zoom: 1, devicePixelRatio: 1, pageWpt: 0, pageHpt: 0 }), 0);
});

test('the preview is the smallest bitmap that is sharp enough, else the sharpest', () => {
  const fit = { scale: 0.125 };
  const half = { scale: 0.5 };
  const exact = { scale: 1.146 };
  const cap = { scale: 1.185 };
  assert.equal(pickPreviewBitmap([fit, half, exact, cap], 1.146), exact);
  assert.equal(pickPreviewBitmap([fit, half, cap], 1.146), cap, 'a sharper one beats a coarser one');
  assert.equal(pickPreviewBitmap([fit, half], 1.146), half, 'nothing sharp enough: the sharpest there is');
  assert.equal(pickPreviewBitmap([fit, half, exact], 0.3), half, 'zooming out: not the big one');
  const almost = { scale: 0.99 };
  assert.equal(pickPreviewBitmap([almost, { scale: 2 }], 1), almost, 'within 2 % counts as sharp enough');
  assert.equal(pickPreviewBitmap([], 1), null);
  assert.equal(pickPreviewBitmap([{ scale: 0 }, null], 1), null);
});

test('the visible region renders first when the whole page would be far bigger than the screen', () => {
  const view = { viewWcss: 1280, viewHcss: 800 };
  // Above the cap: always a tile.
  assert.equal(needsRegionTile({ zoom: 2, devicePixelRatio: 1, ...SHEET, ...view, wholePageReady: true }), true);
  // 115 % on a 48" sheet: 3961 x 2971 px whole page vs a 1280 x 800 screen.
  assert.equal(needsRegionTile({ zoom: 1.146, devicePixelRatio: 1, ...SHEET, ...view, wholePageReady: false }), true);
  // Once the whole page at this zoom is cached, the tile is not needed.
  assert.equal(needsRegionTile({ zoom: 1.146, devicePixelRatio: 1, ...SHEET, ...view, wholePageReady: true }), false);
  // Fit zoom: the page is about the size of the screen, no tile.
  assert.equal(needsRegionTile({ zoom: 0.3, devicePixelRatio: 1, ...SHEET, ...view, wholePageReady: false }), false);
  // A letter page at 100 %: smaller than the screen, never a tile.
  assert.equal(needsRegionTile({ zoom: 1, devicePixelRatio: 1, pageWpt: 612, pageHpt: 792, ...view, wholePageReady: false }), false);
  // dpr counts on both sides: 75 % at dpr 2 is above the cap for this sheet.
  assert.equal(needsRegionTile({ zoom: 0.75, devicePixelRatio: 2, ...SHEET, ...view, wholePageReady: true }), true);
});

test('eviction drops the oldest unprotected entries until count and bytes both fit', () => {
  const mb48 = { w: 4096, h: 3072 }; // 48 MiB
  const small = { w: 100, h: 100 };
  const entries = [['a', mb48], ['b', mb48], ['c', small], ['d', mb48], ['e', mb48]];
  assert.deepEqual(bitmapsToEvict(entries, { maxEntries: 12, maxBytes: 100 * 1024 * 1024 }), ['a', 'b']);
  assert.deepEqual(bitmapsToEvict(entries, { maxEntries: 3, maxBytes: Infinity }), ['a', 'b']);
  assert.deepEqual(
    bitmapsToEvict(entries, { maxEntries: 12, maxBytes: 100 * 1024 * 1024, keep: (k) => k === 'a' }),
    ['b', 'c', 'd'],
    'a protected entry is skipped, the next ones go instead',
  );
  assert.deepEqual(bitmapsToEvict(entries, { maxEntries: 12, maxBytes: 0, keep: () => true }), [], 'all protected: none');
});

// ── Render queue: withdrawn requests ──────────────────────────────────────

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test('a queued render the caller no longer wants never starts', async () => {
  const q = createRenderQueue({ maxInFlight: 1, foregroundReserve: 0 });
  const started = [];
  const finishers = [];
  const job = (label) => () => new Promise((resolve) => { started.push(label); finishers.push(() => resolve(label)); });
  const blocker = q.schedule(job('blocker'), { priority: RENDER_PRIORITY.TILE });
  let zoomGen = 1;
  const gen1 = zoomGen;
  const stale = q.schedule(job('zoom 1'), { priority: RENDER_PRIORITY.TILE, isWanted: () => zoomGen === gen1 });
  zoomGen = 2; // the user zoomed again
  const fresh = q.schedule(job('zoom 2'), { priority: RENDER_PRIORITY.TILE, isWanted: () => zoomGen === 2 });
  await flush();
  finishers[0]();
  assert.equal(await blocker, 'blocker');
  await assert.rejects(stale, (e) => isRenderCancelled(e));
  await flush();
  assert.deepEqual(started, ['blocker', 'zoom 2'], 'the stale zoom level was skipped');
  finishers[1]();
  assert.equal(await fresh, 'zoom 2');
});

test('a render that already started is still delivered, so it can be cached', async () => {
  const q = createRenderQueue();
  let wanted = true;
  let finish;
  const freed = [];
  const p = q.schedule(() => new Promise((r) => { finish = r; }), {
    isWanted: () => wanted,
    dispose: (v) => freed.push(v),
  });
  await flush();
  wanted = false;
  finish('bytes');
  assert.equal(await p, 'bytes');
  assert.deepEqual(freed, []);
});

test('without isWanted nothing changes', async () => {
  const q = createRenderQueue();
  assert.equal(await q.schedule(() => Promise.resolve(7)), 7);
});

// ── Page-bitmap cache: stand-in and budget ────────────────────────────────

function bitmap(w, h) {
  return { width: w, height: h, gesloten: false, close() { this.gesloten = true; this.width = 0; this.height = 0; } };
}
function zet(pad, pagina, scale, w = Math.round(3456 * scale), h = Math.round(2592 * scale)) {
  const b = bitmap(w, h);
  pbc.setCachedBitmapEntry(pad, pagina, 0, scale, b, w, h, scale);
  return b;
}
function schoon() {
  pbc.clearAllBitmaps();
  pbc.ruimUitgesteldOp();
}

test('the cache finds exact-scale renders as a stand-in, not only power-of-two buckets', () => {
  schoon();
  const fit = zet('blad.pdf', 1, 0.125);
  const exact = zet('blad.pdf', 1, 1.146);
  zet('ander.pdf', 1, 1.185);
  assert.equal(pbc.getBestBitmapForScale('blad.pdf', 1, 0, 1.146)?.bitmap, exact);
  assert.equal(pbc.getBestAvailableBitmap('blad.pdf', 1, 0, 2)?.bitmap, exact, 'bucket lookups see it too');
  assert.equal(pbc.getBestBitmapForScale('blad.pdf', 1, 0, 0.1)?.bitmap, fit);
  assert.equal(pbc.getBestBitmapForScale('blad.pdf', 2, 0, 1), null, 'another page has nothing');
  assert.equal(pbc.getBestBitmapForScale('blad.pdf', 1, 90, 1), null, 'another rotation has nothing');
  assert.equal(pbc.hasExactBitmap('blad.pdf', 1, 0, 1.14600001), true);
  assert.equal(pbc.hasExactBitmap('blad.pdf', 1, 0, 1.185), false);
});

test('the bitmap cache stays within its byte budget with full-size sheet renders', () => {
  schoon();
  const bitmaps = [];
  // Twelve 4096 x 3072 renders (48 MiB each) used to all stay: 576 MiB.
  for (let p = 1; p <= 12; p++) bitmaps.push(zet('blad.pdf', p, capScale, 4096, 3072));
  const open = bitmaps.filter((b) => !b.gesloten);
  assert.ok(open.length * 48 <= 320, `at most 320 MiB stays open, now ${open.length * 48} MiB`);
  assert.equal(bitmaps.at(-1).gesloten, false, 'the newest stays');
  assert.equal(bitmaps[0].gesloten, true, 'the oldest went first');
  schoon();
});
