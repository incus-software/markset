// Markset: turn the bundled library folders (open-pdf-studio-library format)
// into symbol palette groups. Pure — js/solid/data/markset-library.js (or a
// test) passes the file contents in.
//
// A collection folder holds the upstream files (collection.json,
// symbols/*.svg, stamps.json) plus markset.json, which adds Markset-only data
// per symbol id: name, paperHeightIn, role ('review'), shortcut.
import { collectionToGroup } from '../../js/solid/data/symbolLibraryOnline.js';

const ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5 L6.5 12 L13 4"/></svg>';

function parseJson(text, fallback) {
  try { return text ? JSON.parse(text) : fallback; } catch { return fallback; }
}

/**
 * @param {Record<string, string>} files  path → text, paths like
 *        './us-starter/collection.json' or './us-starter/symbols/checkmark.svg'
 * @param {string} [lang]
 * @returns {Array<object>} palette groups (builtin, with symbol.markset data)
 */
export function bundledGroups(files, lang = 'en') {
  const byCollection = new Map();
  for (const [path, text] of Object.entries(files || {})) {
    const m = path.replace(/\\/g, '/').match(/^(?:\.\/)?([a-z0-9-]+)\/(.+)$/);
    if (!m) continue;
    if (!byCollection.has(m[1])) byCollection.set(m[1], {});
    byCollection.get(m[1])[m[2]] = text;
  }
  const groups = [];
  // markset.json may give a palette position ("order", lowest first);
  // collections without one follow, by id.
  const rank = ([id, f]) => [parseJson(f['markset.json'], {}).order ?? 1e9, id];
  const sorted = [...byCollection].sort((a, b) => {
    const [ra, ia] = rank(a), [rb, ib] = rank(b);
    return ra - rb || ia.localeCompare(ib);
  });
  for (const [id, f] of sorted) {
    const meta = parseJson(f['collection.json'], null);
    if (!meta || meta.id !== id || meta.status !== 'available') continue;
    const extra = parseJson(f['markset.json'], {}).symbols || {};
    const svgFiles = Object.keys(f)
      .filter(p => /^symbols\/[a-z0-9-]+\.svg$/.test(p))
      .sort()
      .map(p => ({ name: p.slice('symbols/'.length), svg: f[p] }));
    const stamps = parseJson(f['stamps.json'], {}).stamps || [];
    const group = collectionToGroup(id, meta, { svgFiles, stamps }, lang);
    group.id = `markset-${id}`;
    group.builtin = true;
    group.online = false;
    group.icon = ICON;
    // Keep the markset.json order (the order a user scans the palette in),
    // then anything not listed there.
    const order = Object.keys(extra);
    const base = (s) => s.id.replace(`lib-${id}-`, '');
    group.symbols = group.symbols
      .map(s => {
        const x = extra[base(s)];
        if (!x) return s;
        return { ...s, name: x.name || s.name, markset: { ...x, id: base(s), collection: id } };
      })
      .sort((a, b) => {
        const ia = order.indexOf(base(a)), ib = order.indexOf(base(b));
        return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
      });
    groups.push(group);
  }
  return groups;
}

/** The symbol bound to a single-key shortcut ('k'), or null. */
export function symbolForShortcut(groups, key) {
  const k = String(key || '').toLowerCase();
  if (!k) return null;
  for (const g of groups) {
    for (const s of g.symbols) if (s.markset?.shortcut === k) return s;
  }
  return null;
}
