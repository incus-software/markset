// Markset: the submittal review stamp as an upstream parametric template.
// Its params hold the whole design (see layout.js); the Properties panel shows
// a stamp section (StampProps.jsx) instead of one field per param.
//
// On the sheet: double-click a fill-in line (Project no., Submittal no., By,
// Date) to type on it, through upstream's inline label editor
// (editableLabels); double-click a checkbox row to check it
// (parametric-symbol-editing.js hook, stampCheckboxAt).
import {
  STAMP_TEMPLATE_ID, defaultStampDesign, PLACEMENT_DEFAULTS, stampLayout, stampCommands, stampRegions,
} from './layout.js';

const KIND = (v) => (typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string');
const LABELS = { projectNo: 'Project no.', submittalNo: 'Submittal no.', by: 'By', date: 'Date', checked: 'Checked' };

const DEFAULTS = { ...defaultStampDesign(), ...PLACEMENT_DEFAULTS };
const def = stampLayout(DEFAULTS);

export const STAMP_TEMPLATE = {
  id: STAMP_TEMPLATE_ID,
  name: 'Submittal Review Stamp', nameEn: 'Submittal Review Stamp', category: 'US',
  defaultSize: { width: def.width, height: def.height },
  markset: { role: 'stamp', stamp: true, group: 'stamps' },
  params: Object.entries(DEFAULTS).map(([key, value]) => ({
    key, label: LABELS[key] || key, labelEn: LABELS[key] || key, type: KIND(value), default: value,
  })),
  render(p, box) { return stampCommands(p, box); },
  /** The fill-in lines, for upstream's double-click inline editor. */
  editableLabels(p, bbox) {
    return stampRegions(p, bbox).fields.map(f => ({ id: f.key, fields: [f.key], rect: f.rect }));
  },
};
