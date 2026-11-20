import { invalidateRenderDiagnostics } from './render-diagnostics.js';
/**
 * High-res page bitmap cache for sharp rendering at high zoom levels.
 *
 * Strategy: when the user zooms in, the vector renderer draws raster images
 * at their native source resolution and upsamples them, causing blur. To
 * match the sharpness of professional PDF viewers, we re-rasterize the
 * entire page via the Rust renderer at a zoom-appropriate DPI and use that
 * bitmap as the page background. The vector layer is then drawn on top so
 * text and lines stay vector-crisp.
 *
 * The cache is keyed by (filePath, pageNum, rotation, zoomBucket, line mode).
 * The line mode is Thin Lines on/off (#595): the same page at the same zoom is
 * a different picture with hairlines, and getters default to the current
 * preference, so a toggle never shows the other look and switching back is a
 * cache hit. Zoom
 * buckets are powers of 2 (1, 2, 4, 8, 16) of zoom*dpr — buckets bound
 * memory growth and limit re-renders to actually-different scales.
 */

import { isTauri, invoke } from '../core/platform.js';
import { pageSharpenLevel, sharpenRoute } from './render-sharpen-pref.js';
import { sharpenAmount } from './render-sharpen.js';
import { thinLinesKey, thinLinesOn } from './thin-lines.js';
import { RENDER_PRIORITY, isRenderCancelled, renderQueue } from './render-queue.js';
import { bitmapsToEvict, pickPreviewBitmap, roundRenderScale } from './zoom-render-plan.js';
import { rgbaToImageBitmap } from './rgba-bitmap.js';

// Map<key, { bitmap: ImageBitmap, w, h, scale }>
const _cache = new Map();

// In-flight renders so we don't double-fire for the same key
const _pending = new Map(); // key -> Promise
// Who still wants each in-flight render (see ensureExactBitmap): a render
// whose every requester has moved on is dropped from the render queue.
const _pendingWanted = new Map(); // key -> Set<() => boolean>

// Drop oldest entries above either limit. A whole-page bitmap of a 36" x 48"
// sheet at the 4096 px axis cap is 4096 x 3072 x 4 = 48 MB, so a count alone
// does not bound memory: twelve of those would be over half a gigabyte.
const MAX_ENTRIES = 12;
const MAX_BYTES = 320 * 1024 * 1024;

function _key(filePath, pageNum, rotation, zoomBucket, thin = thinLinesOn()) {
  return `${filePath}:${pageNum}:${(rotation || 0) % 360}:${zoomBucket}:${thinLinesKey(thin)}`;
}

/** De cachesleutel van een paginabitmap (zelfde als ensureBitmap gebruikt). */
export function bitmapSleutel(filePath, pageNum, rotation, zoomBucket, thin = thinLinesOn()) {
  return _key(filePath, pageNum, rotation, zoomBucket, thin);
}

// ── Getoonde bitmaps worden nooit gesloten ────────────────────────────────
// De cache deelt zijn bitmaps met wie ze tekent: de viewport houdt de
// getoonde bitmap vast (viewport.currentBitmap) en tekent hem elk frame. Werd
// die bij het verdringen of ongeldig maken gesloten, dan gaf elk frame
// "drawImage: the image source is detached" (#715: het tweede paneel van de
// gesplitste weergave vraagt bitmaps uit dezelfde cache en verdrong zo de
// getoonde). Wie bitmaps toont, meldt hier een bron die zegt welke dat nu
// zijn. Zo'n bitmap blijft bij verdringen in de cache staan; moet hij er toch
// uit (ongeldig, document dicht), dan gaat hij pas dicht als niemand hem meer
// toont (ruimUitgesteldOp).
const _getoondBronnen = new Set();
// Bitmaps die uit de cache zijn maar nog getoond werden toen ze eruit gingen.
const _uitgesteld = new Set();
// Sleutels die een eigenaar nu nodig heeft (het tweede paneel): niet
// verdringen, anders vraagt hij ze meteen opnieuw aan (renderlus).
const _claims = new Map(); // eigenaar -> Set<key>

