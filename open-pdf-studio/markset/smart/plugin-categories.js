// Markset: Toolpalette groups added by plugins (api.registerSymbolCategory),
// shown after the bundled Markset groups. A plugin's group works like My
// Stamps: its symbols are palette entries (usually a smart template with
// saved params), and it can offer a "+" button and a right-click edit.
//
// descriptor: {
//   id, name, icon?: svg string,
//   symbols: [{ id, name, svg, parametricId?, parametricParams?, ... }],
//   onAdd?: () => void,                 // the group header's "+" button
//   addTitle?: string,                  // its tooltip
//   onEdit?: (symbol) => void,          // right-click on one of its symbols
// }
import { createSignal } from 'solid-js';

const DEFAULT_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="2" width="12" height="12" rx="2"/></svg>';
const [categories, setCategories] = createSignal([]);

function normalize(d) {
  if (!d?.id || typeof d.id !== 'string') throw new TypeError('A symbol category needs an id');
  return {
    id: d.id,
    name: String(d.name || d.id),
    builtin: true,
    online: false,
    plugin: true,
    icon: typeof d.icon === 'string' && d.icon.startsWith('<svg') ? d.icon : DEFAULT_ICON,
    symbols: (Array.isArray(d.symbols) ? d.symbols : []).filter(s => s?.id && s?.svg).map(s => ({ ...s, name: String(s.name || s.id) })),
    onAdd: typeof d.onAdd === 'function' ? d.onAdd : null,
    addTitle: d.addTitle ? String(d.addTitle) : 'New...',
    onEdit: typeof d.onEdit === 'function' ? d.onEdit : null,
  };
}

/**
 * Add or replace a plugin group. Returns { update(partial), remove() }; call
 * update({ symbols }) when the group's contents change.
 */
export function registerSymbolCategory(descriptor) {
  let current = normalize(descriptor);
  setCategories(list => [...list.filter(c => c.id !== current.id), current]);
  return {
    update(partial) {
      current = normalize({ ...current, ...(partial || {}), id: current.id });
      setCategories(list => list.map(c => (c.id === current.id ? current : c)));
    },
    remove() { unregisterSymbolCategory(current.id); },
  };
}

export function unregisterSymbolCategory(id) {
  setCategories(list => list.filter(c => c.id !== id));
}

/** The plugin groups, for symbolStore (reactive). */
export function pluginCategories() {
  return categories();
}
