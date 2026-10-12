// Markset: the submittal review stamp (shop drawing stamp) as a smart
// template. A user builds a stamp in the Stamp Builder (logo, firm, title,
// checkbox list, By / Date lines, limitation text); the whole design lives in
// the annotation's params, so a placed stamp is self-contained: it reopens,
// edits and saves the same on any machine.
//
// The stamp has a real printed size: `widthIn` inches wide, the limitation
// text at `discPt` points. Heights follow from the content (text wraps with
// Helvetica metrics, the same font the PDF appearance uses).
//
// Pure: no DOM, runs under `node --test`.
import { helveticaWidth } from '../svg-to-pdf.js';

export const STAMP_TEMPLATE_ID = 'markset-review-stamp';

export const REVIEW_TERMS = [
  'No Exceptions Taken', 'Make Corrections Noted', 'Revise and Resubmit', 'Rejected',
];
export const APPROVAL_TERMS = ['Approved', 'Approved as Noted', 'Revise and Resubmit', 'Rejected'];
export const NOT_REQUIRED = 'Not Required, Returned Without Action';
export const DELEGATED = 'Delegated Design: Reviewed for Design Concept Only';

// Generic limitation text following AIA A201-2017 §3.12 / §4.2.7 and
// insurer practice. Not legal advice: firms should match it to their
// owner-architect agreement and Section 01 33 00.
export const DEFAULT_DISCLAIMER =
  'REVIEW IS ONLY FOR GENERAL CONFORMANCE WITH INFORMATION GIVEN AND THE DESIGN CONCEPT EXPRESSED IN THE CONTRACT DOCUMENTS. ' +
  'REVIEW IS NOT FOR DETERMINING ACCURACY OR COMPLETENESS OF DETAILS SUCH AS DIMENSIONS AND QUANTITIES, FOR SUBSTANTIATING ' +
  'INSTRUCTIONS FOR INSTALLATION OR PERFORMANCE OF EQUIPMENT OR SYSTEMS, OR FOR CONSTRUCTION MEANS, METHODS, TECHNIQUES, ' +
  'SEQUENCES, PROCEDURES OR SAFETY PRECAUTIONS. APPROVAL OF A SPECIFIC ITEM DOES NOT INDICATE APPROVAL OF AN ASSEMBLY OF ' +
  'WHICH IT IS A COMPONENT. THE CONTRACTOR REMAINS RESPONSIBLE FOR COMPLIANCE WITH THE CONTRACT DOCUMENTS; FOR CONFIRMING ' +
  'AND CORRELATING QUANTITIES AND FIELD DIMENSIONS; FOR COORDINATING THE WORK OF ALL TRADES; AND FOR DEVIATIONS NOT ' +
  'SPECIFICALLY IDENTIFIED IN WRITING. MARKINGS DO NOT CHANGE THE CONTRACT SUM OR CONTRACT TIME; CHANGES REQUIRE A CHANGE ' +
  'ORDER OR CONSTRUCTION CHANGE DIRECTIVE.';

/** Common stamp widths in inches (R9 in the stamp requirements). */
export const STAMP_WIDTHS = [
  { value: 3, label: '3.0" (8.5x11 product data)' },
  { value: 3.5, label: '3.5"' },
  { value: 4, label: '4.0" (standard)' },
  { value: 4.5, label: '4.5" (24x36 and larger)' },
];
export const DISCLAIMER_SIZES = [6, 7, 8, 9];
export const MIN_RECOMMENDED_PT = 7;

/** The design a new stamp starts from. */
export function defaultStampDesign() {
  return {
    name: 'Submittal Review',
    firm: 'YOUR FIRM NAME',
    title: 'SUBMITTAL REVIEW',
    logo: '',
    logoAspect: 1,
    actions: [...REVIEW_TERMS, NOT_REQUIRED].join('\n'),
    showProject: true,
    showSubmittal: true,
    showBy: true,
    showDate: true,
    disclaimer: DEFAULT_DISCLAIMER,
    discPt: 8,
    widthIn: 4,
    ink: '#000000',
  };
}

/** Per-placement values: which box is checked and the filled-in lines. */
export const PLACEMENT_DEFAULTS = { checked: -1, projectNo: '', submittalNo: '', by: '', date: '' };

