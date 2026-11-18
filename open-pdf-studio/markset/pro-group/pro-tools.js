// Markset: the "Markset Pro" group at the top of the Toolpalette.
//
// The group always lists the Pro tools. Without the Markset Pro plugin they
// are shown greyed out; clicking one explains that it is part of Markset Pro.
// The plugin turns a tool on with api.registerProTool({ id, ... }), and can
// give it a section ("Expert Witness") to list it under that heading.
import { createSignal } from 'solid-js';

const SEAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6.5"/><path d="M6.5 15c1.5-3 2.5-3 3 0s1.5 3 3 0 2-3 3 0" stroke-linecap="round"/></svg>';
const STAMP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="6" y="8.5" width="2.6" height="2.6"/><path d="M10.5 9.8h7"/><rect x="6" y="13.5" width="2.6" height="2.6"/><path d="M10.5 14.8h7"/></svg>';
const SEAL_ALL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="2.5" width="12" height="15" rx="1"/><rect x="7" y="6.5" width="12" height="15" rx="1" style="fill:var(--theme-panel-bg,#fff)"/><circle cx="15" cy="17" r="2.6"/></svg>';
const DETAILS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5" stroke-linecap="round"/></svg>';
const LOG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h1M11 8h5M8 12h1M11 12h5M8 16h1M11 16h5" stroke-linecap="round"/></svg>';
const KIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8l9-5 9 5-9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8" stroke-linejoin="round"/></svg>';
const SETUP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="10" r="6"/><circle cx="9" cy="10" r="3.6"/><path d="M14 17l3 3 4-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The Pro tools, in palette order, as shown before the plugin turns them on. */
export const PRO_TOOL_PLACEHOLDERS = [
  { id: 'review-stamp', section: 'Review & Seal', label: 'Review stamp', icon: STAMP_ICON, description: 'Build your firm\'s shop drawing review stamp once, then place it with one click, filled in and added to your submittal log.' },
  { id: 'seal', section: 'Review & Seal', label: 'Seal', icon: SEAL_ICON, description: 'Place your seal at true size, with your signature and the date.' },
  { id: 'seal-setup', section: 'Review & Seal', label: 'Seal setup', icon: SETUP_ICON, description: 'Set up your seal, from your seal vendor\'s file or built to your board\'s standard, and your signature.' },
  { id: 'seal-all', section: 'Review & Seal', label: 'Seal every sheet', icon: SEAL_ALL_ICON, description: 'Your seal, signature and the date on every sheet of a set, at the spot you choose.' },
  { id: 'project-details', section: 'Review & Seal', label: 'Project details', icon: DETAILS_ICON, description: 'Your name and project numbers, filled into every review stamp.' },
  { id: 'submittal-log', section: 'Review & Seal', label: 'Submittal log', icon: LOG_ICON, description: 'Every submittal you stamped, with its action and date. Export to a spreadsheet.' },
  { id: 'firm-kit', section: 'General', label: 'Firm kit', icon: KIT_ICON, description: 'Share your stamps and project list with the whole office.' },
];

/** Section headings in palette order. Any other section a plugin names follows them. */
export const PRO_SECTIONS = ['Review & Seal', 'Construction Admin', 'Expert Witness', 'General'];
const NO_SECTION = 'More';

const [active, setActive] = createSignal({}); // id -> { tool?, onClick?, label?, icon?, description?, section? }

/** Tools for the palette: every placeholder, merged with what the plugin registered. */
export function proTools() {
  const on = active();
  const ids = new Set(PRO_TOOL_PLACEHOLDERS.map((t) => t.id));
  const extra = Object.keys(on).filter((id) => !ids.has(id)).map((id) => ({ id }));
  return [...PRO_TOOL_PLACEHOLDERS, ...extra].map((t) => ({ ...t, ...(on[t.id] || {}), enabled: !!on[t.id] }));
}

/**
 * The tools under their headings, as [{ name, tools }]: the PRO_SECTIONS in
 * order, then any other section in the order it first appears, then tools
 * that name no section under "More". Tools keep their order within a section.
 */
export function proSections(tools = proTools()) {
  const by = new Map();
  for (const t of tools) {
    const name = typeof t.section === 'string' && t.section.trim() ? t.section.trim() : NO_SECTION;
    if (!by.has(name)) by.set(name, []);
    by.get(name).push(t);
  }
  const rank = (n) => {
    if (n === NO_SECTION) return PRO_SECTIONS.length + 1;
    const i = PRO_SECTIONS.indexOf(n);
    return i >= 0 ? i : PRO_SECTIONS.length;
  };
  return [...by.keys()]
    .map((name, i) => ({ name, i }))
    .sort((a, b) => rank(a.name) - rank(b.name) || a.i - b.i)
    .map(({ name }) => ({ name, tools: by.get(name) }));
}

/**
 * Which sections start closed when the user has not opened or closed any
 * themselves: all but one, so the group shows the tools you use instead of
 * every Pro tool at once. The open one is the section of the Pro tool you
 * used last, or else the first section with a tool you can use, or else the
 * first section.
 * @param {{ name: string, tools: { enabled?: boolean }[] }[]} sections  from proSections()
 * @param {string} [lastUsed]  the section of the last Pro tool used
 * @returns {string[]} the closed section names
 */
export function defaultClosedSections(sections, lastUsed) {
  const names = sections.map((s) => s.name);
  const keep = names.includes(lastUsed) ? lastUsed
    : (sections.find((s) => s.tools.some((x) => x.enabled))?.name ?? names[0]);
  return names.filter((n) => n !== keep);
}

/** Validate and turn on a Pro tool. Returns an unregister function. */
export function registerProTool(item) {
  if (!item || typeof item.id !== 'string' || !item.id) throw new TypeError('registerProTool: id is required');
  if (typeof item.tool !== 'string' && typeof item.onClick !== 'function') throw new TypeError('registerProTool: tool or onClick is required');
  // Keep only the fields the plugin gave, so the placeholder's label and icon stay otherwise.
  const given = Object.fromEntries(['tool', 'onClick', 'label', 'icon', 'description', 'section']
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

/** Where the greyed-out tools' message sends people. */
export const PRO_URL = 'https://usemarkset.com';

/** Message shown when a greyed-out Pro tool is clicked (with a "Visit usemarkset.com" button). */
export function proUpsellMessage(tool) {
  return `${tool.label} is part of Markset Pro. ${tool.description || ''}\n\nMarkset Pro is an add-on: get it at usemarkset.com, install it, and enter your license key in its License tool.`;
}
