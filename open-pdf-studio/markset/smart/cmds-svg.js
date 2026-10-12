// Markset: parametric template draw commands → SVG, so smart symbols can use
// the same vector converter (svg-to-pdf.js) as the bundled symbols, and so a
// palette preview can be drawn from the template itself.
//
// Mirrors the canvas renderer in js/annotations/rendering.js for the command
// kinds Markset templates use: line, circle, polyline (close / fill / dash),
// arc, text (bold or not, centred on its point, or left/right-aligned with
// `align: 'start' | 'end'`) and image (a data URL; previews only, the PDF
// appearance embeds images itself). Any other kind returns null and the
// caller keeps its raster appearance.

const n = (v) => Math.round(v * 1000) / 1000;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @param {Array<object>} cmds   template.render(params, box) output
 * @param {{x:number,y:number,width:number,height:number}} box
 * @param {object} [opts]
 * @param {string} [opts.color='#000']  stroke and fill color (the annotation's strokeColor)
 * @param {number} [opts.lineWidth=1]   width for commands without their own lineWidth
 * @returns {string|null}
 */
export function cmdsToSvg(cmds, box, { color = '#000', lineWidth = 1 } = {}) {
  if (!Array.isArray(cmds) || !(box?.width > 0) || !(box?.height > 0)) return null;
  const out = [];
  const lw = (c) => n(c.lineWidth != null ? c.lineWidth : lineWidth);
  const dash = (c) => (Array.isArray(c.dash) && c.dash.length ? ` stroke-dasharray="${c.dash.map(n).join(' ')}"` : '');
  for (const c of cmds) {
    switch (c?.kind) {
      case 'line':
        out.push(`<path d="M${n(c.x1)} ${n(c.y1)} L${n(c.x2)} ${n(c.y2)}" stroke-width="${lw(c)}"${dash(c)}/>`);
        break;
      case 'circle':
        if (c.r > 0) out.push(`<circle cx="${n(c.cx)}" cy="${n(c.cy)}" r="${n(c.r)}" stroke-width="${lw(c)}"${c.fill ? ` fill="${typeof c.fill === 'string' ? c.fill : color}"` : ''}/>`);
        break;
      case 'polyline': {
        if (!Array.isArray(c.points) || c.points.length < 2) break;
        const d = c.points.map((p, i) => `${i ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`).join(' ') + (c.close ? ' Z' : '');
        const fill = c.fill ? ` fill="${typeof c.fill === 'string' ? c.fill : color}"` : '';
        out.push(`<path d="${d}" stroke-width="${lw(c)}"${dash(c)}${fill}/>`);
        break;
      }
      case 'arc': {
        // Canvas arc from a0 to a1 (radians), clockwise unless ccw.
        const { cx, cy, r } = c;
        let a0 = c.a0 ?? 0, a1 = c.a1 ?? Math.PI * 2;
        if (!(r > 0)) break;
        let sweep = c.ccw ? a0 - a1 : a1 - a0;
        sweep = ((sweep % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI;
        if (sweep >= 2 * Math.PI - 1e-9) {
          out.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" stroke-width="${lw(c)}"${dash(c)}/>`);
          break;
        }
        const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(c.ccw ? a0 - sweep : a0 + sweep), y1 = cy + r * Math.sin(c.ccw ? a0 - sweep : a0 + sweep);
        out.push(`<path d="M${n(x0)} ${n(y0)} A${n(r)} ${n(r)} 0 ${sweep > Math.PI ? 1 : 0} ${c.ccw ? 0 : 1} ${n(x1)} ${n(y1)}" stroke-width="${lw(c)}"${dash(c)}/>`);
        break;
      }
      case 'text': {
        const text = String(c.text ?? '');
        if (!text.trim()) break;
        const anchor = c.align === 'start' || c.align === 'left' ? 'start' : c.align === 'end' || c.align === 'right' ? 'end' : 'middle';
        out.push(`<text x="${n(c.x)}" y="${n(c.y)}" font-family="Helvetica, Arial, sans-serif" font-size="${n(c.size || 12)}"` +
          `${c.bold ? ' font-weight="bold"' : ''} text-anchor="${anchor}" dominant-baseline="middle" fill="${color}" stroke="none">${esc(text)}</text>`);
        break;
      }
      case 'image':
        if (/^data:image\//.test(String(c.src || '')) && c.width > 0 && c.height > 0) {
          out.push(`<image href="${esc(c.src).replace(/"/g, '&quot;')}" x="${n(c.x)}" y="${n(c.y)}" width="${n(c.width)}" height="${n(c.height)}" preserveAspectRatio="xMidYMid meet"/>`);
        }
        break;
      default:
        return null; // hatch, zigzag, rings, … — not drawn here
    }
  }
  return `<svg viewBox="${n(box.x)} ${n(box.y)} ${n(box.width)} ${n(box.height)}" xmlns="http://www.w3.org/2000/svg" ` +
    `fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">${out.join('')}</svg>`;
}
