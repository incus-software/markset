// Markset: sheet-relative symbol size. A symbol's paperHeightIn is its
// printed height on a 24x36 sheet; on other sheets it scales with the sheet's
// long edge (11x17 is the half-size set), but never below a readable minimum.
// Pure: page sizes come in as PDF points.

export const REFERENCE_LONG_EDGE_IN = 36;
export const MIN_HEIGHT_IN = 3 / 16;

/**
 * Height in PDF points for a symbol on a page of `pageW` x `pageH` points,
 * or null when the symbol has no paper height or the page size is unknown.
 */
export function sheetSymbolHeight(paperHeightIn, pageW, pageH) {
  if (!(paperHeightIn > 0) || !(pageW > 0) || !(pageH > 0)) return null;
  const longEdgeIn = Math.max(pageW, pageH) / 72;
  const inches = Math.max(MIN_HEIGHT_IN, (paperHeightIn * longEdgeIn) / REFERENCE_LONG_EDGE_IN);
  return Math.round(inches * 72 * 100) / 100;
}

/**
 * Stamp tool overrides with the sheet height in place of the default height,
 * for the placement and the ghost under the cursor alike. `maat` is the page
 * size ({breedte, hoogte} in points, from paginaMaat).
 */
export function withSheetHeight(overrides, maat) {
  const h = sheetSymbolHeight(overrides?.stampPaperHeightIn, maat?.breedte, maat?.hoogte);
  return h ? { ...overrides, stampHeight: h } : overrides;
}
