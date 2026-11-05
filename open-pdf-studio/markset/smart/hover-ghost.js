// Markset: a smart symbol (section, elevation, door tag, ...) shows under the
// cursor before it is placed, faded and at the size a click places it, like
// the ghost of a library stamp (js/tools/tools/text-tool.js).
import { state } from '../../js/core/state.js';
import { drawAnnotation } from '../../js/annotations/rendering.js';
import { buildAnnotationProps } from '../../js/tools/annotation-creators.js';
import { withSymbolInsertFormat } from '../../js/symbols/symbol-insert-format-store.js';
import { applyToolTransform } from '../../js/tools/tool-transform.js';
import { previewCtx, redrawForViewMode } from '../../js/tools/preview-target.js';

export const GHOST_OPACITY = 0.6;

/** The symbol a click at (x, y) would place, faded; null if none. */
export function ghostAnnotation(tool, x, y, e, build = buildAnnotationProps) {
  state._isPreview = true;
  let ann;
  try {
    ann = withSymbolInsertFormat(tool, build(tool, x, y, x, y, e));
  } finally {
    state._isPreview = false;
  }
  return ann ? { ...ann, opacity: (ann.opacity ?? 1) * GHOST_OPACITY } : null;
}

/**
 * Draw the ghost at the point the click would use: the object snap, else the
 * grid (tool-dispatcher.js sets the start point the same way).
 */
export function drawSmartSymbolGhost(ctx, x, y, e) {
  const snap = ctx.snap(x, y);
  const px = snap.snapped ? snap.x : ctx.snapToGrid(x);
  const py = snap.snapped ? snap.y : ctx.snapToGrid(y);
  const ann = ghostAnnotation(state.currentTool, px, py, e);
  redrawForViewMode();
  const target = previewCtx(ctx.canvasCtx);
  if (!ann || !target) return;
  target.save();
  applyToolTransform(target);
  drawAnnotation(target, ann);
  target.restore();
  if (snap.snapped) ctx.drawSnapIndicator(snap);
}
