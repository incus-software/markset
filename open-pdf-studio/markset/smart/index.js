// Markset: smart (parametric) US drawing symbols. Registers the templates
// with the upstream registry, builds their palette entries, sizes them to the
// sheet on placement, and writes their PDF appearance as vectors.
//
// Pure apart from the registry import, so it runs under `node --test`.
import { registerTemplate, unregisterTemplate, getTemplate } from '../../js/symbols/registry.js';
import { MARKSET_TEMPLATES } from './templates.js';
import { cmdsToSvg } from './cmds-svg.js';
import { svgToPdfAppearance } from '../svg-to-pdf.js';
import { sheetSymbolHeight } from '../library/sizing.js';
import { contentSize, templateColors } from './hooks.js';
import { freezeCmds, frozenTemplate } from './assets.js';

let registered = false;

/** Register every Markset template once (js/main.js calls this at start-up). */
export function registerMarksetTemplates() {
  if (registered) return;
  for (const t of MARKSET_TEMPLATES) registerTemplate(t);
  registered = true;
}

const defaults = (t) => Object.fromEntries((t.params || []).map(p => [p.key, p.default]));
const pluginTemplates = new Set();

/**
 * A plugin's smart template (api.registerParametricTemplate): registered with
 * the upstream registry and treated like a bundled Markset one (sizing,
 * colours, vector appearance, frozen copy). Returns a function that removes it.
 */
export function registerPluginTemplate(t) {
  if (!t?.id || typeof t.render !== 'function') throw new TypeError('A template needs an id and a render function');
  const tpl = { category: 'US', params: [], ...t, markset: { ...(t.markset || {}) } };
  if (!(tpl.defaultSize?.width > 0 && tpl.defaultSize?.height > 0)) {
    tpl.defaultSize = contentSize(tpl, defaults(tpl)) || { width: 72, height: 72 };
  }
  registerTemplate(tpl);
  pluginTemplates.add(tpl);
  return () => {
    pluginTemplates.delete(tpl);
    if (getTemplate(tpl.id) === tpl) unregisterTemplate(tpl.id);
  };
}

const isMarkset = (t) => !!t?.markset &&
  (MARKSET_TEMPLATES.includes(t) || pluginTemplates.has(t) || t.frozen === true);

/** The template an annotation draws with: its own, or a stand-in for its frozen copy. */
export function smartTemplateFor(ann) {
  return getTemplate(ann?.symbolId) || frozenTemplate(ann);
}

/**
 * OPS_Frozen for a Markset symbol: its commands relative to its box (see
 * assets.js). A symbol whose template is missing keeps the copy it came with.
 */
export function frozenForSave(ann) {
  const t = getTemplate(ann?.symbolId);
  if (!t) return ann?.frozen || null;
  if (!isMarkset(t) || !(ann.width > 0) || !(ann.height > 0)) return null;
  const box = { x: 0, y: 0, width: Math.abs(ann.width), height: Math.abs(ann.height) };
  try { return freezeCmds(renderTemplate(t, ann.params, box), box, ann.params || {}); } catch { return null; }
}

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
export function smartPaletteEntries(reviewColor = '#ff0000', group = 'starter') {
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
 * templates that are not Markset's (they keep upstream's sizing). A template
 * with a printed size (markset.contentSize, e.g. a review stamp) is placed at
 * it, whatever the sheet.
 */
