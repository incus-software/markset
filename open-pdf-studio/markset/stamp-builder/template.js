// Markset: the submittal review stamp as an upstream parametric template.
// Its params hold the whole design (see layout.js); the Properties panel shows
// a stamp section (StampProps.jsx) instead of one field per param.
import {
  STAMP_TEMPLATE_ID, defaultStampDesign, PLACEMENT_DEFAULTS, stampLayout, stampCommands,
} from './layout.js';

const KIND = (v) => (typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string');

const DEFAULTS = { ...defaultStampDesign(), ...PLACEMENT_DEFAULTS };
const def = stampLayout(DEFAULTS);

export const STAMP_TEMPLATE = {
  id: STAMP_TEMPLATE_ID,
  name: 'Submittal Review Stamp', nameEn: 'Submittal Review Stamp', category: 'US',
  defaultSize: { width: def.width, height: def.height },
  markset: { role: 'stamp', stamp: true, group: 'stamps' },
  params: Object.entries(DEFAULTS).map(([key, value]) => ({
    key, label: key, labelEn: key, type: KIND(value), default: value,
  })),
  render(p, box) { return stampCommands(p, box); },
};
