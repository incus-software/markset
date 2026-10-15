import { getActiveDocument } from '../../core/state.js';
import { annotationCtx } from '../../ui/dom-elements.js';
import { applyToolTransform } from '../tool-transform.js';

// Markset: hover preview for click-mode plugin tools. A click tool places on
// a single click, so the user never saw where it would land; now the tool's
// own `preview(ctx, x, y, x, y, state, e)` is drawn under the cursor, the
// same way the shape tools draw their hover snap: redraw, then draw on top.
let hoverShown = false;
let leaveCanvas = null;

function pageState(state, pageNum) {
  const doc = getActiveDocument();
  const currentPage = pageNum || doc?.currentPage || 1;
  const dims = doc?.pageDims?.[currentPage];
  if (!dims) return null;
  return {
    ...state,
    docScale: doc?.scale || 1,
    devicePixelRatio: window.devicePixelRatio || 1,
    pageWidth: dims.widthPt,
    pageHeight: dims.heightPt,
    currentPage,
  };
}

/** Remove the hover preview (pointer left the page, tool changed, or placed). */
export function clearPluginHover(redraw) {
  if (!hoverShown) return;
  hoverShown = false;
  redraw?.();
}

/**
 * Plugin tool — wraps annotation-type-registry handlers
 * Handles 'click' drawMode plugins; 'drag' plugins use shape-tool behavior
 */
export const pluginClickTool = {
  name: 'plugin-click',
  cursor: 'crosshair',

  onPointerMove(ctx, e) {
    const { x, y, state } = ctx;
    const typeHandler = ctx.getAnnotationType(state.currentTool);
    if (!typeHandler?.preview || e?.buttons) return;
    if (ctx.canvas && leaveCanvas !== ctx.canvas) {
      leaveCanvas = ctx.canvas;
      ctx.canvas.addEventListener('pointerleave', () => clearPluginHover(ctx.redraw));
    }
    const hoverState = pageState(state, ctx.pageNum);
    if (!hoverState) return;
    ctx.redraw();
    annotationCtx.save();
    try {
      applyToolTransform(annotationCtx);
      typeHandler.preview(annotationCtx, x, y, x, y, hoverState, e);
      hoverShown = true;
    } catch (err) {
      console.warn('[plugin-tool] preview failed:', err?.message || err);
    } finally {
      annotationCtx.restore();
    }
  },

  onPointerDown(ctx, e) {
    if (e && e.button === 2) return;
    const { x, y, state } = ctx;
    const doc = getActiveDocument();
    const typeHandler = ctx.getAnnotationType(state.currentTool);
    if (!typeHandler || !typeHandler.create) return;
    clearPluginHover();
    // Enrich state with the current page dimensions in PDF points so plugin
    // handlers don't need to derive them from canvas geometry (which mixes
    // DPR + zoom). doc.pageDims is populated by createBlankPDF and renderPage
    // from page.view (the canonical PDF MediaBox), and stays consistent with
    // the actual rendered page regardless of zoom or pan.
    const currentPage = doc?.currentPage || 1;
    const dims = doc?.pageDims?.[currentPage];
    if (!dims) {
      console.warn(`[plugin-tool] doc.pageDims[${currentPage}] missing; aborting plugin click`);
      return;
    }
    const enrichedState = {
      ...state,
      docScale: doc?.scale || 1,
      devicePixelRatio: window.devicePixelRatio || 1,
      pageWidth: dims.widthPt,
      pageHeight: dims.heightPt,
      currentPage,
    };
    const annProps = typeHandler.create(x, y, x, y, e, enrichedState);
    if (!annProps) return;
    const ann = ctx.createAnnotation({ ...annProps, page: doc?.currentPage || 1, ...state.toolOverrides });
    if (doc) doc.annotations.push(ann);
    ctx.recordAdd(ann);
    ctx.redraw();
  },
};
