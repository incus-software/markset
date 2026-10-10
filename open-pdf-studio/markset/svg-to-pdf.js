// Markset: SVG symbol → PDF content stream, so a placed symbol is saved as
// vector drawing commands instead of an embedded PNG. It then prints crisp at
// any size and looks the same in other PDF readers.
//
// Dependency-free (runs under `node --test`). Handles the SVG subset that
// library symbols use: svg/g with transforms, path (all commands, arcs too),
// rect, circle, ellipse, line, polyline, polygon and single-line text in
// Helvetica. Anything else — images, gradients, <use>, <style>, clipping,
// masks, filters — returns null and the caller keeps its PNG appearance.

// --- XML -------------------------------------------------------------------

const UNSUPPORTED = new Set([
  'image', 'use', 'style', 'clippath', 'mask', 'pattern', 'filter', 'foreignobject',
  'lineargradient', 'radialgradient', 'symbol', 'marker', 'switch', 'script',
  'tspan', 'textpath',
]);
const IGNORED = new Set(['title', 'desc', 'metadata', 'defs']);
const DROPPED_ATTRS = ['marker-start', 'marker-mid', 'marker-end', 'clip-path', 'mask', 'filter',
  'letter-spacing', 'word-spacing', 'writing-mode', 'textlength'];

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k === 'amp') return '&';
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === 'apos') return "'";
    const n = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : m;
  });
}

function parseAttrs(src) {
  const attrs = {};
  const re = /([:\w.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? '');
  return attrs;
}

/** Tiny XML reader: { name, attrs, children, text } tree, or null. */
export function parseSvgXml(svg) {
  const s = String(svg ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, t) => t.replace(/</g, '&lt;'));
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const re = /<\/?([a-zA-Z][\w:.-]*)((?:\s+[:\w.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(s))) {
    const top = stack[stack.length - 1];
    if (m[4] != null) {
      top.text += decodeEntities(m[4]);
      continue;
    }
    const name = m[1].toLowerCase().replace(/^svg:/, '');
    if (m[0].startsWith('</')) {
      if (top.name !== name) return null; // malformed
      stack.pop();
      continue;
    }
    const node = { name, attrs: parseAttrs(m[2] || ''), children: [], text: '' };
    top.children.push(node);
    if (!m[3]) stack.push(node);
  }
  if (stack.length !== 1) return null;
  const svgNode = root.children.find(n => n.name === 'svg');
  return svgNode || null;
}

// --- Numbers, colors, transforms -------------------------------------------

const fmt = (n) => {
  const r = Math.round(n * 10000) / 10000;
  return Object.is(r, -0) ? '0' : String(r);
};

function nums(s) {
  return (String(s ?? '').match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || []).map(Number);
}

function len(v, fallback = 0) {
  if (v == null || v === '') return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

const NAMED = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
  yellow: '#ffff00', gray: '#808080', grey: '#808080', orange: '#ffa500', purple: '#800080',
};

/** '#d00', '#dd0000', 'rgb(…)', a few names → [r,g,b] 0..1; 'none' → null; else undefined. */
export function parseColor(v, current = [0, 0, 0]) {
  if (v == null) return undefined;
  let s = String(v).trim().toLowerCase();
  if (s === 'none' || s === 'transparent') return null;
  if (s === 'currentcolor') return current;
  if (NAMED[s]) s = NAMED[s];
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return [...m[1]].map(c => parseInt(c + c, 16) / 255);
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255);
  m = s.match(/^rgb\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*\)$/);
  if (m) return m.slice(1, 4).map(c => (c.endsWith('%') ? parseFloat(c) / 100 : parseFloat(c) / 255));
  return undefined; // unknown: caller treats as unsupported
}

const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];

/** SVG transform list → [a b c d e f], or null when unparseable. */
export function parseTransform(t) {
  let m6 = [1, 0, 0, 1, 0, 0];
  const re = /(matrix|translate|scale|rotate|skewx|skewy)\s*\(([^)]*)\)/gi;
  let m;
  let rest = String(t ?? '');
  while ((m = re.exec(t))) {
    const a = nums(m[2]);
    const op = m[1].toLowerCase();
    let x;
    if (op === 'matrix' && a.length === 6) x = a;
    else if (op === 'translate') x = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (op === 'scale') x = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (op === 'rotate') {
      const r = ((a[0] || 0) * Math.PI) / 180;
      const [cx, cy] = [a[1] || 0, a[2] || 0];
      const c = Math.cos(r), s = Math.sin(r);
      x = mul(mul([1, 0, 0, 1, cx, cy], [c, s, -s, c, 0, 0]), [1, 0, 0, 1, -cx, -cy]);
    } else if (op === 'skewx') x = [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0];
    else if (op === 'skewy') x = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
    else return null;
    m6 = mul(m6, x);
    rest = rest.replace(m[0], '');
  }
  return rest.replace(/[\s,]/g, '') === '' ? m6 : null;
}

