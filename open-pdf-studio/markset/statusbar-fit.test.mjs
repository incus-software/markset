// Markset: Fit Page and Fit Width sit in the status bar beside the zoom, and
// run the same commands as the ribbon, with the current shortcut in the tooltip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bar = readFileSync(new URL('../js/solid/components/StatusBar.jsx', import.meta.url), 'utf8');

test('the status bar has Fit Page and Fit Width after the zoom controls', () => {
  const zoom = bar.indexOf('<div class="status-zoom-controls">');
  const page = bar.indexOf('id="status-fit-page"');
  const width = bar.indexOf('id="status-fit-width"');
  assert.ok(zoom > 0 && page > zoom && width > page, 'zoom, then Fit Page, then Fit Width');
  assert.ok(bar.indexOf('</div>', zoom) > width, 'inside the zoom group');
});

test('they run the renderer commands and show the current shortcut', () => {
  assert.match(bar, /const \{ fitPage \} = await import\('\.\.\/\.\.\/pdf\/renderer\.js'\);\s*fitPage\(\);/);
  assert.match(bar, /const \{ fitWidth \} = await import\('\.\.\/\.\.\/pdf\/renderer\.js'\);\s*fitWidth\(\);/);
  assert.match(bar, /titleWithShortcut\(t\('ribbon:home\.fitPage'\), sneltoetsVoor\('view\.fitPage'\)\)/);
  assert.match(bar, /titleWithShortcut\(t\('ribbon:home\.fitWidth'\), sneltoetsVoor\('view\.fitWidth'\)\)/);
});
