// Markset: US "smart" drawing symbols as parametric templates (the upstream
// format in js/symbols/templates/), so their numbers and sheet references are
// text fields in the properties panel and can be edited on the canvas.
//
// Each template is laid out on a grid 64 units high (like the Starter
// Library SVGs) and scaled to its box, so it looks the same at any size.
// `markset` holds the printed height on a 24x36 sheet and the color role.

const CAT = 'US';

// Box helpers: units → page coordinates. 64 units = box height.
function grid(box) {
  const u = box.height / 64;
  const P = (x, y) => ({ x: box.x + x * u, y: box.y + y * u });
  return { u, P, X: (x) => box.x + x * u, Y: (y) => box.y + y * u };
}

const text = (g, x, y, value, size, bold = false) =>
  ({ kind: 'text', ...g.P(x, y), text: String(value ?? ''), size: size * g.u, bold });
const circle = (g, cx, cy, r, w) => {
  const c = g.P(cx, cy);
  return { kind: 'circle', cx: c.x, cy: c.y, r: r * g.u, lineWidth: w * g.u };
};
const line = (g, x1, y1, x2, y2, w, dash) => {
  const a = g.P(x1, y1), b = g.P(x2, y2);
  return { kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, lineWidth: w * g.u, ...(dash ? { dash: dash.map(d => d * g.u) } : {}) };
};
const poly = (g, pts, w, { close = true, fill = false } = {}) =>
  ({ kind: 'polyline', points: pts.map(([x, y]) => g.P(x, y)), close, fill, lineWidth: w * g.u });

// Points of a triangle pointing `dir` from center (cx, cy): tip at `tip`,
// base at `base` units from the center, `half` units each side.
function pointer(cx, cy, dir, tip, base, half) {
  const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir] || [1, 0];
  const [dx, dy] = v, [px, py] = [-dy, dx];
  return [
    [cx + dx * tip, cy + dy * tip],
    [cx + dx * base + px * half, cy + dy * base + py * half],
    [cx + dx * base - px * half, cy + dy * base - py * half],
  ];
}

const DIRECTIONS = [
  { value: 'right', label: 'Right' }, { value: 'left', label: 'Left' },
  { value: 'up', label: 'Up' }, { value: 'down', label: 'Down' },
];
const field = (key, label, def) => ({ key, label, labelEn: label, type: 'string', default: def });

// A circle split by a horizontal line: number on top, sheet below.
function splitBubble(g, cx, cy, r, number, sheet, w) {
  return [
    circle(g, cx, cy, r, w),
    line(g, cx - r, cy, cx + r, cy, w * 0.8),
    text(g, cx, cy - r * 0.42, number, r * 0.62, true),
    text(g, cx, cy + r * 0.45, sheet, r * 0.4),
  ];
}

// The rect (in page coordinates) around text drawn at grid point (x, y),
// for inline editing on the canvas.
const labelRect = (g, x, y, w, h) => ({ x: g.X(x - w / 2), y: g.Y(y - h / 2), width: w * g.u, height: h * g.u });

