// Markset: a sheet's calibration (page-scale.js) is saved in the PDF itself,
// as a standard measurement viewport (ISO 32000 12.9: page /VP with a
// /Measure /RL dictionary) covering the whole page, named "Markset
// calibration". Bluebeam, Acrobat and Markset on another computer read it.
//
// The scale entries a CAD program wrote on that page are what overrode the
// calibration, so they are taken out of /VP and kept under /OPS_OriginalVP;
// when the page's calibration is reset, they go back.
//
// Opening: pdf-viewports.js reads every /VP; restorePageCalibrations (in
// page-scale.js) turns the Markset one back into the page's calibration.
import { MARKSET_VP_NAME } from './page-scale.js';

const r6 = (v) => Number(v.toPrecision(12)); // 12 significant digits

/** The /Measure number formats for a scale of `ppu` points per `unit`. */
export function measureFormats(ppu, unit) {
  const c = r6(1 / ppu); // real units per PDF point
  if (unit === 'ft') {
    return {
      X: [{ U: 'ft', C: c }],
      // Display as feet and inches to 1/16" (a second format refines the first).
      D: [{ U: 'ft', C: 1, F: 'T' }, { U: 'in', C: 12, F: 'F', D: 16 }],
      A: [{ U: 'sq ft', C: 1 }],
    };
  }
  if (unit === 'in') {
    return { X: [{ U: 'in', C: c }], D: [{ U: 'in', C: 1, F: 'F', D: 16 }], A: [{ U: 'sq in', C: 1 }] };
  }
  return { X: [{ U: unit, C: c }], D: [{ U: unit, C: 1, F: 'D', D: 100 }], A: [{ U: `sq ${unit}`, C: 1 }] };
}

const isMarkset = (dict, PDFName) => {
  const n = dict?.lookup?.(PDFName.of('Name'));
  return !!n && typeof n.decodeText === 'function' && n.decodeText() === MARKSET_VP_NAME;
};

/**
 * Write the calibrations of `measureScale.pages` into `pdfDoc` (pdf-lib).
 * Pages without a calibration lose a Markset viewport they had and get their
 * original viewports back. `lib` = { PDFName, PDFArray, PDFString }.
 * Returns the number of pages written.
 */
export function writePageCalibrations(pdfDoc, measureScale, lib) {
  const { PDFName, PDFArray, PDFString } = lib;
  const ctx = pdfDoc.context;
  const pages = pdfDoc.getPages();
  const cal = measureScale?.pages || {};
  let written = 0;
  pages.forEach((page, i) => {
    const node = page.node;
    const s = cal[i + 1];
    const vp = node.lookup(PDFName.of('VP'));
    const entries = vp instanceof PDFArray ? Array.from({ length: vp.size() }, (_, k) => vp.get(k)) : [];
    const others = entries.filter(e => !isMarkset(ctx.lookup(e), PDFName));
    const saved = node.lookup(PDFName.of('OPS_OriginalVP'));

    if (!(s?.pixelsPerUnit > 0)) {
      // Not calibrated (any more): drop our viewport, restore the originals.
      if (saved instanceof PDFArray) {
        node.set(PDFName.of('VP'), saved);
        node.delete(PDFName.of('OPS_OriginalVP'));
      } else if (entries.length !== others.length) {
        if (others.length) node.set(PDFName.of('VP'), ctx.obj(others));
        else node.delete(PDFName.of('VP'));
      }
      return;
    }

    if (!(saved instanceof PDFArray) && others.length) node.set(PDFName.of('OPS_OriginalVP'), ctx.obj(others));
    const box = page.getMediaBox();
    const f = measureFormats(s.pixelsPerUnit, s.unit || 'mm');
    const fmt = (o) => {
      const d = { Type: 'NumberFormat', U: PDFString.of(o.U), C: o.C };
      if (o.F) d.F = o.F; // a name: /D, /F, /T
      if (o.D) d.D = o.D;
      return ctx.obj(d);
    };
    const measure = ctx.obj({
      Type: 'Measure', Subtype: 'RL',
      R: PDFString.of(s.label || (s.scaleRatio ? s.scaleRatio : 'Calibrated')),
      X: ctx.obj(f.X.map(fmt)), D: ctx.obj(f.D.map(fmt)), A: ctx.obj(f.A.map(fmt)),
    });
    const viewport = ctx.obj({
      Type: 'Viewport',
      BBox: [box.x, box.y, box.x + box.width, box.y + box.height],
      Name: PDFString.of(MARKSET_VP_NAME),
      Measure: measure,
    });
    node.set(PDFName.of('VP'), ctx.obj([viewport]));
    written++;
  });
  return written;
}
