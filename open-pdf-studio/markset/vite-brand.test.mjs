import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldBrand, marksetBrand } from './vite-brand.mjs';

// The repository checkout is itself called "markset" (locally and on CI).
const roots = [
  'C:/Users/me/repos/markset/open-pdf-studio',
  'D:\\a\\markset\\markset\\open-pdf-studio',
  '/home/runner/work/markset/markset/open-pdf-studio',
];

test('upstream files are rebranded even inside a checkout named markset', () => {
  for (const root of roots) {
    const own = `${root}/markset`;
    assert.ok(shouldBrand(`${root}/js/ui/chrome/tabs.js`, own), root);
    assert.ok(shouldBrand(`${root}/js/i18n/locales/en/dialogs.json?import`, own), root);
    assert.ok(shouldBrand(`${root.replace(/\//g, '\\')}\\js\\core\\state.ts`, own), root);
  }
});

test('Markset files, dependencies and other file types are left alone', () => {
  const root = roots[0];
  const own = `${root}/markset`;
  assert.equal(shouldBrand(`${root}/markset/ForkNotice.jsx`, own), false);
  assert.equal(shouldBrand(`${root}/node_modules/pdfjs-dist/build/pdf.mjs`, own), false);
  assert.equal(shouldBrand(`${root}/styles.css`, own), false);
});

test('the plugin rewrites the product name', () => {
  // A root in this platform's own path form: path.resolve() reads a Windows
  // path as relative on Linux and macOS (CI), and the reverse.
  const root = process.platform === 'win32' ? roots[0] : roots[2];
  const plugin = marksetBrand();
  plugin.configResolved({ root });
  const out = plugin.transform('const t = `Open PDF Studio v${v}`;', `${root}/js/ui/chrome/tabs.js`);
  assert.equal(out.code, 'const t = `Markset v${v}`;');
  assert.equal(plugin.transform('Open PDF Studio', `${root}/markset/ForkNotice.jsx`), null);
});
