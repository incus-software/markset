// Markset: US "smart" drawing symbols as parametric templates (the upstream
// format in js/symbols/templates/), so their numbers, sheet references and
// names are text fields in the properties panel and editable on the canvas.
//
// Drawn to US drafting conventions (section and elevation "hoods", split
// detail/sheet bubbles, regular-weight text), not copied from any published
// symbol set. Each template is laid out on a grid 64 units high and scaled to
// its box, so it looks the same at any size. `markset` holds the printed
// height on a 24x36 sheet and the color role.

const CAT = 'US';

// --- Drawing helpers (grid units → page coordinates; 64 units = box height)

function grid(box) {
  const u = box.height / 64;
  return { u, P: (x, y) => ({ x: box.x + x * u, y: box.y + y * u }), X: (x) => box.x + x * u, Y: (y) => box.y + y * u };
}

const text = (g, x, y, value, size, bold = false) =>
  ({ kind: 'text', ...g.P(x, y), text: String(value ?? ''), size: size * g.u, bold });
const circle = (g, cx, cy, r, w) => {
  const c = g.P(cx, cy);
  return { kind: 'circle', cx: c.x, cy: c.y, r: r * g.u, lineWidth: w * g.u };
};
const arc = (g, cx, cy, r, a0, a1, w, dash) => {
  const c = g.P(cx, cy);
  return { kind: 'arc', cx: c.x, cy: c.y, r: r * g.u, a0, a1, lineWidth: w * g.u, ...(dash ? { dash: dash.map(d => d * g.u) } : {}) };
};
const line = (g, x1, y1, x2, y2, w, dash) => {
  const a = g.P(x1, y1), b = g.P(x2, y2);
  return { kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, lineWidth: w * g.u, ...(dash ? { dash: dash.map(d => d * g.u) } : {}) };
};
const poly = (g, pts, w, { close = true, fill = false } = {}) =>
  ({ kind: 'polyline', points: pts.map(([x, y]) => g.P(x, y)), close, fill, lineWidth: w * g.u });

const DIR = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };

/**
 * The winged hood of a section or elevation bubble: a filled triangle whose
 * point is `reach` x r from the center in direction `dir` and whose base lies
 * on the bubble's center line, wider than the bubble (the "wings"), minus
 * the bubble itself.
 */