export const MARKSET_TEMPLATES = [
  {
    id: 'us-detail-callout',
    name: 'Detail callout', nameEn: 'Detail callout', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.5, role: 'drawing' },
    params: [field('number', 'Detail number', '1'), field('sheet', 'Sheet', 'A-501')],
    render(p, box) { return splitBubble(grid(box), 32, 32, 29, p.number, p.sheet, 2.5); },
    editableLabels(p, box) {
      const g = grid(box);
      return [{ id: 'number', rect: labelRect(g, 32, 20, 40, 20), fields: ['number'] },
        { id: 'sheet', rect: labelRect(g, 32, 45, 44, 16), fields: ['sheet'] }];
    },
  },
  {
    id: 'us-section-marker',
    name: 'Section marker', nameEn: 'Section marker', category: CAT,
    defaultSize: { width: 128, height: 64 },
    markset: { paperHeightIn: 0.5, role: 'drawing' },
    params: [
      field('number', 'Section', 'A'), field('sheet', 'Sheet', 'A-301'),
      { key: 'direction', label: 'Looking', labelEn: 'Looking', type: 'enum', default: 'right', options: DIRECTIONS },
      { key: 'cutLine', label: 'Cut line', labelEn: 'Cut line', type: 'boolean', default: true },
    ],
    render(p, box) {
      const g = grid(box);
      const cmds = [];
      if (p.cutLine !== false) cmds.push(line(g, 4, 32, 66, 32, 3, [12, 4, 3, 4]));
      cmds.push(poly(g, pointer(90, 32, p.direction, 34, 20, 15), 1.5, { fill: true }));
      cmds.push(...splitBubble(g, 90, 32, 20, p.number, p.sheet, 2.5));
      return cmds;
    },
    editableLabels(p, box) {
      const g = grid(box);
      return [{ id: 'number', rect: labelRect(g, 90, 24, 28, 14), fields: ['number'] },
        { id: 'sheet', rect: labelRect(g, 90, 41, 32, 12), fields: ['sheet'] }];
    },
  },
  {
    id: 'us-exterior-elevation',
    name: 'Exterior elevation', nameEn: 'Exterior elevation', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.5, role: 'drawing' },
    params: [
      field('number', 'Elevation', '1'), field('sheet', 'Sheet', 'A-201'),
      { key: 'direction', label: 'Looking', labelEn: 'Looking', type: 'enum', default: 'up', options: DIRECTIONS },
    ],
    render(p, box) {
      const g = grid(box);
      return [poly(g, pointer(32, 32, p.direction, 30, 18, 13), 1.5, { fill: true }), ...splitBubble(g, 32, 32, 18, p.number, p.sheet, 2.5)];
    },
  },
  {
    id: 'us-interior-elevation',
    name: 'Interior elevation (4-way)', nameEn: 'Interior elevation (4-way)', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.75, role: 'drawing' },
    params: [
      field('sheet', 'Sheet', 'A-211'),
      ...['up', 'right', 'down', 'left'].map(d => ({
        key: `show_${d}`, label: `Arrow ${d}`, labelEn: `Arrow ${d}`, type: 'boolean', default: true,
      })),
    ],
    render(p, box) {
      const g = grid(box);
      const cmds = [];
      for (const d of ['up', 'right', 'down', 'left']) {
        if (p[`show_${d}`] !== false) cmds.push(poly(g, pointer(32, 32, d, 31, 17, 9), 1.2, { fill: true }));
      }
      cmds.push(circle(g, 32, 32, 15, 2), text(g, 32, 32, p.sheet, 8.5));
      return cmds;
    },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'sheet', rect: labelRect(g, 32, 32, 26, 12), fields: ['sheet'] }]; },
  },
  {
    id: 'us-grid-bubble',
    name: 'Grid bubble', nameEn: 'Grid bubble', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.625, role: 'drawing' },
    params: [field('label', 'Grid', 'A')],
    render(p, box) { const g = grid(box); return [circle(g, 32, 32, 29, 2.5), text(g, 32, 33, p.label, 28, true)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'label', rect: labelRect(g, 32, 32, 40, 32), fields: ['label'] }]; },
  },
  {
    id: 'us-revision-delta',
    name: 'Revision delta', nameEn: 'Revision delta', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.375, role: 'drawing' },
    params: [field('revision', 'Revision', '1')],
    render(p, box) { const g = grid(box); return [poly(g, [[32, 5], [60, 57], [4, 57]], 3), text(g, 32, 41, p.revision, 22, true)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'revision', rect: labelRect(g, 32, 40, 28, 22), fields: ['revision'] }]; },
  },
  {
    id: 'us-keynote-tag',
    name: 'Keynote tag', nameEn: 'Keynote tag', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.3, role: 'drawing' },
    params: [field('key', 'Keynote', '1')],
    render(p, box) { const g = grid(box); return [poly(g, [[6, 6], [58, 6], [58, 58], [6, 58]], 3), text(g, 32, 33, p.key, 22, true)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'key', rect: labelRect(g, 32, 32, 44, 28), fields: ['key'] }]; },
  },
  {
    id: 'us-room-tag',
    name: 'Room tag', nameEn: 'Room tag', category: CAT,
    defaultSize: { width: 128, height: 64 },
    markset: { paperHeightIn: 0.5, role: 'drawing' },
    params: [field('name', 'Room name', 'OFFICE'), field('number', 'Room number', '101')],
    render(p, box) {
      const g = grid(box);
      return [poly(g, [[4, 4], [124, 4], [124, 60], [4, 60]], 2.5), line(g, 14, 36, 114, 36, 1.5),
        text(g, 64, 21, p.name, 17, true), text(g, 64, 48, p.number, 15)];
    },
    editableLabels(p, box) {
      const g = grid(box);
      return [{ id: 'name', rect: labelRect(g, 64, 21, 112, 22), fields: ['name'] },
        { id: 'number', rect: labelRect(g, 64, 48, 60, 18), fields: ['number'] }];
    },
  },
  {
    id: 'us-door-tag',
    name: 'Door tag', nameEn: 'Door tag', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.3, role: 'drawing' },
    params: [field('number', 'Door number', '101')],
    render(p, box) { const g = grid(box); return [circle(g, 32, 32, 28, 3), text(g, 32, 33, p.number, 19, true)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'number', rect: labelRect(g, 32, 32, 48, 26), fields: ['number'] }]; },
  },
  {
    id: 'us-window-tag',
    name: 'Window tag', nameEn: 'Window tag', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.3, role: 'drawing' },
    params: [field('type', 'Window type', 'A')],
    render(p, box) {
      const g = grid(box);
      const hex = [0, 1, 2, 3, 4, 5].map(i => [32 + 29 * Math.cos((Math.PI / 3) * i), 32 + 29 * Math.sin((Math.PI / 3) * i)]);
      return [poly(g, hex, 3), text(g, 32, 33, p.type, 22, true)];
    },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'type', rect: labelRect(g, 32, 32, 40, 28), fields: ['type'] }]; },
  },
  {
    id: 'us-wall-type-tag',
    name: 'Wall type tag', nameEn: 'Wall type tag', category: CAT,
    defaultSize: { width: 64, height: 64 },
    markset: { paperHeightIn: 0.3, role: 'drawing' },
    params: [field('type', 'Wall type', '1')],
    render(p, box) { const g = grid(box); return [poly(g, [[32, 3], [61, 32], [32, 61], [3, 32]], 3), text(g, 32, 33, p.type, 20, true)]; },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'type', rect: labelRect(g, 32, 32, 30, 24), fields: ['type'] }]; },
  },
  {
    id: 'us-equipment-tag',
    name: 'Equipment tag', nameEn: 'Equipment tag', category: CAT,
    defaultSize: { width: 128, height: 64 },
    markset: { paperHeightIn: 0.375, role: 'drawing' },
    params: [field('tag', 'Equipment', 'AHU-1')],
    render(p, box) {
      const g = grid(box);
      return [poly(g, [[16, 10], [112, 10], [124, 32], [112, 54], [16, 54], [4, 32]], 2.5), text(g, 64, 33, p.tag, 21, true)];
    },
    editableLabels(p, box) { const g = grid(box); return [{ id: 'tag', rect: labelRect(g, 64, 32, 96, 28), fields: ['tag'] }]; },
  },
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