/**
 * Meld een bron van getoonde bitmaps: een functie die de bitmaps teruggeeft
 * die nu op het scherm staan (null/undefined mag). Geeft een afmeldfunctie.
 */
export function registreerGetoondeBitmaps(bron) {
  if (typeof bron !== 'function') return () => {};
  _getoondBronnen.add(bron);
  return () => { _getoondBronnen.delete(bron); };
}

/**
 * Leg vast welke cachesleutels `eigenaar` nu nodig heeft (vervangt de vorige
 * set; een lege lijst laat alles los). Geclaimde entries worden niet verdrongen.
 */
export function claimBitmaps(eigenaar, sleutels) {
  const set = new Set((sleutels || []).filter(Boolean));
  if (set.size) _claims.set(eigenaar, set);
  else _claims.delete(eigenaar);
}

function _getoond() {
  const set = new Set();
  for (const bron of _getoondBronnen) {
    let lijst = null;
    try { lijst = bron(); } catch { lijst = null; }
    if (!lijst) continue;
    for (const b of lijst) if (b) set.add(b);
  }
  return set;
}

function _geclaimd(key) {
  for (const set of _claims.values()) if (set.has(key)) return true;
  return false;
}

function _sluitNu(bitmap) {
  try { bitmap && bitmap.close && bitmap.close(); } catch {}
}

// Sluit een bitmap die uit de cache gaat, behalve als hij nog getoond wordt:
// die gaat dicht zodra niemand hem meer toont.
function _sluit(bitmap, getoond) {
  if (!bitmap) return;
  if (getoond.has(bitmap)) { _uitgesteld.add(bitmap); return; }
  _sluitNu(bitmap);
}

/** Sluit de uit de cache gehaalde bitmaps die nu niet meer getoond worden. */
export function ruimUitgesteldOp() {
  if (!_uitgesteld.size) return;
  const getoond = _getoond();
  for (const b of Array.from(_uitgesteld)) {
    if (getoond.has(b)) continue;
    _uitgesteld.delete(b);
    // Kwam hij intussen weer in de cache (zelfde object)? Dan niet sluiten.
    let inCache = false;
    for (const e of _cache.values()) if (e.bitmap === b) { inCache = true; break; }
    if (!inCache) _sluitNu(b);
  }
}

// Compute the zoom bucket (power of 2) to render at, given a target scale.
// We round UP to the next power of 2 so we always have at least the requested
// resolution.
//
// For WHOLE-PAGE bitmaps the caller caps targetScale at MAX_BITMAP_AXIS_PX
// / maxAxisPt before invoking (see bitmap-orchestrator.js:51), so this can
// never produce a bucket large enough to blow the 4096 px PDFium cap.
//
// For TILE bitmaps the caller passes viewport.zoom * dpr unbounded. Here
// the bucket can grow with zoom — but the tile bitmap pixel size is bounded
// by the VISIBLE viewport region (typically 600-1000 px on each axis at
// css scale), so even at bucket=64 the tile stays well under PDFium's limit.
//
// Before this change the bucket was capped at 16, which meant every zoom
// above 8x shared the same cache key. The first tile rendered at that
// bucket "owned" it; subsequent zooms within the bucket got the SAME
// (lower-zoom) tile drawn stretched at higher css zoom — the user
// reported this as "zoom > 600% suddenly picks a worse-resolution tile".
export function computeZoomBucket(targetScale) {
  if (!Number.isFinite(targetScale) || targetScale <= 0) return 0.125;
  // ─── SUB-1 BUCKETS (huge-page first-paint speedup) ─────────────────────
  // Without these the orchestrator always renders at scale=1.0 for any
  // zoom ≤ 1.0, which on a 5156×2384 pt construction page = 5157×2384 px
  // bitmap = 46 MB and 3+ s of PDFium CPU. At fit-zoom (~0.13) the user
  // is only displaying a 1005×465 px viewport — rendering at scale=0.25
  // gives a 1289×596 px bitmap that downsamples crisply, while saving
  // 500-1000 ms PDFium time and ~95 % of memory per cached bitmap.
  if (targetScale <= 0.125) return 0.125;
  if (targetScale <= 0.25) return 0.25;
  if (targetScale <= 0.5) return 0.5;
  if (targetScale <= 1) return 1;
  if (targetScale <= 2) return 2;
  if (targetScale <= 4) return 4;
  if (targetScale <= 8) return 8;
  if (targetScale <= 16) return 16;
  if (targetScale <= 32) return 32;
  if (targetScale <= 64) return 64;
  return 128;
}

