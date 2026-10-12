// Markset: the bundled symbol library in the app. The collection folders are
// bundled by Vite, so the Starter Library works offline and survives updates.
import { state } from '../../js/core/state.js';
import { recolorSvg } from '../../js/annotations/svg-stroke-color.js';
import { bundledGroups, symbolForShortcut } from './bundle.js';

const files = import.meta.glob(
  ['./*/collection.json', './*/markset.json', './*/stamps.json', './*/symbols/*.svg'],
  { query: '?raw', import: 'default', eager: true },
);

/** Palette groups for js/solid/stores/symbolStore.js. */
export const MARKSET_CATEGORIES = bundledGroups(files);

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
