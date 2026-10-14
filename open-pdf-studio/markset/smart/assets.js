// Markset: images in a smart symbol's params (a review stamp's logo, a seal's
// signature) are stored ONCE per PDF, however many symbols use them, and a
// symbol keeps a frozen copy of what it drew, so a copy of Markset without
// the symbol's template (an add-on's, say) still shows it.
//
//  - Saving: each param holding a PNG/JPEG data URL becomes one shared stream
//    per PDF of the original bytes, listed in the annotation's
//    OPS_MarksetAssets dictionary (param key -> stream), and the param says
//    "markset-asset:<key>" instead of the data URL.
//  - Opening: the streams are read back into the data URLs.
//  - OPS_Frozen: the template's draw commands at save time, relative to the
//    symbol's box, with images that come from a param written as the same
//    "markset-asset:<key>" reference. Drawn read-only when the template is
//    not available (rendering.js).
//
// Files saved by earlier test builds keep working: their stamp logo is in
// OPS_MarksetLogo, and older ones hold the data URL in OPS_Params.
// Pure: runs under `node --test`.

export const ASSET_PREFIX = 'markset-asset:';
const DATA_URL = /^data:image\/(png|jpe?g);base64,(.+)$/i;
const MAX_FROZEN = 500_000; // characters of OPS_Frozen JSON
const shared = new WeakMap(); // pdf-lib document -> Map(data URL -> stream ref)

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

/** The keys of `params` that hold an image data URL. */
export function assetKeys(params) {
  return Object.keys(params || {}).filter(k => DATA_URL.test(String(params[k] ?? '')));
}

/**
 * Params to write for annotation `ann`, plus extra annotation keys: every
 * image param becomes a reference to one shared stream (OPS_MarksetAssets).
 * Without image params: the params unchanged and no extra keys.
 */