// --- Paths -----------------------------------------------------------------

const K = 0.5522847498; // circle → cubic bezier

function arcToBeziers(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
  // SVG implementation notes F.6, returns cubic segments [c1x c1y c2x c2y x y].
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, num / den));
  if (fa === fs) co = -co;
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI;
  if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2)));
  const step = dt / n;
  const kk = (4 / 3) * Math.tan(step / 4);
  const pt = (t) => {
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    return [cx + cos * ex - sin * ey, cy + sin * ex + cos * ey];
  };
  const dpt = (t) => {
    const ex = -rx * Math.sin(t), ey = ry * Math.cos(t);
    return [cos * ex - sin * ey, sin * ex + cos * ey];
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = t1 + i * step, b = a + step;
    const [ax, ay] = pt(a), [bx, by] = pt(b);
    const [dax, day] = dpt(a), [dbx, dby] = dpt(b);
    out.push([ax + kk * dax, ay + kk * day, bx - kk * dbx, by - kk * dby, bx, by]);
  }
  return out;
}

/** SVG path data → PDF path operators (m l c h), or null on bad data. */
export function pathDataToOps(d) {
  const tokens = String(d ?? '').match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  let i = 0, cmd = '';
  let x = 0, y = 0, sx = 0, sy = 0, lcx = null, lcy = null, lqx = null, lqy = null;
  const out = [];
  const num = () => {
    if (i >= tokens.length || /[a-zA-Z]/.test(tokens[i])) throw new Error('number expected');
    return Number(tokens[i++]);
  };
  const flag = () => {
    // Arc flags may be packed ("011"): take one digit.
    const t = tokens[i];
    if (t == null) throw new Error('flag expected');
    if (t.length > 1 && /^[01]/.test(t)) { tokens[i] = t.slice(1); return Number(t[0]); }
    i++;
    return Number(t);
  };
  const cubic = (a, b, c, e, f, g) => { out.push(`${fmt(a)} ${fmt(b)} ${fmt(c)} ${fmt(e)} ${fmt(f)} ${fmt(g)} c`); };
  try {
    while (i < tokens.length) {
      if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
      else if (!cmd) return null;
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      const ox = rel ? x : 0, oy = rel ? y : 0;
      let keepC = false, keepQ = false;
      if (C === 'M') {
        x = ox + num(); y = oy + num(); sx = x; sy = y;
        out.push(`${fmt(x)} ${fmt(y)} m`);
        cmd = rel ? 'l' : 'L'; // following pairs are line-tos
      } else if (C === 'L') {
        x = ox + num(); y = oy + num(); out.push(`${fmt(x)} ${fmt(y)} l`);
      } else if (C === 'H') {
        x = ox + num(); out.push(`${fmt(x)} ${fmt(y)} l`);
      } else if (C === 'V') {
        y = oy + num(); out.push(`${fmt(x)} ${fmt(y)} l`);
      } else if (C === 'C') {
        const a = ox + num(), b = oy + num(), c = ox + num(), e = oy + num();
        x = ox + num(); y = oy + num();
        cubic(a, b, c, e, x, y); lcx = c; lcy = e; keepC = true;
      } else if (C === 'S') {
        const a = lcx != null ? 2 * x - lcx : x, b = lcy != null ? 2 * y - lcy : y;
        const c = ox + num(), e = oy + num();
        x = ox + num(); y = oy + num();
        cubic(a, b, c, e, x, y); lcx = c; lcy = e; keepC = true;
      } else if (C === 'Q' || C === 'T') {
        let qx, qy;
        if (C === 'Q') { qx = ox + num(); qy = oy + num(); }
        else { qx = lqx != null ? 2 * x - lqx : x; qy = lqy != null ? 2 * y - lqy : y; }
        const nx = ox + num(), ny = oy + num();
        cubic(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), nx + (2 / 3) * (qx - nx), ny + (2 / 3) * (qy - ny), nx, ny);
        x = nx; y = ny; lqx = qx; lqy = qy; keepQ = true;
      } else if (C === 'A') {
        const rx = num(), ry = num(), rot = num(), fa = flag(), fs = flag();
        const nx = ox + num(), ny = oy + num();
        for (const seg of arcToBeziers(x, y, rx, ry, rot, fa, fs, nx, ny)) cubic(...seg);
        x = nx; y = ny;
      } else if (C === 'Z') {
        out.push('h'); x = sx; y = sy;
      } else {
        return null;
      }
      if (!keepC) { lcx = null; lcy = null; }
      if (!keepQ) { lqx = null; lqy = null; }
    }
  } catch {
    return null;
  }
  return out.join('\n');
}

