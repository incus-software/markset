// Markset: the "Markset Pro" group at the top of the Toolpalette.
//
// The group always lists the Pro tools. Without the Markset Pro plugin they
// are shown greyed out; clicking one explains that it is part of Markset Pro.
// The plugin turns a tool on with api.registerProTool({ id, ... }).
import { createSignal } from 'solid-js';

const SEAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6.5"/><path d="M6.5 15c1.5-3 2.5-3 3 0s1.5 3 3 0 2-3 3 0" stroke-linecap="round"/></svg>';
const STAMP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="6" y="8.5" width="2.6" height="2.6"/><path d="M10.5 9.8h7"/><rect x="6" y="13.5" width="2.6" height="2.6"/><path d="M10.5 14.8h7"/></svg>';
const REVIEW_SEAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="5" width="10" height="13" rx="1"/><path d="M5 9h5M5 12h5M5 15h3" stroke-linecap="round"/><circle cx="17.5" cy="11.5" r="4.5"/></svg>';
const SEAL_ALL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="2.5" width="12" height="15" rx="1"/><rect x="7" y="6.5" width="12" height="15" rx="1" style="fill:var(--theme-panel-bg,#fff)"/><circle cx="15" cy="17" r="2.6"/></svg>';
const DETAILS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5" stroke-linecap="round"/></svg>';
const LOG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h1M11 8h5M8 12h1M11 12h5M8 16h1M11 16h5" stroke-linecap="round"/></svg>';
const KIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8l9-5 9 5-9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8" stroke-linejoin="round"/></svg>';
const SETUP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="10" r="6"/><circle cx="9" cy="10" r="3.6"/><path d="M14 17l3 3 4-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The Pro tools, in palette order, as shown before the plugin turns them on. */
export const PRO_TOOL_PLACEHOLDERS = [
  { id: 'review-stamp', label: 'Review stamp', icon: STAMP_ICON, description: 'Build your firm\'s shop drawing review stamp once, then check a box and fill in By and Date with a click.' },
  { id: 'review-seal', label: 'Review & seal', icon: REVIEW_SEAL_ICON, description: 'Click once: your review stamp, filled in, with your seal and signature beside it.' },
  { id: 'seal', label: 'Seal', icon: SEAL_ICON, description: 'Place your seal at true size, with your signature and the date.' },
  { id: 'seal-setup', label: 'Seal setup', icon: SETUP_ICON, description: 'Set up your seal, from your seal vendor\'s file or built to your board\'s standard, and your signature.' },
  { id: 'seal-all', label: 'Seal every sheet', icon: SEAL_ALL_ICON, description: 'Your seal, signature and the date on every sheet of a set, at the spot you choose.' },
  { id: 'project-details', label: 'Project details', icon: DETAILS_ICON, description: 'Your name and project numbers, filled into every review stamp.' },
  { id: 'submittal-log', label: 'Submittal log', icon: LOG_ICON, description: 'Every submittal you stamped, with its action and date. Export to a spreadsheet.' },
  { id: 'firm-kit', label: 'Firm kit', icon: KIT_ICON, description: 'Share your stamps and project list with the whole office.' },
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
