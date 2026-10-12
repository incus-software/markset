// Markset: the user's saved review stamps ("My Stamps"), kept in the
// preferences (`marksetStamps`), and their symbol palette group.
import { state } from '../../js/core/state.js';
import { savePreferences } from '../../js/core/preferences.js';
import { STAMP_TEMPLATE_ID, defaultStampDesign, stampCommands, stampLayout } from './layout.js';
import { cmdsToSvg } from '../smart/cmds-svg.js';

export const MY_STAMPS_GROUP = 'markset-my-stamps';

const ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="3" width="12" height="10" rx="1"/><rect x="4" y="6" width="2" height="2"/><line x1="7.5" y1="7" x2="12" y2="7"/><rect x="4" y="9" width="2" height="2"/><line x1="7.5" y1="10" x2="12" y2="10"/></svg>';

const DESIGN_KEYS = Object.keys(defaultStampDesign());

/** Only the design fields of `d`, over the defaults. */
export function cleanDesign(d) {
  const base = defaultStampDesign();
  const out = {};
  for (const k of DESIGN_KEYS) out[k] = d?.[k] !== undefined && typeof d[k] === typeof base[k] ? d[k] : base[k];
  return out;
}

export function savedStamps() {
  const list = state.preferences.marksetStamps;
  return Array.isArray(list) ? list : [];
}

function write(list) {
  state.preferences.marksetStamps = list;
  savePreferences();
}

/** `name`, or "name 2", "name 3"... when another stamp already uses it. */
export function uniqueStampName(name, list, ownId = '') {
  const base = String(name || 'Stamp').trim() || 'Stamp';
  const taken = new Set(list.filter(s => s.id !== ownId).map(s => s.name));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

/** Save a design (new when it has no id); returns the saved stamp. */
export function saveStamp(design) {
  const id = design?.id || `stamp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const list = savedStamps();
  const stamp = { id, ...cleanDesign(design) };
  stamp.name = uniqueStampName(stamp.name, list, id);
  const i = list.findIndex(s => s.id === id);
  write(i >= 0 ? list.map(s => (s.id === id ? stamp : s)) : [...list, stamp]);
  return stamp;
}

export function deleteStamp(id) {
  write(savedStamps().filter(s => s.id !== id));
}

/** SVG preview of a design at its true proportions. */
export function stampPreviewSvg(design, placement = {}) {
  const params = { ...cleanDesign(design), ...placement };
  const { width, height } = stampLayout(params);
  const box = { x: 0, y: 0, width, height };
  return cmdsToSvg(stampCommands(params, box), box, { color: params.ink || '#000000' });
}

/** The "My Stamps" palette group (always present, so a first stamp can be made). */
export function myStampsCategories() {
  return [{
    id: MY_STAMPS_GROUP,
    name: 'My Stamps',
    builtin: true,
    online: false,
    icon: ICON,
    symbols: savedStamps().map(s => ({
      id: `my-${s.id}`,
      name: s.name || 'Stamp',
      parametricId: STAMP_TEMPLATE_ID,
      parametricParams: cleanDesign(s),
      svg: stampPreviewSvg(s),
      markset: { role: 'stamp', stampId: s.id },
    })),
  }];
}