export function smartPlacementBox(t, x, y, pageW, pageH, scale = 1, params = null) {
  if (!isMarkset(t)) return null;
  const size = contentSize(t, { ...defaults(t), ...(params || {}) });
  if (size) return { x: x - size.width / 2, y: y - size.height / 2, width: size.width, height: size.height };
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

/** Color overrides for a new annotation: the template's own (a stamp's ink), else the review color for review symbols. */
export function smartColors(t, reviewColor, params = null) {
  if (!isMarkset(t)) return {};
  const own = templateColors(t, params);
  if (own) return own;
  if (t.markset.role !== 'review') return {};
  const c = reviewColor || '#ff0000';
  return { color: c, strokeColor: c };
}

const FONTS = { F1: 'Helvetica', F2: 'Helvetica-Bold' };

/**
 * Embeds the images a Markset symbol draws (a stamp's logo) so the sync
 * appearance writer below can place them. Data-URL PNG or JPEG only; an
 * image that cannot be embedded is left out. Returns [{ cmd, ref }] in the
 * order of the image commands.
 */
const embedded = new WeakMap(); // pdf-lib document -> Map(image src -> embedded image ref)

export async function embedSmartImages(ann, pdfDoc) {
  const t = smartTemplateFor(ann);
  if (!isMarkset(t) || !pdfDoc || !(ann.width > 0) || !(ann.height > 0)) return [];
  const box = { x: 0, y: 0, width: Math.abs(ann.width), height: Math.abs(ann.height) };
  let cache = embedded.get(pdfDoc);
  if (!cache) embedded.set(pdfDoc, (cache = new Map()));
  const out = [];
  for (const cmd of renderTemplate(t, ann.params, box)) {
    if (cmd?.kind !== 'image') continue;
    const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(String(cmd.src || ''));
    if (!m) continue;
    try {
      let ref = cache.get(cmd.src);
      if (!ref) {
        const bytes = Uint8Array.from(atob(m[2]), ch => ch.charCodeAt(0));
        const img = m[1].toLowerCase() === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        ref = img.ref;
        cache.set(cmd.src, ref); // one image per PDF, however many stamps show it
      }
      out.push({ cmd, ref });
    } catch { /* not a readable image: skipped */ }
  }
  return out;
}

/**
 * Vector /AP for a Markset parametricSymbol (saver.js). The /Rect is the
 * rotated symbol's envelope (rectW x rectH); the symbol is drawn unrotated
 * around its centre and rotated into it. Returns false — and the saver keeps
 * its PNG appearance — for upstream templates, rotated pages or anything the
 * converters do not draw. `images` are from embedSmartImages().
 */
export function writeVectorParametricAppearance({ ann, annotDict, context, pdf, rectW, rectH, opacity = 1, pageRot = 0, images = [] }) {
  const t = smartTemplateFor(ann);
  if (!isMarkset(t) || pageRot || !(ann.width > 0) || !(ann.height > 0)) return false;
  const box = { x: 0, y: 0, width: Math.abs(ann.width), height: Math.abs(ann.height) };
  const cmds = renderTemplate(t, ann.params, box);
  const svg = cmdsToSvg(cmds.filter(c => c?.kind !== 'image'), box, { color: ann.strokeColor || '#000000' });
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
  // Images: command boxes are y-down from the symbol's top-left.
  const xobj = {};
  let imageOps = '';
  images.forEach(({ cmd, ref }, i) => {
    if (!ref || !(cmd?.width > 0) || !(cmd?.height > 0)) return;
    xobj[`Im${i}`] = ref;
    imageOps += `q\n${r(cmd.width)} 0 0 ${r(cmd.height)} ${r(cmd.x)} ${r(box.height - cmd.y - cmd.height)} cm\n/Im${i} Do\nQ\n`;
  });
  const resources = {};
  if (Object.keys(fonts).length) resources.Font = context.obj(fonts);
  if (Object.keys(extG).length) resources.ExtGState = context.obj(extG);
  if (Object.keys(xobj).length) resources.XObject = context.obj(xobj);

  const content = `q\n${opacity < 1 ? '/GSA gs\n' : ''}${place}${imageOps}${ap.ops}Q\n`;
  const stream = context.stream(content, {
    Type: 'XObject', Subtype: 'Form', BBox: [0, 0, rectW, rectH], Resources: context.obj(resources),
  });
  annotDict.set(pdf.PDFName.of('AP'), context.obj({ N: context.register(stream) }));
  return true;
}
