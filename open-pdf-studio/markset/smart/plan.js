// Markset: plan door and window, drawn to the drawing's scale.
//
// Unlike the reference symbols these have a real size: realSizeMm() turns
// the width and wall thickness (typed in feet and inches) into millimetres,
// and upstream's placement converts that with the sheet's calibration (scale
// region, viewport or document scale). Editing a size re-sizes the symbol.
// render() draws in the box's own proportions; line widths are in points.
import { parseLengthAs } from '../us-units.js';

const CAT = 'US';
const mm = (v, fallback) => {
  const n = parseLengthAs(v, 'mm');
  return n > 0 ? Math.round(n * 1000) / 1000 : fallback; // 3 ft is 914.4000000000001 mm otherwise
};
const len = (key, label, def) => ({ key, label, labelEn: label, type: 'string', default: def });
const choice = (key, label, def, values) =>
  ({ key, label, labelEn: label, type: 'enum', default: def, options: values.map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) });
const line = (x1, y1, x2, y2, w) => ({ kind: 'line', x1, y1, x2, y2, lineWidth: w });

const DOOR_DEFAULT_W = 914.4; // 3'-0"
const WALL_DEFAULT = 123.825; // 4 7/8" (stud wall)

/** Quarter arc from the open leaf back to the closed position (canvas arc). */
function swingArc(hx, hy, r, leafAngle, closedAngle, w) {
  const cw = ((closedAngle - leafAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const clockwise = Math.abs(cw - Math.PI / 2) < 1e-6;
  return { kind: 'arc', cx: hx, cy: hy, r, a0: leafAngle, a1: closedAngle, ccw: !clockwise, lineWidth: w };
}

export const PLAN_TEMPLATES = [
  {
    id: 'us-plan-door',
    name: 'Door (plan)', nameEn: 'Door (plan)', category: CAT,
    defaultSize: { width: 64, height: 64 * ((914.4 + WALL_DEFAULT) / 914.4) },
    markset: { role: 'drawing', realSize: true },
    params: [
      len('width', 'Door width', '3\'-0"'),
      len('wall', 'Wall thickness', '0\'-4 7/8"'),
      choice('leaves', 'Leaves', 'single', ['single', 'double']),
      choice('hinge', 'Hinge side', 'left', ['left', 'right']),
      choice('swing', 'Swing', 'in', ['in', 'out']),
    ],
    realSizeMm(p) {
      const W = mm(p.width, DOOR_DEFAULT_W), T = mm(p.wall, WALL_DEFAULT);
      return { width: W, height: (p.leaves === 'double' ? W / 2 : W) + T };
    },
    render(p, box) {
      const W = box.width;
      const s = W / mm(p.width, DOOR_DEFAULT_W);
      const T = Math.min(mm(p.wall, WALL_DEFAULT) * s, box.height * 0.5);
      const out = p.swing === 'out';
      const wallTop = out ? box.y : box.y + box.height - T;
      const face = out ? wallTop + T : wallTop;   // the wall face the door swings from
      const sign = out ? 1 : -1;                  // which way the open leaf points (y)
      const x0 = box.x, x1 = box.x + W;
      const cmds = [line(x0, wallTop, x0, wallTop + T, 1), line(x1, wallTop, x1, wallTop + T, 1)];
      const leaves = p.leaves === 'double'
        ? [{ hx: x0, len: W / 2, dir: 1 }, { hx: x1, len: W / 2, dir: -1 }]
        : [p.hinge === 'right' ? { hx: x1, len: W, dir: -1 } : { hx: x0, len: W, dir: 1 }];
      for (const { hx, len: L, dir } of leaves) {
        cmds.push(line(hx, face, hx, face + sign * L, 1.4));
        cmds.push(swingArc(hx, face, L, sign < 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? 0 : Math.PI, 0.5));
      }
      return cmds;
    },
  },
  {
    id: 'us-plan-window',
    name: 'Window (plan)', nameEn: 'Window (plan)', category: CAT,
    defaultSize: { width: 64, height: 64 * (152.4 / 914.4) },
    markset: { role: 'drawing', realSize: true },
    params: [len('width', 'Window width', '3\'-0"'), len('wall', 'Wall thickness', '0\'-6"')],
    realSizeMm(p) { return { width: mm(p.width, 914.4), height: mm(p.wall, 152.4) }; },
    render(p, box) {
      const { x, y, width: W, height: T } = box;
      const mid = y + T / 2, gap = T * 0.12;
      return [
        line(x, y, x, y + T, 1), line(x + W, y, x + W, y + T, 1),         // jambs
        line(x, y, x + W, y, 0.7), line(x, y + T, x + W, y + T, 0.7),     // wall faces (sill)
        line(x, mid - gap, x + W, mid - gap, 0.5), line(x, mid + gap, x + W, mid + gap, 0.5), // glass
      ];
    },
  },
];
