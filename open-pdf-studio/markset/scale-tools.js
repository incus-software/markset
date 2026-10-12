// Markset: Set Scale and Calibrate on the Annotation tab, next to the
// measuring tools. Upstream has both in its calibration dialog, but reaches
// it only from a measured line's right-click menu.
//
//  - Set Scale opens the dialog on its scale tab (US architectural and
//    engineering scales, or read from the title block).
//  - Calibrate is a two-click tool: click both ends of a dimension you know,
//    then type its real length (12'-6", 3.5 m, ...). The dialog sets the
//    document's measuring scale and updates the existing measurements.
//
// Areas drawn at another scale (enlarged plans, details) still use a scale
// region from the Drawing tab; a region wins over the document scale.
import { registerTool } from '../js/tools/tool-registry.js';
import { applyToolTransform } from '../js/tools/tool-context.js';
import { openDialog } from '../js/solid/stores/dialogStore.js';
import { updateStatusMessage } from '../js/ui/chrome/status-bar.js';
import { referenceLength } from './scale-reference.js';

export const CALIBRATE_TOOL = 'marksetCalibrate';

/** Open the scale dialog on the scale tab. */
export function openSetScale() {
  openDialog('calibration', { method: 'ratio' });
}

/** Start the two-click calibrate tool. */
export async function startCalibrate() {
  const { setTool } = await import('../js/tools/manager.js');
  setTool(CALIBRATE_TOOL);
  updateStatusMessage('Calibrate: click one end of a dimension you know.', 6000);
}

function makeCalibrateTool() {
  const st = { p1: null };
  const point = (ctx) => {
    const s = ctx.snap(ctx.x, ctx.y);
    return s.snapped ? { x: s.x, y: s.y, snap: s } : { x: ctx.x, y: ctx.y, snap: s };
  };
  return {
    name: CALIBRATE_TOOL,
    cursor: 'crosshair',

    onPointerDown(ctx, e) {
      if (e.button === 2) { st.p1 = null; ctx.redraw(); return; }
      if (e.button !== 0) return;
      const p = point(ctx);
      if (!st.p1) {
        st.p1 = { x: p.x, y: p.y };
        updateStatusMessage('Calibrate: click the other end.', 6000);
        return;
      }
      const len = referenceLength(st.p1, p, ctx.scale);
      if (!len) return;
      st.p1 = null;
      ctx.redraw();
      import('../js/tools/manager.js').then((m) => m.setTool('select'));
      openDialog('calibration', { referencePixelLength: len });
      updateStatusMessage('Calibrate: type the real length of the line you drew.', 6000);
    },

    onPointerMove(ctx) {
      const p = point(ctx);
      ctx.redraw();
      if (st.p1) {
        const c = ctx.canvasCtx;
        c.save();
        applyToolTransform(c);
        c.strokeStyle = '#0066ff';
        c.lineWidth = 1.5 / (ctx.scale || 1);
        c.setLineDash([6 / (ctx.scale || 1), 4 / (ctx.scale || 1)]);
        c.beginPath();
        c.moveTo(st.p1.x, st.p1.y);
        c.lineTo(p.x, p.y);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = '#0066ff';
        for (const q of [st.p1, p]) {
          c.beginPath();
          c.arc(q.x, q.y, 3 / (ctx.scale || 1), 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
      if (p.snap?.snapped) ctx.drawSnapIndicator(p.snap);
    },

    onEscape(ctx) {
      if (st.p1) { st.p1 = null; ctx.redraw(); return true; }
      return false;
    },

    onDeactivate(ctx) {
      st.p1 = null;
      ctx.redraw();
    },
  };
}

let registered = false;
/** Register the Calibrate tool once (the Annotation tab imports this module). */
export function registerMarksetScaleTools() {
  if (registered) return;
  registerTool(CALIBRATE_TOOL, makeCalibrateTool());
  registered = true;
}
