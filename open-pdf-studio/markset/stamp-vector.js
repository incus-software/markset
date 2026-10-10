// Markset: write a symbol stamp's appearance as vector drawing commands.
//
// Called from the stamp case in js/pdf/saver.js. When the stamp carries its
// SVG (ann.stampSvg) and svg-to-pdf.js can draw it, the appearance stream gets
// the vector version and the SVG is stored in OPS_StampSvg, so a reopened
// stamp can still be recolored. Otherwise it returns false and the saver
// embeds the PNG as before.
import { svgToPdfAppearance } from './svg-to-pdf.js';

const FONTS = { F1: 'Helvetica', F2: 'Helvetica-Bold' };

/**
 * @param {object} o
 * @param {object} o.ann         the stamp annotation (width/height in PDF points)
 * @param {object} o.annotDict   the stamp's annotation dictionary
 * @param {object} o.context     pdf-lib PDFContext
 * @param {object} o.pdf         { PDFName, PDFHexString } from pdf-lib
 * @param {{prefix: string, visW: number, visH: number}} o.compensation
 *        pageCompensationForAp(width, height, pageRotation)
 * @returns {boolean} true when the vector appearance was written
 */
export function writeVectorStampAppearance({ ann, annotDict, context, pdf, compensation }) {
  if (!ann?.stampSvg || ann.stampText) return false;
  const { prefix = '', visW, visH } = compensation || {};
  const ap = svgToPdfAppearance(ann.stampSvg, visW, visH);
  if (!ap) return false;

  const alpha = ann.opacity !== undefined ? ann.opacity : 1;
  const extG = {};
  for (const g of ap.gstates) extG[g.name] = context.obj({ Type: 'ExtGState', ca: g.ca, CA: g.CA });
  if (alpha < 1) extG.GSA = context.obj({ Type: 'ExtGState', ca: alpha, CA: alpha });
  const fonts = {};
  for (const f of ap.fonts) {
    fonts[f] = context.obj({ Type: 'Font', Subtype: 'Type1', BaseFont: FONTS[f], Encoding: 'WinAnsiEncoding' });
  }
  const resources = {};
  if (Object.keys(fonts).length) resources.Font = context.obj(fonts);
  if (Object.keys(extG).length) resources.ExtGState = context.obj(extG);

  const content = `q\n${alpha < 1 ? '/GSA gs\n' : ''}${prefix}${ap.ops}Q\n`;
  const stream = context.stream(content, {
    Type: 'XObject', Subtype: 'Form', BBox: [0, 0, ann.width, ann.height],
    Resources: context.obj(resources),
  });
  annotDict.set(pdf.PDFName.of('AP'), context.obj({ N: context.register(stream) }));
  annotDict.set(pdf.PDFName.of('OPS_StampSvg'), pdf.PDFHexString.fromText(ann.stampSvg));
  return true;
}
