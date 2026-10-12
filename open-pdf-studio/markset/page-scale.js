// Markset: a calibration or Set Scale applies to the sheet it was made on.
//
// Upstream keeps one document scale (doc.measureScale) and ranks it below a
// scale that came with the PDF (CAD/Revit "viewports", often wrong for a
// drawing set) and below scale bars, so calibrating a sheet with such a scale
// changed nothing. Markset stores each calibration per page inside the same
// object: doc.measureScale.pages[page]. Being part of doc.measureScale, it is
// saved, restored and undone by upstream's existing code. The resolver
// (schaal-op-punt.js) ranks it below scale regions and viewports the user
// drew, and above the PDF's own scale, scale bars and the document scale.
//
// Pure: works on plain objects.

const pick = (s) => ({
  pixelsPerUnit: s.pixelsPerUnit, unit: s.unit || 'mm', method: s.method || 'reference', scaleRatio: s.scaleRatio ?? null,
});

/** The document scale after calibrating `page`: the new scale is also the document default. */
export function withPageScale(measureScale, page, scaleData) {
  if (!(scaleData?.pixelsPerUnit > 0) || !(page > 0)) return scaleData;
  return { ...pick(scaleData), pages: { ...(measureScale?.pages || {}), [page]: pick(scaleData) } };
}

/** The document scale after Reset on `page`: only that page's calibration goes. */
export function withoutPageScale(measureScale, page) {
  if (!measureScale?.pages?.[page]) return null; // upstream Reset: no scale at all
  const pages = { ...measureScale.pages };
  delete pages[page];
  if (!Object.keys(pages).length) return null;
  const { pages: _, ...rest } = measureScale;
  return { ...rest, pages };
}

/** The calibration of `page` in a document, or null. */
export function pageScaleAt(doc, page) {
  const s = doc?.measureScale?.pages?.[page];
  return s && s.pixelsPerUnit > 0 ? s : null;
}

/** A length on the sheet in inches, for the calibration dialog: 142.36 pt → `1.98"`. */
export function sheetInches(points) {
  const v = Number(points);
  return v > 0 ? `${Math.round((v / 72) * 100) / 100}"` : '';
}

/** /Name of the viewport a calibration is saved as (page-scale-pdf.js). */
export const MARKSET_VP_NAME = 'Markset calibration';

/**
 * On opening: the "Markset calibration" viewports read from the PDF
 * (`viewports` = { page: [{ name, pixelsPerUnit, unit, ratio }] }) become the
 * pages' calibrations, unless this computer already has one for that page.
 * Returns the new document scale (the old one when nothing changes).
 */
export function restorePageCalibrations(measureScale, viewports) {
  let out = measureScale;
  for (const [page, list] of Object.entries(viewports || {})) {
    const v = (list || []).find(x => x?.name === MARKSET_VP_NAME && x.pixelsPerUnit > 0);
    if (!v || out?.pages?.[page]) continue;
    const s = { pixelsPerUnit: v.pixelsPerUnit, unit: v.unit || 'mm', method: 'reference', scaleRatio: /^1:/.test(v.ratio || '') ? v.ratio : null };
    out = { ...(out || {}), pages: { ...(out?.pages || {}), [page]: s } };
  }
  return out;
}

/**
 * The document scale stored on this computer, merged with one already in
 * the document (calibrations read from the PDF): this computer's own
 * calibration of a page wins, the PDF's fills in the other pages.
 */
export function mergeStoredScale(stored, current) {
  if (!current?.pages) return stored;
  return { ...(stored || {}), pages: { ...current.pages, ...(stored?.pages || {}) } };
}