export function getCachedBitmap(filePath, pageNum, rotation, zoomBucket, thin = thinLinesOn()) {
  const entry = _cache.get(_key(filePath, pageNum, rotation, zoomBucket, thin));
  return entry || null;
}

/**
 * Zet een EXTERN gebouwde bitmap (bv. de progressieve accumulator) in de cache
 * onder dezelfde key als ensureBitmap, zodat zoom/pan/re-visit op deze pagina
 * cache-hits blijven (getBestAvailableBitmap vindt hem net als een normale
 * whole-page render). Sluit een eventuele vorige bitmap onder deze key.
 * `thin` = de lijnstand (Thin Lines, #595) waarin de bitmap gerenderd is.
 */
export function setCachedBitmapEntry(filePath, pageNum, rotation, zoomBucket, bitmap, w, h, scale, thin = thinLinesOn()) {
  const key = _key(filePath, pageNum, rotation, zoomBucket, thin);
  const prev = _cache.get(key);
  if (prev && prev.bitmap && prev.bitmap !== bitmap) {
    _sluit(prev.bitmap, _getoond());
  }
  _cache.set(key, { bitmap, w, h, scale });
  _evictIfNeeded(key);
}

// Find the best available cached bitmap for a target bucket: prefer exact
// match, otherwise the nearest available bucket (lower preferred for speed,
// higher acceptable as fallback during downscale). Only bitmaps of the given
// line mode (Thin Lines, #595) count.
export function getBestAvailableBitmap(filePath, pageNum, rotation, targetBucket, thin = thinLinesOn()) {
  const exact = getCachedBitmap(filePath, pageNum, rotation, targetBucket, thin);
  if (exact) return exact;
  return getBestBitmapForScale(filePath, pageNum, rotation, targetBucket, thin);
}

/**
 * The best stand-in for a page at `targetScale` among EVERY cached bitmap of
 * it (power-of-two buckets, exact-scale renders, progressive results): the
 * smallest one that is sharp enough, else the sharpest. Searching only the
 * power-of-two keys missed the exact renders, so after zooming from fit the
 * page was shown at the fit bitmap's resolution (10 % of what the screen
 * needed on a 48" sheet) until the new render landed.
 */
export function getBestBitmapForScale(filePath, pageNum, rotation, targetScale, thin = thinLinesOn()) {
  const prefix = `${filePath}:${pageNum}:${(rotation || 0) % 360}:`;
  const suffix = `:${thinLinesKey(thin)}`;
  const kandidaten = [];
  for (const [k, e] of _cache) {
    if (k.startsWith(prefix) && k.endsWith(suffix) && e && e.bitmap) kandidaten.push(e);
  }
  return pickPreviewBitmap(kandidaten, targetScale) || null;
}

/** Is the whole page cached at exactly this render scale? */
export function hasExactBitmap(filePath, pageNum, rotation, exactScale, thin = thinLinesOn()) {
  return _cache.has(_key(filePath, pageNum, rotation, roundRenderScale(exactScale), thin));
}

// Verdring de oudste entries (Map houdt de invoegvolgorde) tot er weer
// hooguit MAX_ENTRIES zijn en ze samen binnen MAX_BYTES passen. Nooit: een
// getoonde bitmap, een geclaimde sleutel of de entry die net is toegevoegd
// (`nieuw`; de aanvrager zet hem zo meteen op het scherm). Zijn er alleen
// zulke entries, dan mag de cache tijdelijk groter zijn.
function _evictIfNeeded(nieuw = null) {
  ruimUitgesteldOp();
  const getoond = _getoond();
  const weg = bitmapsToEvict(Array.from(_cache.entries()), {
    maxEntries: MAX_ENTRIES,
    maxBytes: MAX_BYTES,
    keep: (k) => {
      if (k === nieuw || _geclaimd(k)) return true;
      const e = _cache.get(k);
      return !!(e && getoond.has(e.bitmap));
    },
  });
  for (const k of weg) {
    const e = _cache.get(k);
    _cache.delete(k);
    _sluitNu(e && e.bitmap);
  }
}

