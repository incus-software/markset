// Markset: smart (parametric) US drawing symbols. Registers the templates
// with the upstream registry, builds their palette entries, sizes them to the
// sheet on placement, and writes their PDF appearance as vectors.
//
// Pure apart from the registry import, so it runs under `node --test`.
import { registerTemplate, getTemplate } from '../../js/symbols/registry.js';
import { MARKSET_TEMPLATES } from './templates.js';
import { cmdsToSvg } from './cmds-svg.js';
import { svgToPdfAppearance } from '../svg-to-pdf.js';
import { sheetSymbolHeight } from '../library/sizing.js';

let registered = false;

/** Register every Markset template once (js/main.js calls this at start-up). */
export function registerMarksetTemplates() {
  if (registered) return;
  for (const t of MARKSET_TEMPLATES) registerTemplate(t);
  registered = true;
}

const isMarkset = (t) => !!t?.markset && MARKSET_TEMPLATES.includes(t);
const defaults = (t) => Object.fromEntries(t.params.map(p => [p.key, p.default]));

/** A template's commands for `params`, drawn into `box`. */
export function renderTemplate(t, params, box) {
  return t.render({ ...defaults(t), ...(params || {}) }, box) || [];
}

/** 64-unit-high SVG preview of a template with its default values. */
export function templatePreviewSvg(t, color = '#000') {
  const box = { x: 0, y: 0, width: 64 * (t.defaultSize.width / t.defaultSize.height), height: 64 };
  return cmdsToSvg(renderTemplate(t, {}, box), box, { color });
}

/**
 * Palette entries for a bundled group: templates whose markset.group is
 * `group` ('starter' when unset; wiring runs are 'electrical').
 */
export function smartPaletteEntries(reviewColor = '#dd0000', group = 'starter') {
  return MARKSET_TEMPLATES.filter(t => (t.markset.group || 'starter') === group).map(t => ({
    id: `smart-${t.id}`,
    name: t.nameEn,
    parametricId: t.id,
    svg: templatePreviewSvg(t, t.markset.role === 'review' ? reviewColor : '#000'),
    markset: { ...t.markset, id: t.id, smart: true },
  }));
}

/**
 * The placed box for a click at (x, y): the template's printed height on
 * this sheet, width from its default aspect, centred on the click. Null for
 * templates that are not Markset's (they keep upstream's sizing).
 */
export function smartPlacementBox(t, x, y, pageW, pageH, scale = 1) {
  if (!isMarkset(t)) return null;
  const h = sheetSymbolHeight(t.markset.paperHeightIn, pageW, pageH);
  if (!h) return null;
  const hh = h * (scale > 0 ? scale : 1);
  const w = hh * (t.defaultSize.width / t.defaultSize.height);
  return { x: x - w / 2, y: y - hh / 2, width: w, height: hh };
}

/**
 * Two-point Markset templates (wiring runs): the band height and the length
 * used for a plain click, both from the sheet size. Null for others.
 */
export function smartTwoPointSize(t, pageW, pageH, scale = 1) {
  if (!isMarkset(t) || t.placement !== 'two-point' || !(t.markset.bandHeightIn > 0)) return null;
  const band = sheetSymbolHeight(t.markset.bandHeightIn, pageW, pageH);
  if (!band) return null;
  const s = scale > 0 ? scale : 1;
  return { band: band * s, length: band * (t.markset.lengthIn / t.markset.bandHeightIn) };
}

/** Color overrides for a new annotation: review symbols take the review color. */
export function smartColors(t, reviewColor) {
  if (!isMarkset(t) || t.markset.role !== 'review') return {};
  const c = reviewColor || '#dd0000';
  return { color: c, strokeColor: c };
}

const FONTS = { F1: 'Helvetica', F2: 'Helvetica-Bold' };

/**
 * Vector /AP for a Markset parametricSymbol (saver.js). The /Rect is the
 * rotated symbol's envelope (rectW x rectH); the symbol is drawn unrotated
 * around its centre and rotated into it. Returns false — and the saver keeps
 * its PNG appearance — for upstream templates, rotated pages or anything the
 * converters do not draw.
 */
export function writeVectorParametricAppearance({ ann, annotDict, context, pdf, rectW, rectH, opacity = 1, pageRot = 0 }) {
  const t = getTemplate(ann?.symbolId);
  if (!isMarkset(t) || pageRot || !(ann.width > 0) || !(ann.height > 0)) return false;
  const box = { x: 0, y: 0, width: Math.abs(ann.width), height: Math.abs(ann.height) };
  const svg = cmdsToSvg(renderTemplate(t, ann.params, box), box, { color: ann.strokeColor || '#000000' });
  const ap = svg && svgToPdfAppearance(svg, box.width, box.height);
  if (!ap) return false;

  // Screen rotation is clockwise with y down; in PDF space (y up) that is
  // the negative angle.
  const rad = (-(ann.rotation || 0) * Math.PI) / 180;
  const c = Math.round(Math.cos(rad) * 1e6) / 1e6, s = Math.round(Math.sin(rad) * 1e6) / 1e6;
  const r = (v) => Math.round(v * 1e4) / 1e4;
  const place = `1 0 0 1 ${r(rectW / 2)} ${r(rectH / 2)} cm\n${c} ${s} ${-s} ${c} 0 0 cm\n1 0 0 1 ${r(-box.width / 2)} ${r(-box.height / 2)} cm\n`;

  const extG = {};
  for (const g of ap.gstates) extG[g.name] = context.obj({ Type: 'ExtGState', ca: g.ca, CA: g.CA });
  if (opacity < 1) extG.GSA = context.obj({ Type: 'ExtGState', ca: opacity, CA: opacity });
  const fonts = {};
  for (const f of ap.fonts) fonts[f] = context.obj({ Type: 'Font', Subtype: 'Type1', BaseFont: FONTS[f], Encoding: 'WinAnsiEncoding' });
  const resources = {};
  if (Object.keys(fonts).length) resources.Font = context.obj(fonts);
  if (Object.keys(extG).length) resources.ExtGState = context.obj(extG);

  const content = `q\n${opacity < 1 ? '/GSA gs\n' : ''}${place}${ap.ops}Q\n`;
  const stream = context.stream(content, {
    Type: 'XObject', Subtype: 'Form', BBox: [0, 0, rectW, rectH], Resources: context.obj(resources),
  });
  annotDict.set(pdf.PDFName.of('AP'), context.obj({ N: context.register(stream) }));
  return true;
}
