// Markset: markup color schemes. A scheme is one color applied to the
// default stroke color of every markup tool at once (text box, callout,
// cloud, shapes, arrows, lines, freehand), the default annotation color and
// the Review Mark Color. Fills, the highlighter, redaction and measurement
// colors keep their own meaning and are not part of a scheme.
//
// Pure: works on a plain preferences object (or the Preferences dialog's
// values), so it is unit-tested directly.

export const PRESET_SCHEMES = Object.freeze([
  { id: 'blue', name: 'Blue', color: '#0000ff' }, // the standard blue of the color palette
  { id: 'red', name: 'Red (traditional)', color: '#ff0000' },
  { id: 'green', name: 'Green', color: '#008a3e' },
  { id: 'orange', name: 'Orange', color: '#f07800' },
  { id: 'black', name: 'Black', color: '#000000' },
].map(Object.freeze));

/** New installs start on Black (js/core/constants.ts applies it). */
export const DEFAULT_SCHEME = 'black';
export const SCHEME_DEFAULT_COLOR = '#000000';

/** Preference keys a scheme sets. */
export const SCHEME_KEYS = Object.freeze([
  'defaultAnnotationColor', 'reviewMarkColor',
  'textboxStrokeColor', 'calloutStrokeColor', 'rectStrokeColor', 'circleStrokeColor',
  'arrowStrokeColor', 'arrowFillColor', 'drawStrokeColor', 'lineStrokeColor',
  'polygonStrokeColor', 'polylineStrokeColor', 'cloudStrokeColor', 'cloudPolylineStrokeColor',
]);

const HEX = /^#[0-9a-f]{6}$/i;
const norm = (c) => String(c || '').toLowerCase();

/** Presets followed by the user's own schemes (marked custom). */
export function allSchemes(custom = []) {
  const own = (Array.isArray(custom) ? custom : [])
    .filter(s => s && s.id && HEX.test(s.color))
    .map(s => ({ id: s.id, name: String(s.name || s.id), color: norm(s.color), custom: true }));
  return [...PRESET_SCHEMES, ...own];
}

/** { key: color } for every scheme key. */
export function schemeValues(color) {
  return Object.fromEntries(SCHEME_KEYS.map(k => [k, norm(color)]));
}

/** The scheme whose color every scheme key has, or null for a mix. */
export function matchingScheme(prefs, custom = []) {
  const colors = new Set(SCHEME_KEYS.map(k => norm(prefs?.[k])));
  if (colors.size !== 1) return null;
  const [c] = colors;
  return allSchemes(custom).find(s => norm(s.color) === c) || null;
}

/**
 * A new custom scheme list with `name` / `color` added (or updated when the
 * name already exists). Returns { list, scheme } or null for invalid input.
 */
export function saveCustomScheme(list, name, color) {
  const n = String(name || '').trim().slice(0, 40);
  if (!n || !HEX.test(String(color || ''))) return null;
  const base = 'custom-' + (n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scheme');
  const current = Array.isArray(list) ? list.filter(s => s && s.id) : [];
  const existing = current.find(s => s.name.toLowerCase() === n.toLowerCase());
  const scheme = { id: existing?.id || base, name: n, color: norm(color) };
  if (!existing) {
    let id = base, i = 2;
    while (current.some(s => s.id === id) || PRESET_SCHEMES.some(s => s.id === id)) id = `${base}-${i++}`;
    scheme.id = id;
  }
  const next = existing ? current.map(s => (s.id === existing.id ? scheme : s)) : [...current, scheme];
  return { list: next, scheme };
}

/** The custom scheme list without `id` (presets cannot be removed). */
export function removeCustomScheme(list, id) {
  return (Array.isArray(list) ? list : []).filter(s => s && s.id !== id);
}
