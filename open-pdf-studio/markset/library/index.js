// Markset: the bundled symbol library in the app. The collection folders are
// bundled by Vite, so the Starter Library works offline and survives updates.
import { state } from '../../js/core/state.js';
import { recolorSvg } from '../../js/annotations/svg-stroke-color.js';
import { bundledGroups, symbolForShortcut } from './bundle.js';
import { registerMarksetTemplates, smartPaletteEntries } from '../smart/index.js';

const files = import.meta.glob(
  ['./*/collection.json', './*/markset.json', './*/stamps.json', './*/symbols/*.svg'],
  { query: '?raw', import: 'default', eager: true },
);

// The smart symbols' templates must exist before their palette entries (or
// a loaded PDF) refer to them; registering twice is harmless.
registerMarksetTemplates();

// Which smart (parametric) templates each bundled group lists, after its SVGs.
const SMART_GROUP = { 'markset-us-starter': 'starter', 'markset-us-electrical-starter': 'electrical' };

/** Palette groups for js/solid/stores/symbolStore.js. */
export const MARKSET_CATEGORIES = bundledGroups(files).map(g => (SMART_GROUP[g.id]
  ? { ...g, symbols: [...g.symbols, ...smartPaletteEntries(undefined, SMART_GROUP[g.id])] }
  : g));

export const DEFAULT_REVIEW_MARK_COLOR = '#dd0000';

/** The SVG to place: review marks take the review mark color preference. */
export function marksetSymbolSvg(symbol, svg) {
  if (symbol?.markset?.role !== 'review') return svg;
  return recolorSvg(svg, state.preferences.reviewMarkColor || DEFAULT_REVIEW_MARK_COLOR);
}

/** Extra stamp tool overrides for a Markset symbol (sheet-relative height). */
export function marksetSymbolOverrides(symbol) {
  const h = symbol?.markset?.paperHeightIn;
  return h > 0 ? { stampPaperHeightIn: h } : {};
}

/** The bundled symbol for a single-key shortcut, or null. */
export function marksetShortcutSymbol(key) {
  return symbolForShortcut(MARKSET_CATEGORIES, key);
}