/**
 * Trigger an async render for the given key. Returns the existing promise if
 * one is already in flight. Resolves to the cached entry (or null on failure).
 */
export function ensureBitmap(filePath, pageNum, rotation, zoomBucket) {
  return _ensureBitmapAtScale(filePath, pageNum, rotation, zoomBucket, zoomBucket, RENDER_PRIORITY.PAGE);
}

/**
 * Sharpness "settle" upgrade: render at the EXACT zoom*dpr the screen needs,
 * instead of the next power-of-2 bucket above it. computeZoomBucket() rounds
 * UP so PDFium always has at least enough resolution, but that means the
 * whole-page bitmap is almost never a 1:1 pixel match for the destination
 * rect — drawImage() in pdf-viewport.js then resamples it down to fit,
 * softening text at every zoom that doesn't land exactly on a bucket
 * boundary (100%, 200%, 400% @ 2x DPR; off-bucket levels like 150% get the
 * blur). Cached under the rounded exact scale so repeated settles at the
 * same zoom hit the cache instead of re-rendering.
 *
 * `isWanted` (optional) returns false once the caller has moved on (the user
 * zoomed again): a render nobody wants any more is dropped from the render
 * queue before it starts. One that already started is still cached.
 */
export function ensureExactBitmap(filePath, pageNum, rotation, exactScale, { isWanted = null } = {}) {
  const roundedScale = roundRenderScale(exactScale);
  return _ensureBitmapAtScale(filePath, pageNum, rotation, roundedScale, roundedScale, RENDER_PRIORITY.TILE, isWanted);
}

/**
 * Background prefetch: render a small fallback bitmap and cache it under
 * `cacheBucket` so getBestAvailableBitmap finds it as a stretched fallback
 * on first user navigation. Intended for tile-classified pages where the
 * cold PDFium render at full scale=1.0 produces a 50+ MB bitmap (NKD1a's
 * construction drawings). Renders at `prefetchScale` (typically 0.25–0.5)
 * for a much smaller bitmap, cached under `cacheBucket=1` so any later
 * targetBucket finds it via the proximity-sort search.
 */
export function prefetchFallbackBitmap(filePath, pageNum, rotation, prefetchScale) {
  return _ensureBitmapAtScale(filePath, pageNum, rotation, 1, prefetchScale, RENDER_PRIORITY.PREFETCH);
}