/** The checkbox labels of a design (one per line, blank lines dropped). */
export function actionList(p) {
  return String(p?.actions ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

/** Words of `text` wrapped to `maxW` at `size` (Helvetica). */
export function wrapText(text, size, maxW, bold = false) {
  const lines = [];
  for (const para of String(text ?? '').split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (line && helveticaWidth(t, size, bold) > maxW) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Longest prefix of `text` that fits `maxW`, with an ellipsis when cut. */
function fit(text, size, maxW, bold = false) {
  const s = String(text ?? '');
  if (helveticaWidth(s, size, bold) <= maxW) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (helveticaWidth(s.slice(0, mid) + '...', size, bold) <= maxW) lo = mid; else hi = mid - 1;
  }
  return s.slice(0, lo) + '...';
}

const text = (t, x, y, size, opts = {}) => ({ kind: 'text', text: t, x, y, size, align: 'start', ...opts });
const line = (x1, y1, x2, y2, lineWidth) => ({ kind: 'line', x1, y1, x2, y2, lineWidth });
const rect = (x, y, w, h, lineWidth) => ({
  kind: 'polyline', close: true, lineWidth,
  points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }],
});

/**
 * The stamp at its true size in PDF points (1/72 in), drawn from (0, 0).
 * Text commands are left-aligned (`align: 'start'`) and centred vertically
 * on their y. Returns { width, height, cmds, discLines }.
 */
export function stampLayout(params) {
  const p = { ...defaultStampDesign(), ...PLACEMENT_DEFAULTS, ...(params || {}) };
  const W = Math.max(1, Number(p.widthIn) || 4) * 72;
  const u = W / 288; // layout units: designed on a 4" (288 pt) stamp
  const pad = 10 * u;
  const inner = W - pad * 2;
  const cmds = [];
  let y = pad;

  // Header: logo left, firm and title beside it, a rule underneath.
  const logoH = 30 * u;
  let tx = pad;
  if (p.logo) {
    const aspect = Number(p.logoAspect) > 0 ? Number(p.logoAspect) : 1;
    let lw = logoH * aspect, lh = logoH;
    if (lw > W * 0.35) { lw = W * 0.35; lh = lw / aspect; }
    cmds.push({ kind: 'image', src: p.logo, x: pad, y: y + (logoH - lh) / 2, width: lw, height: lh });
    tx = pad + lw + 7 * u;
  }
  const firmSize = 12 * u, titleSize = 9.5 * u;
  const colW = W - pad - tx;
  const hasFirm = !!String(p.firm).trim(), hasTitle = !!String(p.title).trim();
  if (hasFirm && hasTitle) {
    cmds.push(text(fit(p.firm, firmSize, colW, true), tx, y + logoH / 2 - 7 * u, firmSize, { bold: true }));
    cmds.push(text(fit(p.title, titleSize, colW), tx, y + logoH / 2 + 8 * u, titleSize));
  } else if (hasFirm || hasTitle) {
    cmds.push(text(fit(hasFirm ? p.firm : p.title, firmSize, colW, true), tx, y + logoH / 2, firmSize, { bold: true }));
  }
  y += logoH + 5 * u;
  cmds.push(line(pad, y, W - pad, y, 0.9 * u));
  y += 4 * u;

  // Fill-in lines: label, then a rule to the right edge with the value on it.
  const fieldSize = Math.max(6.5, 7.5 * u); // stays readable on a 3" stamp
  const fields = []; // click-to-edit regions: the fill-in line and the space above it
  const field = (label, value, x0, x1, key) => {
    cmds.push(text(label, x0, y, fieldSize, { bold: true }));
    const lx = x0 + helveticaWidth(label, fieldSize, true) + 3 * u;
    cmds.push(line(lx, y + 4.5 * u, x1, y + 4.5 * u, 0.5 * u));
    fields.push({ key, rect: { x: x0, y: y - fieldSize * 0.8, width: x1 - x0, height: fieldSize * 0.8 + 6 * u } });
    if (String(value ?? '').trim()) cmds.push(text(fit(value, fieldSize, x1 - lx - 2 * u), lx + 2 * u, y, fieldSize, { role: 'value' }));
  };
  if (p.showProject) { y += 8 * u; field('PROJECT NO.:', p.projectNo, pad, W - pad, 'projectNo'); y += 5 * u; }
  if (p.showSubmittal) { y += 8 * u; field('SUBMITTAL NO.:', p.submittalNo, pad, W - pad, 'submittalNo'); y += 5 * u; }

  // Checkboxes, one per action, the checked one with a bold check mark.
  const actions = actionList(p);
  const boxS = 8 * u, rowH = 13 * u, actSize = Math.max(7, 8.5 * u);
  const checked = Number.isInteger(Number(p.checked)) ? Number(p.checked) : -1;
  if (actions.length) y += 5 * u;
  const boxes = []; // click a row to check it
  actions.forEach((label, i) => {
    const cy = y + rowH / 2;
    boxes.push({ index: i, rect: { x: pad, y, width: inner, height: rowH } });
    cmds.push(rect(pad, cy - boxS / 2, boxS, boxS, 0.7 * u));
    cmds.push(text(fit(label, actSize, inner - boxS - 6 * u), pad + boxS + 6 * u, cy, actSize));
    if (i === checked) {
      cmds.push({
        kind: 'polyline', lineWidth: 1.6 * u, role: 'check',
        points: [
          { x: pad + boxS * 0.12, y: cy + boxS * 0.02 },
          { x: pad + boxS * 0.42, y: cy + boxS * 0.38 },
          { x: pad + boxS * 1.15, y: cy - boxS * 0.75 },
        ],
      });
    }
    y += rowH;
  });

  // By / Date.
  if (p.showBy || p.showDate) {
    y += 9 * u;
    const mid = pad + inner * 0.6;
    if (p.showBy && p.showDate) {
      field('BY:', p.by, pad, mid - 6 * u, 'by');
      field('DATE:', p.date, mid, W - pad, 'date');
    } else if (p.showBy) field('BY:', p.by, pad, W - pad, 'by');
    else field('DATE:', p.date, pad, W - pad, 'date');
    y += 5 * u;
  }

  // Limitation text at its true point size.
  const discPt = Math.max(4, Number(p.discPt) || 8); // true points at any width
  const discLines = wrapText(p.disclaimer, discPt, inner);
  if (discLines.length) {
    y += 6 * u;
    const lh = discPt * 1.2;
    for (const l of discLines) {
      cmds.push(text(l, pad, y + lh / 2, discPt));
      y += lh;
    }
  }
  y += pad;
  const H = y;

  // Double border.
  cmds.unshift(rect(1.5 * u, 1.5 * u, W - 3 * u, H - 3 * u, 2 * u), rect(4.5 * u, 4.5 * u, W - 9 * u, H - 9 * u, 0.6 * u));
  return { width: W, height: H, cmds, discLines, fields, boxes };
}

/** The fill-in lines and checkbox rows in `box` coordinates (same fit as stampCommands). */
export function stampRegions(params, box) {
  const { width, height, fields, boxes } = stampLayout(params);
  const s = Math.min(box.width / width, box.height / height);
  if (!(s > 0)) return { fields: [], boxes: [] };
  const ox = box.x + (box.width - width * s) / 2, oy = box.y + (box.height - height * s) / 2;
  const map = (r) => ({ x: ox + r.x * s, y: oy + r.y * s, width: r.width * s, height: r.height * s });
  return {
    fields: fields.map(f => ({ key: f.key, rect: map(f.rect) })),
    boxes: boxes.map(b => ({ index: b.index, rect: map(b.rect) })),
  };
}

const inRect = (r, x, y) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;

/** The checkbox row at (x, y) in `box` coordinates, or -1. */
export function stampCheckboxAt(params, box, x, y) {
  const hit = stampRegions(params, box).boxes.find(b => inRect(b.rect, x, y));
  return hit ? hit.index : -1;
}

/** `checked` after clicking row `index`: that row, or none when it was already checked. */
export function toggledChecked(params, index) {
  return Number(params?.checked) === index ? -1 : index;
}

/** Print size of a stamp in inches, e.g. { width: 4, height: 3.12 }. */
export function stampSizeIn(params) {
  const { width, height } = stampLayout(params);
  return { width: width / 72, height: Math.round((height / 72) * 100) / 100 };
}

/** The layout drawn into `box`, scaled uniformly and centred. */
export function stampCommands(params, box) {
  const { width, height, cmds } = stampLayout(params);
  const s = Math.min(box.width / width, box.height / height);
  if (!(s > 0)) return [];
  const ox = box.x + (box.width - width * s) / 2, oy = box.y + (box.height - height * s) / 2;
  const X = (v) => ox + v * s, Y = (v) => oy + v * s;
  return cmds.map((c) => {
    switch (c.kind) {
      case 'line': return { ...c, x1: X(c.x1), y1: Y(c.y1), x2: X(c.x2), y2: Y(c.y2), lineWidth: c.lineWidth * s };
      case 'polyline': return { ...c, points: c.points.map(pt => ({ x: X(pt.x), y: Y(pt.y) })), lineWidth: c.lineWidth * s };
      case 'text': return { ...c, x: X(c.x), y: Y(c.y), size: c.size * s };
      case 'image': return { ...c, x: X(c.x), y: Y(c.y), width: c.width * s, height: c.height * s };
      default: return c;
    }
  });
}

/** Warnings shown in the builder (R1 and R9 of the stamp requirements). */
export function stampWarnings(p) {
  const out = [];
  if (/\bapproved\b/i.test(String(p?.title ?? ''))) out.push('Avoid "Approved" as the stamp title; use "Submittal Review" or "Shop Drawing Review".');
  if (Number(p?.discPt) < MIN_RECOMMENDED_PT) out.push(`Limitation text below ${MIN_RECOMMENDED_PT} pt may not survive half-size prints.`);
  if (!actionList(p).length) out.push('Add at least one checkbox action.');
  if (!String(p?.disclaimer ?? '').trim()) out.push('The stamp has no limitation text.');
  return out;
}

/**
 * After a placed stamp's params change: keep its width (and so any scale
 * the user gave it) and set the height from the new content, around the
 * centre. Leaves other annotations alone.
 */
export function fitStampToDesign(ann) {
  if (ann?.type !== 'parametricSymbol' || ann.symbolId !== STAMP_TEMPLATE_ID || !(ann.width > 0)) return;
  const { width, height } = stampLayout(ann.params);
  const h = ann.width * (height / width);
  if (!(h > 0) || Math.abs(h - ann.height) < 0.01) return;
  ann.y += (ann.height - h) / 2;
  ann.height = h;
}