function ellipseOps(cx, cy, rx, ry) {
  const kx = rx * K, ky = ry * K;
  return [
    `${fmt(cx + rx)} ${fmt(cy)} m`,
    `${fmt(cx + rx)} ${fmt(cy + ky)} ${fmt(cx + kx)} ${fmt(cy + ry)} ${fmt(cx)} ${fmt(cy + ry)} c`,
    `${fmt(cx - kx)} ${fmt(cy + ry)} ${fmt(cx - rx)} ${fmt(cy + ky)} ${fmt(cx - rx)} ${fmt(cy)} c`,
    `${fmt(cx - rx)} ${fmt(cy - ky)} ${fmt(cx - kx)} ${fmt(cy - ry)} ${fmt(cx)} ${fmt(cy - ry)} c`,
    `${fmt(cx + kx)} ${fmt(cy - ry)} ${fmt(cx + rx)} ${fmt(cy - ky)} ${fmt(cx + rx)} ${fmt(cy)} c`,
    'h',
  ].join('\n');
}

function rectOps(x, y, w, h, rx, ry) {
  if (!(w > 0) || !(h > 0)) return '';
  if (!(rx > 0) && !(ry > 0)) return `${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re`;
  rx = Math.min(rx > 0 ? rx : ry, w / 2);
  ry = Math.min(ry > 0 ? ry : rx, h / 2);
  const kx = rx * K, ky = ry * K;
  return [
    `${fmt(x + rx)} ${fmt(y)} m`,
    `${fmt(x + w - rx)} ${fmt(y)} l`,
    `${fmt(x + w - rx + kx)} ${fmt(y)} ${fmt(x + w)} ${fmt(y + ry - ky)} ${fmt(x + w)} ${fmt(y + ry)} c`,
    `${fmt(x + w)} ${fmt(y + h - ry)} l`,
    `${fmt(x + w)} ${fmt(y + h - ry + ky)} ${fmt(x + w - rx + kx)} ${fmt(y + h)} ${fmt(x + w - rx)} ${fmt(y + h)} c`,
    `${fmt(x + rx)} ${fmt(y + h)} l`,
    `${fmt(x + rx - kx)} ${fmt(y + h)} ${fmt(x)} ${fmt(y + h - ry + ky)} ${fmt(x)} ${fmt(y + h - ry)} c`,
    `${fmt(x)} ${fmt(y + ry)} l`,
    `${fmt(x)} ${fmt(y + ry - ky)} ${fmt(x + rx - kx)} ${fmt(y)} ${fmt(x + rx)} ${fmt(y)} c`,
    'h',
  ].join('\n');
}

function pointsOps(points, close) {
  const p = nums(points);
  if (p.length < 4 || p.length % 2) return '';
  const out = [`${fmt(p[0])} ${fmt(p[1])} m`];
  for (let i = 2; i < p.length; i += 2) out.push(`${fmt(p[i])} ${fmt(p[i + 1])} l`);
  if (close) out.push('h');
  return out.join('\n');
}

// --- Text ------------------------------------------------------------------

// Helvetica and Helvetica-Bold advance widths (Adobe AFM, 1/1000 em) for
// ASCII 32..126, so centred and right-aligned text lands where the SVG puts it.
const HELV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611,
  722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278,
  556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const HELV_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611,
  722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333,
  611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

/** Width of `text` in Helvetica (bold or not) at `size`, in text units. */
export function helveticaWidth(text, size, bold = false) {
  const table = bold ? HELV_BOLD : HELV;
  let w = 0;
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    w += c >= 32 && c <= 126 ? table[c - 32] : 556;
  }
  return (w * size) / 1000;
}

function pdfString(text) {
  let out = '';
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    if (ch === '(' || ch === ')' || ch === '\\') out += '\\' + ch;
    else if (c >= 32 && c <= 126) out += ch;
    else if (c >= 160 && c <= 255) out += '\\' + c.toString(8).padStart(3, '0'); // Latin-1 = WinAnsi here
    else out += '?';
  }
  return `(${out})`;
}

