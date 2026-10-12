import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSvgXml, parseColor, parseTransform, pathDataToOps, helveticaWidth, svgToPdfAppearance,
} from './svg-to-pdf.js';

const svg = (body, attrs = 'fill="none" stroke="#000" stroke-width="2"') =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

test('parseSvgXml reads nested elements, text and entities', () => {
  const root = parseSvgXml(`<?xml version="1.0"?><!-- c --><svg viewBox="0 0 64 64"><g><text x="1">A &amp; B</text></g></svg>`);
  assert.equal(root.name, 'svg');
  assert.equal(root.children[0].children[0].text, 'A & B');
  assert.equal(parseSvgXml('<svg><g></svg>'), null);
  assert.equal(parseSvgXml('no svg here'), null);
});

test('parseColor', () => {
  assert.deepEqual(parseColor('#d00'), [13 / 15, 0, 0]);
  assert.deepEqual(parseColor('#000000'), [0, 0, 0]);
  assert.deepEqual(parseColor('rgb(255, 0, 0)'), [1, 0, 0]);
  assert.deepEqual(parseColor('white'), [1, 1, 1]);
  assert.equal(parseColor('none'), null);
  assert.deepEqual(parseColor('currentColor', [0, 0, 1]), [0, 0, 1]);
  assert.equal(parseColor('url(#g)'), undefined);
});

test('parseTransform', () => {
  assert.deepEqual(parseTransform('translate(10 5)'), [1, 0, 0, 1, 10, 5]);
  assert.deepEqual(parseTransform('scale(2)'), [2, 0, 0, 2, 0, 0]);
  const r = parseTransform('rotate(90 32 32)');
  assert.deepEqual(r.map((n) => Math.round(n * 1e6) / 1e6), [0, 1, -1, 0, 64, 0]);
  assert.equal(parseTransform('bogus(1)'), null);
});

test('pathDataToOps: lines, relative moves, close, implicit line-tos', () => {
  assert.equal(pathDataToOps('M10 20 L30 40 Z'), '10 20 m\n30 40 l\nh');
  assert.equal(pathDataToOps('m10 20 10 0 0 10z'), '10 20 m\n20 20 l\n20 30 l\nh');
  assert.equal(pathDataToOps('M0 0 H10 V5 h-10'), '0 0 m\n10 0 l\n10 5 l\n0 5 l');
  assert.equal(pathDataToOps('M0 0 X1'), null);
  assert.equal(pathDataToOps('10 10'), null);
});

test('pathDataToOps: quadratic and arc segments become cubics', () => {
  assert.equal(pathDataToOps('M0 0 Q10 10 20 0'), '0 0 m\n6.6667 6.6667 13.3333 6.6667 20 0 c');
  const arc = pathDataToOps('M0 32 A32 32 0 0 1 64 32').split('\n');
  assert.equal(arc.length, 3); // move + two quarter-circle cubics
  assert.match(arc[2], / 64 32 c$/);
  // Packed flags ("01") as written by some editors.
  assert.ok(pathDataToOps('M0 0a5 5 0 015 5'));
});

test('helveticaWidth uses the AFM widths', () => {
  assert.equal(helveticaWidth('VIF', 1000, true), 667 + 278 + 611);
  assert.equal(helveticaWidth('ok', 10), (556 + 500) / 100);
});

test('appearance: viewBox maps onto the box with the y axis flipped', () => {
  const ap = svgToPdfAppearance(svg('<line x1="0" y1="0" x2="64" y2="64"/>'), 32, 32);
  assert.match(ap.ops, /^q\n0\.5 0 0 -0\.5 0 32 cm\n/);
  assert.match(ap.ops, /0 0 0 RG\n2 w\n0 0 m\n64 64 l\nS/);
  assert.deepEqual(ap.fonts, []);
});

test('appearance: a wide box centres a square symbol', () => {
  const ap = svgToPdfAppearance(svg('<circle cx="32" cy="32" r="10"/>'), 128, 64);
  assert.match(ap.ops, /^q\n1 0 0 -1 32 64 cm/);
});

test('appearance: fills, strokes and paint operators', () => {
  const ap = svgToPdfAppearance(svg(
    '<rect x="4" y="4" width="20" height="10" fill="#d00" stroke="none"/>' +
    '<polygon points="0,0 10,0 5,8" fill="#000"/>' +
    '<path d="M0 0 L5 5" stroke-linecap="round" stroke-dasharray="4 2"/>'), 64, 64);
  assert.match(ap.ops, /0\.8667 0 0 rg\n4 4 20 10 re\nf\n/);
  assert.match(ap.ops, /0 0 0 rg\n0 0 0 RG\n2 w\n0 0 m\n10 0 l\n5 8 l\nh\nB/);
  assert.match(ap.ops, /1 J\n\[4 2\] 0 d\n0 0 m\n5 5 l\nS/);
});

test('appearance: centred bold text uses Helvetica-Bold', () => {
  const ap = svgToPdfAppearance(
    svg('<text x="32" y="40" font-size="20" font-weight="bold" text-anchor="middle" fill="#d00" stroke="none">VIF</text>'), 64, 64);
  const half = helveticaWidth('VIF', 20, true) / 2;
  assert.ok(ap.ops.includes(`1 0 0 -1 ${Math.round((32 - half) * 1e4) / 1e4} 40 Tm\n(VIF) Tj`));
  assert.deepEqual(ap.fonts, ['F2']);
});

test('appearance: opacity becomes an ExtGState', () => {
  const ap = svgToPdfAppearance(svg('<g opacity="0.5"><circle cx="5" cy="5" r="2"/></g>'), 64, 64);
  assert.deepEqual(ap.gstates, [{ name: 'GS0', ca: 0.5, CA: 0.5 }]);
  assert.match(ap.ops, /q\n\/GS0 gs\n/);
});

test('appearance: unsupported content falls back (null)', () => {
  for (const body of [
    '<image href="x.png"/>', '<use href="#a"/>', '<style>.a{}</style>',
    '<circle cx="1" cy="1" r="1" fill="url(#g)"/>', '<g transform="perspective(1)"><circle r="1"/></g>',
    '<path d="M0 0 L5 5" marker-end="url(#a)"/>', '<g clip-path="url(#c)"><circle r="1"/></g>',
    '<path d="M0 0 L5 5" style="filter:blur(1px)"/>', '<svg x="5" viewBox="0 0 1 1"><circle r="1"/></svg>',
  ]) assert.equal(svgToPdfAppearance(svg(body), 64, 64), null, body);
  assert.equal(svgToPdfAppearance('<svg></svg>', 64, 64), null); // no viewBox or size
  assert.equal(svgToPdfAppearance(svg(''), 0, 64), null);
});

test('appearance: an upstream library north arrow converts', () => {
  const arrow = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#000" stroke-width="2"><circle cx="32" cy="36" r="20"/><path d="M32 20 L38 44 L32 39 L26 44 Z" fill="#000" stroke="none"/><text x="32" y="12" font-size="12" font-weight="bold" text-anchor="middle" fill="#000" stroke="none">N</text></svg>';
  const ap = svgToPdfAppearance(arrow, 64, 64);
  assert.ok(ap);
  assert.match(ap.ops, /\(N\) Tj/);
  assert.equal((ap.ops.match(/^q$/gm) || []).length, (ap.ops.match(/^Q$/gm) || []).length);
});
