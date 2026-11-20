// Maakt een blad van 36" x 48" (3456 x 2592 pt) met dichte vectorlijnen, voor
// de zoommeting (meet-zoom-scherpte.mjs). Gebruik:
//   node scripts/maak-groot-vectorblad.mjs <uit.pdf> [paginas]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(new URL('../open-pdf-studio/package.json', import.meta.url));
const { PDFDocument, StandardFonts } = require('pdf-lib');

const out = process.argv[2];
const pages = Number(process.argv[3] || 2);
const W = 3456, H = 2592;

let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
for (let p = 0; p < pages; p++) {
  const page = doc.addPage([W, H]);
  const ops = [];
  ops.push('0.25 w 0 0 0 RG');
  // Contour lines: 400 polylines x 300 segments of hairline.
  for (let c = 0; c < 400; c++) {
    const y0 = 60 + c * ((H - 120) / 400);
    let x = 60, y = y0;
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} m`);
    for (let s = 0; s < 300; s++) {
      x += (W - 120) / 300;
      y = y0 + Math.sin((x + c * 13) / 90) * 12 + (rnd() - 0.5) * 2;
      ops.push(`${x.toFixed(2)} ${y.toFixed(2)} l`);
    }
    ops.push('S');
  }
  // Hatch blocks.
  ops.push('0.1 w 0.3 0.3 0.3 RG');
  for (let b = 0; b < 120; b++) {
    const bx = 100 + rnd() * (W - 400), by = 100 + rnd() * (H - 400);
    for (let k = 0; k < 60; k++) {
      ops.push(`${(bx + k * 4).toFixed(2)} ${by.toFixed(2)} m ${(bx + k * 4 + 120).toFixed(2)} ${(by + 120).toFixed(2)} l`);
    }
    ops.push('S');
  }
  page.pushOperators(); // ensure contents array exists
  const stream = doc.context.flateStream(ops.join('\n'));
  const ref = doc.context.register(stream);
  page.node.addContentStream(ref);
  // Small text labels (survey annotations) at 4-6 pt.
  for (let t = 0; t < 1500; t++) {
    page.drawText(`EL ${(5000 + rnd() * 900).toFixed(2)}  N${Math.floor(rnd() * 90)}°${Math.floor(rnd() * 60)}'E`, {
      x: 80 + rnd() * (W - 300), y: 80 + rnd() * (H - 160), size: 3 + rnd() * 3, font,
    });
  }
  page.drawText(`SHEET V-${p + 1}  GENERATED ZOOM TEST`, { x: W - 900, y: 80, size: 40, font });
}
writeFileSync(out, await doc.save());
console.log('wrote', out);