// --- Styles ----------------------------------------------------------------

const INHERITED = [
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-dasharray', 'stroke-dashoffset', 'fill-rule', 'fill-opacity', 'stroke-opacity', 'color',
  'font-size', 'font-weight', 'font-family', 'text-anchor', 'dominant-baseline', 'font-style',
];

function ownStyle(attrs) {
  const st = {};
  for (const k of [...INHERITED, 'opacity', 'transform', 'display', 'visibility']) {
    if (attrs[k] != null) st[k] = attrs[k];
  }
  for (const part of String(attrs.style || '').split(';')) {
    const i = part.indexOf(':');
    if (i > 0) st[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return st;
}

const ROOT_STYLE = { fill: '#000', stroke: 'none', 'stroke-width': '1', 'font-size': '16', color: '#000' };

// --- Converter -------------------------------------------------------------

class Unsupported extends Error {}

/**
 * SVG → appearance content for a box of `width` x `height` PDF points.
 * Returns { ops, fonts: ['F1'|'F2'], gstates: [{ name, ca, CA }] } — the
 * caller adds a Helvetica (F1) / Helvetica-Bold (F2) font and one ExtGState
 * per entry to the Form XObject's resources — or null when the SVG uses
 * something this converter does not draw.
 */
export function svgToPdfAppearance(svg, width, height) {
  const root = parseSvgXml(svg);
  if (!root || !(width > 0) || !(height > 0)) return null;
  const vb = nums(root.attrs.viewbox);
  let [minX, minY, vw, vh] = vb.length === 4 ? vb : [0, 0, len(root.attrs.width), len(root.attrs.height)];
  if (!(vw > 0) || !(vh > 0)) return null;

  // viewBox → box (xMidYMid meet), with the y axis flipped to PDF's.
  const s = Math.min(width / vw, height / vh);
  const tx = (width - vw * s) / 2 - minX * s;
  const ty = (height - vh * s) / 2 - minY * s;
  const out = [`q`, `${fmt(s)} 0 0 ${fmt(-s)} ${fmt(tx)} ${fmt(height - ty)} cm`];
  const fonts = new Set();
  const gstates = new Map();

  const gs = (ca, CA) => {
    const key = `${fmt(ca)}/${fmt(CA)}`;
    if (!gstates.has(key)) gstates.set(key, { name: `GS${gstates.size}`, ca, CA });
    return gstates.get(key).name;
  };

  const colorOf = (v, style) => {
    const cur = parseColor(style.color, [0, 0, 0]) || [0, 0, 0];
    const c = parseColor(v, cur);
    if (c === undefined) throw new Unsupported(`color ${v}`);
    return c;
  };

  const paintOps = (style, closedShape) => {
    const fill = closedShape ? colorOf(style.fill, style) : null;
    const stroke = colorOf(style.stroke, style);
    const sw = len(style['stroke-width'], 1);
    const ops = [];
    const fo = len(style['fill-opacity'], 1), so = len(style['stroke-opacity'], 1);
    if ((fill && fo < 1) || (stroke && so < 1)) ops.push(`/${gs(fill ? fo : 1, stroke ? so : 1)} gs`);
    if (fill) ops.push(`${fill.map(fmt).join(' ')} rg`);
    if (stroke && sw > 0) {
      ops.push(`${stroke.map(fmt).join(' ')} RG`, `${fmt(sw)} w`);
      const cap = { butt: 0, round: 1, square: 2 }[style['stroke-linecap']];
      if (cap != null) ops.push(`${cap} J`);
      const join = { miter: 0, round: 1, bevel: 2 }[style['stroke-linejoin']];
      if (join != null) ops.push(`${join} j`);
      if (style['stroke-miterlimit']) ops.push(`${fmt(len(style['stroke-miterlimit'], 4))} M`);
      const dash = style['stroke-dasharray'];
      if (dash && dash !== 'none') {
        const d = nums(dash);
        if (d.length) ops.push(`[${(d.length % 2 ? [...d, ...d] : d).map(fmt).join(' ')}] ${fmt(len(style['stroke-dashoffset'], 0))} d`);
      }
    }
    const even = style['fill-rule'] === 'evenodd';
    const doStroke = stroke && sw > 0;
    let paint;
    if (fill && doStroke) paint = even ? 'B*' : 'B';
    else if (fill) paint = even ? 'f*' : 'f';
    else if (doStroke) paint = 'S';
    else paint = 'n';
    return { setup: ops, paint };
  };

  const shape = (pathOps, style, closedShape = true) => {
    if (!pathOps) return;
    const { setup, paint } = paintOps(style, closedShape);
    if (paint === 'n') return;
    out.push('q', ...setup, pathOps, paint, 'Q');
  };

  const text = (node, style) => {
    const str = node.text.replace(/\s+/g, ' ').trim();
    if (!str) return;
    const fill = colorOf(style.fill, style);
    if (!fill) return;
    const size = len(style['font-size'], 16);
    const w = String(style['font-weight'] || '').toLowerCase();
    const bold = w === 'bold' || w === 'bolder' || Number(w) >= 600;
    fonts.add(bold ? 'F2' : 'F1');
    let x = len(node.attrs.x), y = len(node.attrs.y);
    x += len(node.attrs.dx); y += len(node.attrs.dy);
    const anchor = style['text-anchor'];
    const tw = helveticaWidth(str, size, bold);
    if (anchor === 'middle') x -= tw / 2;
    else if (anchor === 'end') x -= tw;
    const base = style['dominant-baseline'];
    if (base === 'middle' || base === 'central') y += size * 0.35;
    else if (base === 'hanging' || base === 'text-before-edge') y += size * 0.75;
    const fo = len(style['fill-opacity'], 1);
    out.push('q');
    if (fo < 1) out.push(`/${gs(fo, 1)} gs`);
    out.push(`${fill.map(fmt).join(' ')} rg`, 'BT', `/${bold ? 'F2' : 'F1'} ${fmt(size)} Tf`,
      `1 0 0 -1 ${fmt(x)} ${fmt(y)} Tm`, `${pdfString(str)} Tj`, 'ET', 'Q');
  };

  const walk = (node, inherited) => {
    if (IGNORED.has(node.name)) return;
    if (UNSUPPORTED.has(node.name)) throw new Unsupported(node.name);
    // Attributes this converter would otherwise drop without a trace.
    if (DROPPED_ATTRS.some(k => node.attrs[k] != null || String(node.attrs.style || '').includes(k))) {
      throw new Unsupported('attribute');
    }
    if (node.name === 'svg' && node !== root) throw new Unsupported('nested svg');
    const own = ownStyle(node.attrs);
    if (own.display === 'none' || own.visibility === 'hidden') return;
    const style = { ...inherited };
    for (const k of INHERITED) if (own[k] != null) style[k] = own[k];
    const a = node.attrs;
    const t = own.transform != null && node.name !== 'svg' ? parseTransform(own.transform) : null;
    if (own.transform != null && node.name !== 'svg' && !t) throw new Unsupported('transform');
    const op = len(own.opacity, 1);
    const grouped = t || op < 1;
    if (grouped) {
      out.push('q');
      if (t) out.push(`${t.map(fmt).join(' ')} cm`);
      if (op < 1) out.push(`/${gs(op, op)} gs`);
    }
    switch (node.name) {
      case 'svg':
      case 'g':
      case 'a':
        for (const c of node.children) walk(c, style);
        break;
      case 'path': shape(pathDataToOps(a.d) ?? (() => { throw new Unsupported('path data'); })(), style); break;
      case 'rect': shape(rectOps(len(a.x), len(a.y), len(a.width), len(a.height), len(a.rx), len(a.ry)), style); break;
      case 'circle': if (len(a.r) > 0) shape(ellipseOps(len(a.cx), len(a.cy), len(a.r), len(a.r)), style); break;
      case 'ellipse': if (len(a.rx) > 0 && len(a.ry) > 0) shape(ellipseOps(len(a.cx), len(a.cy), len(a.rx), len(a.ry)), style); break;
      case 'line': shape(`${fmt(len(a.x1))} ${fmt(len(a.y1))} m\n${fmt(len(a.x2))} ${fmt(len(a.y2))} l`, style, false); break;
      case 'polyline': shape(pointsOps(a.points, false), style); break;
      case 'polygon': shape(pointsOps(a.points, true), style); break;
      case 'text': text(node, style); break;
      default: throw new Unsupported(node.name);
    }
    if (grouped) out.push('Q');
  };

  try {
    walk(root, { ...ROOT_STYLE });
  } catch (e) {
    if (e instanceof Unsupported) return null;
    throw e;
  }
  out.push('Q');
  return { ops: out.join('\n') + '\n', fonts: [...fonts].sort(), gstates: [...gstates.values()] };
}