function wingHood(g, cx, cy, r, dir, reach = 1.8) {
  const t = DIR[dir] ?? DIR.up;
  const d = [Math.cos(t), Math.sin(t)], n = [-d[1], d[0]];
  const a = r * reach;
  const wing = a * Math.tan(Math.asin(r / a)); // where the tangents meet the center line
  const P = (s, k) => [cx + d[0] * s + n[0] * k, cy + d[1] * s + n[1] * k];
  const pts = [P(a, 0), P(0, wing), P(0, r)];
  const steps = 16;
  for (let i = 1; i < steps; i++) {
    const ang = t + Math.PI / 2 - (Math.PI * i) / steps;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  pts.push(P(0, -r), P(0, -wing));
  return poly(g, pts, 1, { fill: true });
}

/** Filled rectangular foot at the end of a cut line, standing on it. */
function foot(g, x, cy, dir) {
  const y1 = dir === 'down' ? cy + 20 : cy - 20;
  return poly(g, [[x - 3, cy], [x + 3, cy], [x + 3, y1], [x - 3, y1]], 1, { fill: true });
}

/** "SIM" (similar) flag beside a bubble, when switched on. */
const simFlag = (g, p, cx, cy, r) => (p.sim ? [text(g, cx + r * 1.05, cy + r * 1.15, 'SIM', r * 0.42)] : []);
const simParam = { key: 'sim', label: 'SIM (similar)', labelEn: 'SIM (similar)', type: 'boolean', default: false };

/**
 * A plain tangent hood: the area between a bubble and the two tangents that
 * meet `reach` x r from the center. Four of them with reach √2 make the black
 * diamond corners of the interior elevation marker.
 */
function hood(g, cx, cy, r, dir, reach = 1.8) {
  const t = DIR[dir] ?? DIR.up;
  const a = r * reach;
  const phi = Math.acos(r / a);
  const pts = [[cx + a * Math.cos(t), cy + a * Math.sin(t)]];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const ang = t - phi + (2 * phi * i) / steps;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  return poly(g, pts, 1, { fill: true });
}

/** A detail/sheet bubble: circle split by a line, number over sheet. */
function splitBubble(g, cx, cy, r, number, sheet, w = 2) {
  return [
    circle(g, cx, cy, r, w),
    line(g, cx - r, cy, cx + r, cy, w * 0.75),
    text(g, cx, cy - r * 0.43, number, r * 0.58),
    text(g, cx, cy + r * 0.46, sheet, r * 0.5),
  ];
}

/** A stadium (rounded-end box) from x0 to x1, centred on cy, height h. */
function stadium(g, x0, x1, cy, h, w, dash) {
  const R = h / 2;
  return [
    line(g, x0 + R, cy - R, x1 - R, cy - R, w, dash),
    arc(g, x1 - R, cy, R, -Math.PI / 2, Math.PI / 2, w, dash),
    line(g, x1 - R, cy + R, x0 + R, cy + R, w, dash),
    arc(g, x0 + R, cy, R, Math.PI / 2, (3 * Math.PI) / 2, w, dash),
  ];
}

/** Rounded rectangle outline from (x0, y0) to (x1, y1), corner radius rr. */
function roundRect(g, x0, y0, x1, y1, rr, w, dash) {
  return [
    line(g, x0 + rr, y0, x1 - rr, y0, w, dash), arc(g, x1 - rr, y0 + rr, rr, -Math.PI / 2, 0, w),
    line(g, x1, y0 + rr, x1, y1 - rr, w, dash), arc(g, x1 - rr, y1 - rr, rr, 0, Math.PI / 2, w),
    line(g, x1 - rr, y1, x0 + rr, y1, w, dash), arc(g, x0 + rr, y1 - rr, rr, Math.PI / 2, Math.PI, w),
    line(g, x0, y1 - rr, x0, y0 + rr, w, dash), arc(g, x0 + rr, y0 + rr, rr, Math.PI, (3 * Math.PI) / 2, w),
  ];
}

const labelRect = (g, x, y, w, h) => ({ x: g.X(x - w / 2), y: g.Y(y - h / 2), width: w * g.u, height: h * g.u });
const field = (key, label, def) => ({ key, label, labelEn: label, type: 'string', default: def });
const choice = (key, label, def, values) =>
  ({ key, label, labelEn: label, type: 'enum', default: def, options: values.map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) });
const DIRS = ['up', 'down', 'left', 'right'];

// Detail/sheet bubble labels for inline editing.
const bubbleLabels = (g, cx, cy, r) => [
  { id: 'number', rect: labelRect(g, cx, cy - r * 0.45, r * 1.5, r * 0.8), fields: ['number'] },
  { id: 'sheet', rect: labelRect(g, cx, cy + r * 0.47, r * 1.7, r * 0.75), fields: ['sheet'] },
];

// Bubble on the left or right end of a wide symbol.
const endX = (p) => (p.side === 'right' ? 104 : 24);