export function smartParamsForSave(ann, pdfDoc) {
  const params = ann?.params || {};
  const keys = assetKeys(params);
  if (!keys.length || !pdfDoc?.context) return { params, extra: {} };
  let byUrl = shared.get(pdfDoc);
  if (!byUrl) shared.set(pdfDoc, (byUrl = new Map()));
  const out = { ...params };
  const refs = {};
  for (const k of keys) {
    let ref = byUrl.get(params[k]);
    if (!ref) {
      const m = DATA_URL.exec(params[k]);
      const kind = m[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
      ref = pdfDoc.context.register(pdfDoc.context.stream(base64ToBytes(m[2]), { OPS_ImageType: kind }));
      byUrl.set(params[k], ref);
    }
    refs[k] = ref;
    out[k] = ASSET_PREFIX + k;
  }
  return { params: out, extra: { OPS_MarksetAssets: pdfDoc.context.obj(refs) } };
}

/** The data URL in a shared asset stream, or undefined. */
export function readAssetStream(context, raw, PDFName) {
  try {
    const stream = context.lookup(raw) || raw;
    const bytes = typeof stream?.getContents === 'function' ? stream.getContents() : stream?.contents;
    if (!bytes?.length) return undefined;
    const type = String(stream.dict?.get(PDFName.of('OPS_ImageType')) || '').replace(/^\//, '');
    return `data:image/${type === 'jpeg' ? 'jpeg' : 'png'};base64,${bytesToBase64(bytes)}`;
  } catch { return undefined; }
}

/**
 * The assets of an annotation dictionary as { key: dataUrl }: its
 * OPS_MarksetAssets, plus the older OPS_MarksetLogo as `logo`.
 */
export function readSmartAssets(annotDict, context, PDFName) {
  const out = {};
  const dictRaw = annotDict.get(PDFName.of('OPS_MarksetAssets'));
  const dict = dictRaw && (context.lookup(dictRaw) || dictRaw);
  if (dict && typeof dict.entries === 'function') {
    for (const [name, ref] of dict.entries()) {
      const url = readAssetStream(context, ref, PDFName);
      if (url) out[String(name).replace(/^\//, '')] = url;
    }
  }
  const logoRaw = annotDict.get(PDFName.of('OPS_MarksetLogo'));
  if (logoRaw && !out.logo) {
    const url = readAssetStream(context, logoRaw, PDFName);
    if (url) out.logo = url;
  }
  return out;
}

const restoreValue = (v, assets) =>
  typeof v === 'string' && v.startsWith(ASSET_PREFIX) ? (assets?.[v.slice(ASSET_PREFIX.length)] || '') : v;

/** Params as loaded: each asset reference replaced by its image. */
export function restoreSmartParams(params, assets) {
  if (!params || typeof params !== 'object') return params;
  let out = params;
  for (const [k, v] of Object.entries(params)) {
    const r = restoreValue(v, assets);
    if (r !== v) { if (out === params) out = { ...params }; out[k] = r; }
  }
  return out;
}

// --- Frozen draw commands ---------------------------------------------------

const X_KEYS = ['x', 'x1', 'x2', 'cx'];
const Y_KEYS = ['y', 'y1', 'y2', 'cy'];

function mapCmd(c, fx, fy, fs) {
  const o = { ...c };
  for (const k of X_KEYS) if (typeof o[k] === 'number') o[k] = fx(o[k]);
  for (const k of Y_KEYS) if (typeof o[k] === 'number') o[k] = fy(o[k]);
  const pt = (p) => ({ ...p, x: fx(p.x), y: fy(p.y) });
  if (Array.isArray(o.points)) o.points = o.points.map(pt);
  if (Array.isArray(o.loop)) o.loop = o.loop.map(pt);
  if (Array.isArray(o.loops)) o.loops = o.loops.map(l => (Array.isArray(l) ? l.map(pt) : l));
  for (const k of ['width', 'height', 'r', 'size']) if (typeof o[k] === 'number') o[k] = fs(k, o[k]);
  return o;
}

/**
 * A template's commands frozen for OPS_Frozen: relative to `box`, image
 * sources that equal a param written as asset references. Null when there is
 * nothing to keep or it is too large.
 */
export function freezeCmds(cmds, box, params) {
  if (!Array.isArray(cmds) || !cmds.length || !(box?.width > 0) || !(box?.height > 0)) return null;
  const byUrl = new Map(assetKeys(params).map(k => [params[k], ASSET_PREFIX + k]));
  const out = [];
  for (const c of cmds) {
    if (!c || typeof c.kind !== 'string') continue;
    const o = mapCmd(c, x => x - box.x, y => y - box.y, (k, v) => v);
    if (o.kind === 'image') {
      if (byUrl.has(o.src)) o.src = byUrl.get(o.src);
      else if (String(o.src || '').length > 100_000) continue; // not a param: too big to repeat
    }
    out.push(o);
  }
  if (!out.length) return null;
  const frozen = { w: box.width, h: box.height, cmds: out };
  return JSON.stringify(frozen).length <= MAX_FROZEN ? frozen : null;
}

/** Parse OPS_Frozen text; null unless it has the expected shape. */
export function parseFrozen(text) {
  if (typeof text !== 'string' || !text || text.length > MAX_FROZEN) return null;
  try {
    const f = JSON.parse(text);
    return f && f.w > 0 && f.h > 0 && Array.isArray(f.cmds) ? f : null;
  } catch { return null; }
}

/** Frozen commands drawn into `box` (scaled if its size changed), with asset images restored. */
export function thawCmds(frozen, box, params) {
  if (!frozen?.cmds || !(box?.width > 0) || !(box?.height > 0)) return [];
  const sx = box.width / frozen.w, sy = box.height / frozen.h;
  const s = Math.min(sx, sy);
  const fs = (k, v) => (k === 'width' ? v * sx : k === 'height' ? v * sy : v * s);
  return frozen.cmds.map(c => {
    const o = mapCmd(c, x => box.x + x * sx, y => box.y + y * sy, fs);
    if (o.kind === 'image') o.src = restoreValue(o.src, params);
    return o;
  });
}

/** A read-only stand-in template that draws an annotation's frozen commands. */
const stand = new WeakMap();
export function frozenTemplate(annotation) {
  const f = annotation?.frozen;
  if (!f || typeof f !== 'object') return null;
  let t = stand.get(f);
  if (!t) {
    t = { id: annotation.symbolId, frozen: true, markset: {}, params: [], render: (p, box) => thawCmds(f, box, p) };
    stand.set(f, t);
  }
  return t;
}
