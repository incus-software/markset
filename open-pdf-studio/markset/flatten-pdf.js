// Markset: flatten a PDF's markups into its pages, for a copy to send.
//
// Each visible markup's appearance (/AP /N) is drawn into the page content
// at the markup's /Rect, the way the PDF standard places an appearance
// (ISO 32000 12.5.5): the appearance box, after its own /Matrix, is mapped
// onto /Rect. The markup itself is then removed, so every viewer and printer
// shows the notes as part of the drawing, in vector, like a flattened set.
//
// Left as they are: links, form fields, and markups without an appearance.
// Hidden markups (flag Hidden or NoView) are removed without drawing.
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFStream, PDFNumber,
  pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } from 'pdf-lib';

const KEEP = new Set(['/Link', '/Widget', '/Popup']);
const HIDDEN = 2, NO_VIEW = 32;

const num = (v) => (v instanceof PDFNumber ? v.asNumber() : Number(String(v)));
const nums = (ctx, v) => {
  const a = ctx.lookup(v);
  return a instanceof PDFArray ? a.asArray().map((x) => num(ctx.lookup(x))) : null;
};

/** The normal appearance stream of an annotation (by /AS when /N has states). */
function normalAppearance(ctx, annot) {
  const ap = ctx.lookup(annot.get(PDFName.of('AP')));
  if (!(ap instanceof PDFDict)) return null;
  const nRaw = ap.get(PDFName.of('N'));
  const n = ctx.lookup(nRaw);
  if (n instanceof PDFStream) return { ref: nRaw instanceof PDFRef ? nRaw : ctx.register(n), stream: n };
  if (n instanceof PDFDict) {
    const as = annot.get(PDFName.of('AS'));
    const pick = as ? n.get(as) : null;
    const s = pick && ctx.lookup(pick);
    if (s instanceof PDFStream) return { ref: pick instanceof PDFRef ? pick : ctx.register(s), stream: s };
  }
  return null;
}

/** The matrix that places an appearance with BBox and Matrix onto Rect. */
export function placementMatrix(bbox, matrix, rect) {
  const [a, b, c, d, e, f] = matrix || [1, 0, 0, 1, 0, 0];
  const corners = [[bbox[0], bbox[1]], [bbox[2], bbox[1]], [bbox[0], bbox[3]], [bbox[2], bbox[3]]]
    .map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
  const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
  const tx1 = Math.min(...xs), tx2 = Math.max(...xs), ty1 = Math.min(...ys), ty2 = Math.max(...ys);
  const rx1 = Math.min(rect[0], rect[2]), rx2 = Math.max(rect[0], rect[2]);
  const ry1 = Math.min(rect[1], rect[3]), ry2 = Math.max(rect[1], rect[3]);
  if (!(tx2 - tx1 > 0) || !(ty2 - ty1 > 0)) return null;
  const sx = (rx2 - rx1) / (tx2 - tx1), sy = (ry2 - ry1) / (ty2 - ty1);
  return [sx, 0, 0, sy, rx1 - sx * tx1, ry1 - sy * ty1];
}

/**
 * Flatten the markups of a PDF.
 * @param {Uint8Array} bytes
 * @returns {Promise<{ bytes: Uint8Array, flattened: number, kept: number }>}
 */
export async function flattenPdf(bytes) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const ctx = pdf.context;
  let flattened = 0, kept = 0, n = 0;
  for (const page of pdf.getPages()) {
    const annots = ctx.lookup(page.node.get(PDFName.of('Annots')));
    if (!(annots instanceof PDFArray)) continue;
    const keep = [];
    const drawn = new Set(); // refs of flattened markups, to drop their popups
    const ops = [];
    for (const ref of annots.asArray()) {
      const annot = ctx.lookup(ref);
      if (!(annot instanceof PDFDict)) continue;
      const subtype = String(annot.get(PDFName.of('Subtype')));
      if (KEEP.has(subtype)) { keep.push(ref); continue; }
      const flags = num(ctx.lookup(annot.get(PDFName.of('F'))) ?? 0) || 0;
      if (flags & (HIDDEN | NO_VIEW)) { drawn.add(String(ref)); continue; }
      const ap = normalAppearance(ctx, annot);
      const rect = nums(ctx, annot.get(PDFName.of('Rect')));
      if (!ap || !rect) { keep.push(ref); kept++; continue; }
      const dict = ap.stream.dict;
      const bbox = nums(ctx, dict.get(PDFName.of('BBox'))) || [rect[0], rect[1], rect[2], rect[3]];
      const m = placementMatrix(bbox, nums(ctx, dict.get(PDFName.of('Matrix'))), rect);
      if (!m) { drawn.add(String(ref)); continue; } // an empty appearance draws nothing
      // A form XObject, as the page's resources need it.
      if (!dict.get(PDFName.of('Type'))) dict.set(PDFName.of('Type'), PDFName.of('XObject'));
      if (!dict.get(PDFName.of('Subtype'))) dict.set(PDFName.of('Subtype'), PDFName.of('Form'));
      const name = page.node.newXObject(`MsFlat${++n}`, ap.ref);
      ops.push(pushGraphicsState(), concatTransformationMatrix(...m), drawObject(name), popGraphicsState());
      drawn.add(String(ref));
      flattened++;
    }
    // A popup of a flattened markup goes with it.
    const remaining = keep.filter((ref) => {
      const a = ctx.lookup(ref);
      if (String(a?.get?.(PDFName.of('Subtype'))) !== '/Popup') return true;
      const parent = a.get(PDFName.of('Parent'));
      return !(parent && drawn.has(String(parent)));
    });
    if (ops.length) page.pushOperators(...ops);
    if (remaining.length) page.node.set(PDFName.of('Annots'), ctx.obj(remaining));
    else page.node.delete(PDFName.of('Annots'));
  }
  return { bytes: await pdf.save(), flattened, kept };
}
