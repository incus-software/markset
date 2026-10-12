// Markset: electrical wiring runs as two-point templates. Click a start and
// an end point (or drag the end grips later); the run is drawn between them
// as a curve or a straight line. Upstream's two-point placement hands render()
// an unrotated band from start (left) to end (right) and rotates it into place.
//
// Types follow common US plan conventions: circuit, switch leg (dashed),
// 2-, 3- and 4-wire (hash marks across the run) and home run (arrow at the
// panel end with a panel/circuit label). Line widths are in points.

const CAT = 'US';
const W = 0.9;      // wire weight, points
const enumP = (key, label, def, values) =>
  ({ key, label, labelEn: label, type: 'enum', default: def, options: values.map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) });
const shapeParams = [enumP('shape', 'Shape', 'curved', ['curved', 'straight']), enumP('bend', 'Curve to', 'left', ['left', 'right'])];

/**
 * The run's geometry in the band: start S, end E, and for a curve the arc
 * (center, radius, angles) plus the point and tangent at mid-run.
 */
export function runGeometry(p, box) {
  const y = box.y + box.height / 2;
  const S = { x: box.x, y }, E = { x: box.x + box.width, y };
  const L = box.width;
  if (p.shape === 'straight' || L <= 0) {
    return { S, E, straight: true, mid: { x: S.x + L / 2, y }, tangent: { x: 1, y: 0 }, endTangent: { x: 1, y: 0 } };
  }
  const side = p.bend === 'right' ? 1 : -1;         // -1: bulge to smaller y ("left" of the run)
  const sag = Math.min(box.height * 0.32, L * 0.25);
  const R = (L * L / 4 + sag * sag) / (2 * sag);
  const C = { x: S.x + L / 2, y: y + side * (sag - R) }; // center on the far side of the bulge
  const a0 = Math.atan2(S.y - C.y, S.x - C.x), a1 = Math.atan2(E.y - C.y, E.x - C.x);
  const mid = { x: C.x, y: y + side * sag };
  // Tangent along the run at the end point (perpendicular to the radius).
  const rx = (E.x - C.x) / R, ry = (E.y - C.y) / R;
  let endTangent = { x: -ry, y: rx };
  if (endTangent.x < 0) endTangent = { x: ry, y: -rx };
  return { S, E, C, R, a0, a1, ccw: side > 0, mid, tangent: { x: 1, y: 0 }, endTangent };
}

function runCmds(g, dash) {
  if (g.straight) return [{ kind: 'line', x1: g.S.x, y1: g.S.y, x2: g.E.x, y2: g.E.y, lineWidth: W, ...(dash ? { dash } : {}) }];
  return [{ kind: 'arc', cx: g.C.x, cy: g.C.y, r: g.R, a0: g.a0, a1: g.a1, ccw: g.ccw, lineWidth: W, ...(dash ? { dash } : {}) }];
}

/** n slanted hash marks across the run at its middle. */
function hashes(g, n, size) {
  const out = [];
  const gap = size * 0.45, half = size * 0.55;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * gap;
    const cx = g.mid.x + off, cy = g.mid.y;
    out.push({ kind: 'line', x1: cx - half * 0.5, y1: cy + half, x2: cx + half * 0.5, y2: cy - half, lineWidth: W });
  }
  return out;
}

/** Open arrowhead at the end point, along the run. */
function arrow(g, size) {
  const t = g.endTangent, n = { x: -t.y, y: t.x };
  const back = { x: g.E.x - t.x * size, y: g.E.y - t.y * size };
  return [
    { kind: 'line', x1: g.E.x, y1: g.E.y, x2: back.x + n.x * size * 0.45, y2: back.y + n.y * size * 0.45, lineWidth: W },
    { kind: 'line', x1: g.E.x, y1: g.E.y, x2: back.x - n.x * size * 0.45, y2: back.y - n.y * size * 0.45, lineWidth: W },
  ];
}

function wire(id, name, { dash = null, wires = 0, homeRun = false } = {}) {
  return {
    id, name, nameEn: name, category: CAT,
    placement: 'two-point',
    defaultSize: { width: 192, height: 64 },
    markset: { role: 'drawing', group: 'electrical', bandHeightIn: 0.375, lengthIn: 1.5 },
    params: [
      ...shapeParams,
      ...(homeRun ? [{ key: 'label', label: 'Panel / circuits', labelEn: 'Panel / circuits', type: 'string', default: 'LP-1, 3' }] : []),
    ],
    render(p, box) {
      const g = runGeometry(p, box);
      const size = box.height * 0.35;
      const cmds = runCmds(g, dash ? dash.map(d => d * (box.height / 27)) : null);
      if (wires) cmds.push(...hashes(g, wires, size));
      if (homeRun) {
        cmds.push(...arrow(g, size * 0.8));
        if (String(p.label ?? '').trim()) {
          cmds.push({ kind: 'text', x: g.E.x - box.height * 0.9, y: box.y + box.height * 0.82, text: String(p.label), size: box.height * 0.26 });
        }
      }
      return cmds;
    },
    ...(homeRun ? {
      editableLabels(p, box) {
        return [{ id: 'label', rect: { x: box.x + box.width - box.height * 1.6, y: box.y + box.height * 0.66, width: box.height * 1.4, height: box.height * 0.32 }, fields: ['label'] }];
      },
    } : {}),
  };
}

export const WIRING_TEMPLATES = [
  wire('us-wire-circuit', 'Circuit (wiring)'),
  wire('us-wire-2', '2-wire circuit', { wires: 2 }),
  wire('us-wire-3', '3-wire circuit', { wires: 3 }),
  wire('us-wire-4', '4-wire circuit', { wires: 4 }),
  wire('us-wire-switch-leg', 'Switch leg', { dash: [6, 4] }),
  wire('us-wire-home-run', 'Home run (to panel)', { homeRun: true }),
];
