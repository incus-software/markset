// Markset: the "Markset Pro" group at the top of the Toolpalette.
//
// The group always lists the Pro tools. Without the Markset Pro plugin they
// are shown greyed out; clicking one explains that it is part of Markset Pro.
// The plugin turns a tool on with api.registerProTool({ id, ... }).
import { createSignal } from 'solid-js';

const SEAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6.5"/><path d="M6.5 15c1.5-3 2.5-3 3 0s1.5 3 3 0 2-3 3 0" stroke-linecap="round"/></svg>';
const STAMP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="6" y="8.5" width="2.6" height="2.6"/><path d="M10.5 9.8h7"/><rect x="6" y="13.5" width="2.6" height="2.6"/><path d="M10.5 14.8h7"/></svg>';
const SETUP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="10" r="6"/><circle cx="9" cy="10" r="3.6"/><path d="M14 17l3 3 4-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The Pro tools, in palette order, as shown before the plugin turns them on. */
export const PRO_TOOL_PLACEHOLDERS = [
  { id: 'review-stamp', label: 'Review stamp', icon: STAMP_ICON, description: 'Build your firm\'s shop drawing review stamp once, then check a box and fill in By and Date with a click.' },
  { id: 'seal', label: 'Seal', icon: SEAL_ICON, description: 'Place your seal at true size, with your signature and the date.' },
  { id: 'seal-setup', label: 'Seal setup', icon: SETUP_ICON, description: 'Set up your seal file or a state seal, and your signature.' },
];

const [active, setActive] = createSignal({}); // id -> { tool?, onClick?, label?, icon?, description? }

/** Tools for the palette: every placeholder, merged with what the plugin registered. */
export function proTools() {
  const on = active();
  const ids = new Set(PRO_TOOL_PLACEHOLDERS.map((t) => t.id));
  const extra = Object.keys(on).filter((id) => !ids.has(id)).map((id) => ({ id }));
  return [...PRO_TOOL_PLACEHOLDERS, ...extra].map((t) => ({ ...t, ...(on[t.id] || {}), enabled: !!on[t.id] }));
}

/** Validate and turn on a Pro tool. Returns an unregister function. */
export function registerProTool(item) {
  if (!item || typeof item.id !== 'string' || !item.id) throw new TypeError('registerProTool: id is required');
  if (typeof item.tool !== 'string' && typeof item.onClick !== 'function') throw new TypeError('registerProTool: tool or onClick is required');
  // Keep only the fields the plugin gave, so the placeholder's label and icon stay otherwise.
  const given = Object.fromEntries(['tool', 'onClick', 'label', 'icon', 'description']
    .filter((k) => item[k] !== undefined).map((k) => [k, item[k]]));
  setActive((prev) => ({ ...prev, [item.id]: given }));
  return () => unregisterProTool(item.id);
}

export function unregisterProTool(id) {
  setActive((prev) => {
    if (!(id in prev)) return prev;
    const next = { ...prev };
    delete next[id];
    return next;
  });
}

/** Message shown when a greyed-out Pro tool is clicked. */
export function proUpsellMessage(tool) {
  return `${tool.label} is part of Markset Pro. ${tool.description || ''}\n\nLearn more at usemarkset.com.`;
}
