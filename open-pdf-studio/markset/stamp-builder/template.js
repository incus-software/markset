// Markset: the submittal review stamp as an upstream parametric template.
// Its params hold the whole design (see layout.js); the Properties panel shows
// a stamp section (StampProps.jsx) instead of one field per param.
//
// On the sheet: double-click a fill-in line (Project no., Submittal no., By,
// Date) to type on it, through upstream's inline label editor
// (editableLabels); double-click a checkbox row to check it
// (the generic `markset.toggleAt` callback, see smart/hooks.js).
import {
  STAMP_TEMPLATE_ID, defaultStampDesign, PLACEMENT_DEFAULTS, stampLayout, stampCommands, stampRegions,
  stampCheckboxAt, toggledChecked, stampHitAt,
} from './layout.js';

const KIND = (v) => (typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string');
const LABELS = { projectNo: 'Project no.', submittalNo: 'Submittal no.', by: 'By', date: 'Date', checked: 'Checked' };

const DEFAULTS = { ...defaultStampDesign(), ...PLACEMENT_DEFAULTS };
const def = stampLayout(DEFAULTS);

export const STAMP_TEMPLATE = {
  id: STAMP_TEMPLATE_ID,
  name: 'Submittal Review Stamp', nameEn: 'Submittal Review Stamp', category: 'US',
  defaultSize: { width: def.width, height: def.height },
  markset: {
    role: 'stamp', stamp: true, group: 'stamps',
    /** True printed size: placed at it, and the height follows the content. */
    contentSize: (p) => { const { width, height } = stampLayout(p); return { width, height }; },
    /** The stamp's ink colours the whole stamp. */
    colors: (p) => (/^#[0-9a-f]{6}$/i.test(p?.ink || '') ? { color: p.ink, strokeColor: p.ink } : null),
    /** A click on a checkbox row checks it. */
    toggleAt(p, box, x, y) {
      const row = stampCheckboxAt(p, box, x, y);
      return row >= 0 ? { params: { ...(p || {}), checked: toggledChecked(p, row) }, key: `row${row}` } : null;
    },
    /** A click on a fill-in line or a checkbox row edits in place instead of moving. */
    editHitAt: (p, box, x, y) => !!stampHitAt(p, box, x, y),
  },
  params: Object.entries(DEFAULTS).map(([key, value]) => ({
    key, label: LABELS[key] || key, labelEn: LABELS[key] || key, type: KIND(value), default: value,
  })),
  render(p, box) { return stampCommands(p, box); },
  /** The fill-in lines, for upstream's double-click inline editor. */
  editableLabels(p, bbox) {
    return stampRegions(p, bbox).fields.map(f => ({ id: f.key, fields: [f.key], rect: f.rect }));
  },
};
