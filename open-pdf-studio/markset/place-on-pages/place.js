// Markset: copy the selected markups (a stamp, seal, signature or anything
// else) to other pages, in the same spot relative to a corner of each sheet.
// One undo step removes every copy.
import { getActiveDocument, imageCache } from '../../js/core/state.js';
import { cloneAnnotationsInPlace } from '../../js/annotations/paste-in-place.js';
import { annotationBounds } from '../../js/annotations/spatial-index.js';
import { applyMoveGeneric } from '../../js/annotations/transforms.js';
import { generateImageId } from '../../js/utils/helpers.js';
import { recordBulkAdd } from '../../js/core/undo-manager.js';
import { redrawAnnotations, redrawContinuous } from '../../js/annotations/rendering.js';
import { updateStatusMessage } from '../../js/ui/chrome/status-bar.js';
import { planPlacement, unionBounds } from './placement.js';

/** The markups the command acts on: the selection if it contains `ann`, else `ann`. */
export function placementSources(doc, ann) {
  const sel = doc?.selectedAnnotations || [];
  if (ann && sel.length > 1 && sel.some((a) => a.id === ann.id)) return sel.filter((a) => a.page === ann.page);
  return ann ? [ann] : [];
}

/** Plan for the dialog's preview text, without changing anything. */
export function previewPlacement(sources, pages, anchor) {
  const doc = getActiveDocument();
  if (!doc || !sources?.length) return { place: [], skipped: [] };
  return planPlacement({
    bounds: unionBounds(sources.map((a) => annotationBounds(a))),
    sourcePage: sources[0].page,
    pages,
    pageDims: doc.pageDims,
    anchor,
  });
}

/**
 * Copy `sources` to `pages`. Returns { placed, skipped } page numbers.
 */
export function placeOnPages(sources, pages, anchor) {
  const doc = getActiveDocument();
  const plan = previewPlacement(sources, pages, anchor);
  if (!doc || !plan.place.length) return { placed: [], skipped: plan.skipped };
  const created = [];
  for (const { page, dx, dy } of plan.place) {
    const copies = cloneAnnotationsInPlace(sources, page);
    copies.forEach((copy, i) => {
      if (dx || dy) applyMoveGeneric(copy, dx, dy);
      // Images and signatures point into the shared image cache; give each
      // copy its own entry, as paste does.
      if ((copy.type === 'image' || copy.type === 'signature') && sources[i].imageId) {
        const id = generateImageId();
        const img = imageCache.get(sources[i].imageId);
        if (img) imageCache.set(id, img);
        copy.imageId = id;
      }
    });
    created.push(...copies);
  }
  doc.annotations.push(...created);
  recordBulkAdd(created);
  if (doc.viewMode === 'continuous') redrawContinuous();
  else redrawAnnotations();
  const placed = plan.place.map((p) => p.page);
  updateStatusMessage(placementMessage(placed.length, plan.skipped.length), 5000);
  return { placed, skipped: plan.skipped };
}

export function placementMessage(placed, skipped) {
  const p = `Placed on ${placed} page${placed === 1 ? '' : 's'}`;
  return skipped ? `${p}; ${skipped} skipped (the markup would fall off a smaller sheet)` : p;
}