function _ensureBitmapAtScale(filePath, pageNum, rotation, cacheBucket, renderScale, priority, isWanted = null) {
  // Line mode captured once: the render and the cache key must agree even if
  // the user switches Thin Lines while this render is in flight.
  const thin = thinLinesOn();
  const key = _key(filePath, pageNum, rotation, cacheBucket, thin);
  if (_cache.has(key)) return Promise.resolve(_cache.get(key));
  // A render in flight serves every requester; it stays wanted while any of
  // them still wants it (a requester without isWanted always does).
  const wanted = typeof isWanted === 'function' ? isWanted : () => true;
  if (_pending.has(key)) {
    _pendingWanted.get(key)?.add(wanted);
    return _pending.get(key);
  }
  if (!isTauri() || !filePath) return Promise.resolve(null);
  const wantedBy = new Set([wanted]);
  _pendingWanted.set(key, wantedBy);
  const stillWanted = () => {
    for (const f of wantedBy) {
      try { if (f() !== false) return true; } catch { return true; }
    }
    return false;
  };

  // Closing the document empties this cache; a render that lands after that
  // must not put its bitmap back (#506).
  const docEpoch = renderQueue.documentEpoch(filePath);
  const p = (async () => {
    try {
      // PERF FIX #3: Rust now returns RGBA bytes directly via tauri::ipc::Response.
      // Wire format: [width u32 LE][height u32 LE][rgba bytes...]. No tempfile.
      //
      // Engine selection routed through engine-router so every whole-page
      // render path (here, loader cold-open preview, renderer.js direct
      // calls) honors the same state.renderEngineOverride consistently.
      const { renderPdfPage } = await import('./engine-router.js');
      const _t0 = performance.now();
      console.log(`[pbc] whole-page START p${pageNum} scale=${renderScale.toFixed(3)}`);
      const result = await renderPdfPage({
        path: filePath,
        pageIndex: pageNum - 1,
        scale: renderScale,
        rotation: rotation || 0,
        thinLines: thin,
        sharpen: true,
      }, { priority, isWanted: stillWanted });
      console.log(`[pbc] whole-page KLAAR p${pageNum} scale=${renderScale.toFixed(3)} @${Math.round(performance.now() - _t0)}ms`);
      const fileBytes = result instanceof Uint8Array ? result : new Uint8Array(result);
      if (!fileBytes || fileBytes.length <= 8) return null;
      const header = new DataView(fileBytes.buffer, fileBytes.byteOffset, 8);
      const w = header.getUint32(0, true);
      const h = header.getUint32(4, true);
      const expected = w * h * 4;
      if (expected !== fileBytes.length - 8) {
        console.warn('[page-bitmap-cache] size mismatch', expected, fileBytes.length - 8);
        return null;
      }
      const _t1 = performance.now();
      // The bitmap is built off the main thread for big renders
      // (rgba-bitmap.js). Rust sharpens on the desktop PDFium route
      // (render-sharpen-route.js); only when it did not (another engine, the
      // in-process fallback) does the worker apply the page-sharpen filter.
      const sharpen = sharpenRoute().isVerscherpt(fileBytes) ? 0 : sharpenAmount(pageSharpenLevel());
      const bitmap = await rgbaToImageBitmap(fileBytes, w, h, { sharpen });
      console.log(`[pbc] whole-page BITMAP p${pageNum} ${w}x${h} @${Math.round(performance.now() - _t1)}ms`);
      if (renderQueue.documentEpoch(filePath) !== docEpoch) {
        try { bitmap.close?.(); } catch { /* already gone */ }
        return null;
      }
      import('../solid/stores/engineStatusStore.js')
        .then((m) => m.reportActiveEngine('pdfium', filePath, pageNum))
        .catch(() => {});
      const entry = { bitmap, w, h, scale: renderScale };
      _cache.set(key, entry);
      _evictIfNeeded(key);
      return entry;
    } catch (e) {
      // A render dropped because its document closed or is no longer shown
      // (#506) is not a failure; nothing is cached for it.
      if (!isRenderCancelled(e)) console.warn('[page-bitmap-cache] render failed', e);
      return null;
    } finally {
      _pending.delete(key);
      _pendingWanted.delete(key);
    }
  })();
  _pending.set(key, p);
  return p;
}

/// Drop ALL bitmap entries for a specific (filePath, pageNum). Use when page
/// content changes (e.g. annotations saved into the PDF stream).
export function invalidatePageBitmaps(filePath, pageNum) {
  invalidateRenderDiagnostics(filePath, pageNum);
  _verwijderMetPrefix(`${filePath}:${pageNum}:`);
}

// Entries weg; een bitmap die nog getoond wordt gaat pas later dicht (de
// viewport tekent hem tot de vervanger er is).
function _verwijderMetPrefix(prefix) {
  const getoond = _getoond();
  for (const k of Array.from(_cache.keys())) {
    if (prefix === null || k.startsWith(prefix)) {
      const e = _cache.get(k);
      _cache.delete(k);
      _sluit(e && e.bitmap, getoond);
    }
  }
}

/// Alle bitmaps van één document weg (tabblad gesloten).
export function invalidateDocumentBitmaps(filePath) {
  invalidateRenderDiagnostics(filePath);
  _verwijderMetPrefix(`${filePath}:`);
}

export function clearAllBitmaps() {
  invalidateRenderDiagnostics();
  _verwijderMetPrefix(null);
  _pending.clear();
  _pendingWanted.clear();
}