export const MARKSET_TEMPLATES = [
  // --- Section and detail references ---------------------------------------
  {
    id: 'us-building-section',
    name: 'Building section', nameEn: 'Building section', category: CAT,
    defaultSize: { width: 128, height: 64 },
    markset: { paperHeightIn: 0.625, role: 'drawing' },
    params: [field('number', 'Section', 'A'), field('sheet', 'Sheet', 'A-301'),
      choice('direction', 'Looking', 'up', ['up', 'down']), choice('side', 'Bubble at', 'left', ['left', 'right']), simParam],
    render(p, box) {
      const g = grid(box), cx = endX(p), r = 16;
      const cut = p.side === 'right' ? line(g, 4, 32, cx - r * 1.2, 32, 2.5) : line(g, cx + r * 1.2, 32, 124, 32, 2.5);
      return [wingHood(g, cx, 32, r, p.direction), cut, ...splitBubble(g, cx, 32, r, p.number, p.sheet), ...simFlag(g, p, cx, 32, r)];
    },
    editableLabels(p, box) { return bubbleLabels(grid(box), endX(p), 32, 16); },
  },
  {
    id: 'us-wall-section',
    name: 'Wall section', nameEn: 'Wall section', category: CAT,
    defaultSize: { width: 128, height: 64 },
    markset: { paperHeightIn: 0.625, role: 'drawing' },
    params: [field('number', 'Section', '1'), field('sheet', 'Sheet', 'A-501'),
      choice('direction', 'Looking', 'up', ['up', 'down']), choice('side', 'Bubble at', 'left', ['left', 'right']), simParam],
    render(p, box) {
      const g = grid(box), cx = endX(p), r = 16;
      const right = p.side === 'right';
      return [
        wingHood(g, cx, 32, r, p.direction),
        right ? line(g, 9, 32, cx - r * 1.2, 32, 2) : line(g, cx + r * 1.2, 32, 119, 32, 2),
        foot(g, right ? 7 : 121, 32, p.direction),
        ...splitBubble(g, cx, 32, r, p.number, p.sheet), ...simFlag(g, p, cx, 32, r),
      ];
    },
    editableLabels(p, box) { return bubbleLabels(grid(box), endX(p), 32, 16); },
  },
  {
    id: 'us-detail-section',
    name: 'Detail section (non-directional)', nameEn: 'Detail section (non-directional)', category: CAT,
    defaultSize: { width: 128, height: 64 },
    markset: { paperHeightIn: 0.625, role: 'drawing' },
    params: [field('number', 'Detail', '2'), field('sheet', 'Sheet', 'A-501'),
      choice('direction', 'Foot', 'up', ['up', 'down']), choice('side', 'Bubble at', 'left', ['left', 'right']), simParam],
    render(p, box) {
      const g = grid(box), cx = endX(p), r = 16;
      const right = p.side === 'right';
      return [
        right ? line(g, 9, 32, cx - r, 32, 2) : line(g, cx + r, 32, 119, 32, 2),
        foot(g, right ? 7 : 121, 32, p.direction),
        ...splitBubble(g, cx, 32, r, p.number, p.sheet), ...simFlag(g, p, cx, 32, r),
      ];
    },
    editableLabels(p, box) { return bubbleLabels(grid(box), endX(p), 32, 16); },
  },
  {
    id: 'us-enlarged-detail',
    name: 'Enlarged detail reference', nameEn: 'Enlarged detail reference', category: CAT,
    defaultSize: { width: 192, height: 64 },
    markset: { paperHeightIn: 0.625, role: 'drawing' },
    params: [field('number', 'Detail', '3'), field('sheet', 'Sheet', 'A-502')],
    render(p, box) {
      const g = grid(box);
      return [line(g, 40, 32, 80, 32, 2), ...roundRect(g, 80, 6, 188, 58, 9, 2, [10, 6]),
        ...splitBubble(g, 24, 32, 16, p.number, p.sheet)];
    },
    editableLabels(p, box) { return bubbleLabels(grid(box), 24, 32, 16); },
  },
  // --- Elevations ------------------------------------------------------------
  {
    id: 'us-exterior-elevation',
    name: 'Exterior elevation', nameEn: 'Exterior elevation', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.625, role: 'drawing' },
    params: [field('number', 'Elevation', '1'), field('sheet', 'Sheet', 'A-201'), choice('direction', 'Looking', 'up', DIRS), simParam],
    render(p, box) {
      const g = grid(box);
      return [wingHood(g, 32, 32, 16, p.direction), ...splitBubble(g, 32, 32, 16, p.number, p.sheet), ...simFlag(g, p, 32, 32, 16)];
    },
    editableLabels(p, box) { return bubbleLabels(grid(box), 32, 32, 16); },
  },
  {
    // A black diamond of four corner pointers around a white circle with the
    // sheet number; each pointer's elevation number sits outside its point.
    id: 'us-interior-elevation',
    name: 'Interior elevation', nameEn: 'Interior elevation', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.75, role: 'drawing' },
    params: [field('sheet', 'Sheet', 'A-441'),
      field('n1', 'Elevation up', '1'), field('n2', 'Elevation right', '2'),
      field('n3', 'Elevation down', '3'), field('n4', 'Elevation left', '4'),
      ...['up', 'right', 'down', 'left'].map(d => ({ key: `show_${d}`, label: `Pointer ${d}`, labelEn: `Pointer ${d}`, type: 'boolean', default: true }))],
    render(p, box) {
      const g = grid(box), r = 14;
      const cmds = [];
      const spots = { up: [32, 5, 'n1'], right: [59, 32, 'n2'], down: [32, 59, 'n3'], left: [5, 32, 'n4'] };
      for (const [d, [x, y, key]] of Object.entries(spots)) {
        if (p[`show_${d}`] === false) continue;
        cmds.push(hood(g, 32, 32, r, d, Math.SQRT2), text(g, x, y, p[key], 8));
      }
      cmds.push(circle(g, 32, 32, r, 1.5), text(g, 32, 32.5, p.sheet, 7.5));
      return cmds;
    },
    editableLabels(p, box) {
      const g = grid(box);
      return [
        { id: 'sheet', rect: labelRect(g, 32, 32, 22, 10), fields: ['sheet'] },
        { id: 'n1', rect: labelRect(g, 32, 5, 10, 9), fields: ['n1'] }, { id: 'n2', rect: labelRect(g, 59, 32, 10, 9), fields: ['n2'] },
        { id: 'n3', rect: labelRect(g, 32, 59, 10, 9), fields: ['n3'] }, { id: 'n4', rect: labelRect(g, 5, 32, 10, 9), fields: ['n4'] },
      ];
    },
  },
  {
    id: 'us-elevation-target',
    name: 'Elevation target (level)', nameEn: 'Elevation target (level)', category: CAT,
    defaultSize: { width: 192, height: 64 },
    markset: { paperHeightIn: 0.5, role: 'drawing' },
    params: [field('name', 'Level', 'FIRST FLOOR'), field('elevation', 'Elevation', 'EL. 100\'-0"')],
    render(p, box) {
      const g = grid(box), cx = 14, cy = 32, r = 10;
      const quarter = (a0) => poly(g, [[cx, cy], ...[0, 1, 2, 3, 4, 5, 6].map(i => {
        const a = a0 + (Math.PI / 2) * (i / 6);
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      })], 0.5, { fill: true });
      return [
        quarter(-Math.PI / 2), quarter(Math.PI / 2), circle(g, cx, cy, r, 2),
        line(g, cx - r - 2, cy, cx + r, cy, 1.5), line(g, cx, cy - r - 2, cx, cy + r + 2, 1.5),
        line(g, cx + r, cy, 188, cy, 2),
        text(g, 104, 22, p.name, 14), text(g, 104, 44, p.elevation, 13),
      ];
    },
    editableLabels(p, box) {
      const g = grid(box);
      return [{ id: 'name', rect: labelRect(g, 104, 22, 160, 16), fields: ['name'] },
        { id: 'elevation', rect: labelRect(g, 104, 44, 160, 16), fields: ['elevation'] }];
    },
  },
  {
    id: 'us-spot-elevation',
    name: 'Spot elevation', nameEn: 'Spot elevation', category: CAT,
    defaultSize: { width: 128, height: 64 },
    markset: { paperHeightIn: 0.375, role: 'drawing' },
    params: [field('elevation', 'Elevation', '100\'-0"')],
    render(p, box) {
      const g = grid(box);
      return [line(g, 4, 32, 24, 32, 2.5), line(g, 14, 22, 14, 42, 2.5), text(g, 74, 33, p.elevation, 22)];
    },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'elevation', rect: labelRect(g, 74, 33, 96, 26), fields: ['elevation'] }]; },
  },
  // --- Grids, titles, revisions ------------------------------------------------
  {
    id: 'us-grid-bubble',
    name: 'Column grid bubble', nameEn: 'Column grid bubble', category: CAT,
    defaultSize: { width: 32, height: 64 },
    markset: { paperHeightIn: 1.5, role: 'drawing' },
    params: [field('label', 'Grid', '1'), { key: 'gridLine', label: 'Grid line', labelEn: 'Grid line', type: 'boolean', default: true }],
    render(p, box) {
      const g = grid(box);
      const cmds = [circle(g, 16, 11, 10, 1.2), text(g, 16, 11.5, p.label, 10)];
      if (p.gridLine !== false) cmds.push(line(g, 16, 21, 16, 63, 1, [8, 3, 2, 3]));
      return cmds;
    },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'label', rect: labelRect(g, 16, 11, 14, 12), fields: ['label'] }]; },
  },
  {
    id: 'us-drawing-title',
    name: 'Drawing title', nameEn: 'Drawing title', category: CAT,
    defaultSize: { width: 256, height: 64 },
    markset: { paperHeightIn: 0.5, role: 'drawing' },
    params: [field('number', 'Drawing', '1'), field('title', 'Title', 'FIRST FLOOR PLAN'), field('scale', 'Scale', '1/8" = 1\'-0"')],
    render(p, box) {
      const g = grid(box);
      return [circle(g, 22, 32, 16, 2), text(g, 22, 33, p.number, 16),
        line(g, 44, 34, 252, 34, 2.5), text(g, 148, 22, p.title, 16), text(g, 148, 46, p.scale, 12)];
    },
    editableLabels(p, box) {
      const g = grid(box);
      return [{ id: 'number', rect: labelRect(g, 22, 32, 20, 18), fields: ['number'] },
        { id: 'title', rect: labelRect(g, 148, 22, 200, 18), fields: ['title'] },
        { id: 'scale', rect: labelRect(g, 148, 46, 120, 14), fields: ['scale'] }];
    },
  },
  {
    id: 'us-revision-delta',
    name: 'Revision delta', nameEn: 'Revision delta', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.375, role: 'drawing' },
    params: [field('revision', 'Revision', '1')],
    render(p, box) { const g = grid(box); return [poly(g, [[32, 5], [60, 57], [4, 57]], 2.5), text(g, 32, 41, p.revision, 22)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'revision', rect: labelRect(g, 32, 40, 28, 22), fields: ['revision'] }]; },
  },
  // --- Tags --------------------------------------------------------------------
  {
    id: 'us-room-tag',
    name: 'Room name and number', nameEn: 'Room name and number', category: CAT,
    defaultSize: { width: 128, height: 64 },
    markset: { paperHeightIn: 0.5, role: 'drawing' },
    params: [field('name', 'Room name', 'OFFICE'), field('number', 'Room number', '101')],
    render(p, box) {
      const g = grid(box);
      return [text(g, 64, 17, p.name, 18), poly(g, [[38, 32], [90, 32], [90, 58], [38, 58]], 2), text(g, 64, 45.5, p.number, 17)];
    },
    editableLabels(p, box) {
      const g = grid(box);
      return [{ id: 'name', rect: labelRect(g, 64, 17, 120, 22), fields: ['name'] },
        { id: 'number', rect: labelRect(g, 64, 45, 50, 24), fields: ['number'] }];
    },
  },
  {
    id: 'us-ceiling-height',
    name: 'Ceiling height', nameEn: 'Ceiling height', category: CAT,
    defaultSize: { width: 96, height: 64 },
    markset: { paperHeightIn: 0.375, role: 'drawing' },
    params: [field('height', 'Ceiling height', '8\'-0"')],
    render(p, box) { const g = grid(box); return [...stadium(g, 4, 92, 32, 40, 2), text(g, 48, 33, p.height, 18)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'height', rect: labelRect(g, 48, 32, 70, 30), fields: ['height'] }]; },
  },
  {
    id: 'us-door-tag',
    name: 'Door number', nameEn: 'Door number', category: CAT,
    defaultSize: { width: 96, height: 64 },
    markset: { paperHeightIn: 0.3, role: 'drawing' },
    params: [field('number', 'Door number', '001')],
    render(p, box) { const g = grid(box); return [...stadium(g, 6, 90, 32, 44, 2.5), text(g, 48, 33, p.number, 20)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'number', rect: labelRect(g, 48, 32, 64, 32), fields: ['number'] }]; },
  },
  {
    id: 'us-window-tag',
    name: 'Window number', nameEn: 'Window number', category: CAT,
    defaultSize: { width: 96, height: 64 },
    markset: { paperHeightIn: 0.3, role: 'drawing' },
    params: [field('number', 'Window number', '001')],
    render(p, box) {
      const g = grid(box);
      return [poly(g, [[4, 32], [20, 10], [76, 10], [92, 32], [76, 54], [20, 54]], 2.5), text(g, 48, 33, p.number, 20)];
    },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'number', rect: labelRect(g, 48, 32, 60, 32), fields: ['number'] }]; },
  },
  {
    id: 'us-partition-type',
    name: 'Partition type', nameEn: 'Partition type', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.5, role: 'drawing' },
    params: [field('type', 'Partition type', '1')],
    render(p, box) {
      const g = grid(box);
      return [poly(g, [[32, 3], [51, 22], [32, 41], [13, 22]], 2), text(g, 32, 23, p.type, 14), line(g, 32, 41, 32, 63, 1.5)];
    },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'type', rect: labelRect(g, 32, 22, 20, 18), fields: ['type'] }]; },
  },
  {
    id: 'us-keynote-tag',
    name: 'Keynote tag', nameEn: 'Keynote tag', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.3, role: 'drawing' },
    params: [field('key', 'Keynote', '1')],
    render(p, box) { const g = grid(box); return [poly(g, [[6, 6], [58, 6], [58, 58], [6, 58]], 2.5), text(g, 32, 33, p.key, 22)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'key', rect: labelRect(g, 32, 32, 44, 28), fields: ['key'] }]; },
  },
  {
    id: 'us-equipment-tag',
    name: 'Equipment tag', nameEn: 'Equipment tag', category: CAT,
    defaultSize: { width: 128, height: 64 },
    markset: { paperHeightIn: 0.375, role: 'drawing' },
    params: [field('tag', 'Equipment', 'AHU-1')],
    render(p, box) { const g = grid(box); return [poly(g, [[4, 10], [124, 10], [124, 54], [4, 54]], 2.5), text(g, 64, 33, p.tag, 22)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'tag', rect: labelRect(g, 64, 32, 110, 30), fields: ['tag'] }]; },
  },
  // --- Field ----------------------------------------------------------------
  {
    id: 'us-punch-marker',
    name: 'Punch marker (numbered)', nameEn: 'Punch marker (numbered)', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.375, role: 'review' },
    params: [field('number', 'Number', '001')],
    render(p, box) { const g = grid(box); return [circle(g, 32, 32, 28, 4), text(g, 32, 33, p.number, 20, true)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'number', rect: labelRect(g, 32, 32, 48, 26), fields: ['number'] }]; },
  },
];
