// Markset: optional callbacks a smart (parametric) template can give in its
// `markset` object, so the core needs no code for a particular symbol and a
// plugin's template (api.registerParametricTemplate) gets the same behaviour
// as a bundled one. All are optional:
//
//   contentSize(params) -> {width, height}
//       True printed size in points. The symbol is placed at it, and after
//       its params change its height follows the content at its width.
//   colors(params) -> {color, strokeColor} | null
//       Colours for a newly placed symbol.
//   toggleAt(params, box, x, y) -> {params, key} | null
//       A click at (x, y) (unrotated, page units) that changes the symbol in
//       place, e.g. checking a box. `key` names what was hit, so the click and
//       the double-click right after it toggle once.
//   editHitAt(params, box, x, y) -> boolean
//       True when a click there edits in place instead of starting a move.
//   propertiesPanel(el, {params, setParam}) -> cleanup | undefined
//       Renders the symbol's own Properties section into `el` (plain DOM)
//       instead of one field per param. `params()` reads the live params,
//       `setParam(key, value)` writes one.
//
// Pure: runs under `node --test`.

const hooks = (t) => (t && typeof t.markset === 'object' && t.markset) || null;
const fn = (t, name) => (typeof hooks(t)?.[name] === 'function' ? hooks(t)[name] : null);

/** The template's printed size for `params`, or null. */
export function contentSize(t, params) {
  const f = fn(t, 'contentSize');
  if (!f) return null;
  try {
    const s = f(params || {});
    return s && s.width > 0 && s.height > 0 ? { width: s.width, height: s.height } : null;
  } catch { return null; }
}

/**
 * After a placed symbol's params change: keep its width (and so any scale
 * the user gave it) and set the height from the new content, around the
 * centre. Leaves symbols without contentSize alone.
 */
export function fitToContent(ann, t) {
  if (ann?.type !== 'parametricSymbol' || !(ann.width > 0)) return;
  const s = contentSize(t, ann.params);
  if (!s) return;
  const h = ann.width * (s.height / s.width);
  if (!(h > 0) || Math.abs(h - ann.height) < 0.01) return;
  ann.y += (ann.height - h) / 2;
  ann.height = h;
}

/** Colour overrides from the template, or null. */
export function templateColors(t, params) {
  const f = fn(t, 'colors');
  if (!f) return null;
  try {
    const c = f(params || {});
    return c && typeof c === 'object' ? c : null;
  } catch { return null; }
}

/** {params, key} for a click that toggles something in place, or null. */
export function toggleAt(t, params, box, x, y) {
  const f = fn(t, 'toggleAt');
  if (!f) return null;
  try {
    const r = f(params || {}, box, x, y);
    return r && r.params && typeof r.params === 'object' ? { params: r.params, key: String(r.key ?? '') } : null;
  } catch { return null; }
}

/** True when a click at (x, y) edits the symbol in place. */
export function editHitAt(t, params, box, x, y) {
  const f = fn(t, 'editHitAt');
  if (!f) return false;
  try { return !!f(params || {}, box, x, y); } catch { return false; }
}

/** The template's own Properties renderer, or null. */
export function propertiesPanel(t) {
  return fn(t, 'propertiesPanel');
}
