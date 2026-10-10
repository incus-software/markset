// Markset brand overlay.
//
// Upstream Open PDF Studio uses its product name in hundreds of places (UI
// strings in 39 languages, window titles, document metadata). Editing those
// files would turn every weekly upstream merge into a conflict, so Markset
// rewrites the name at build/dev time instead. Source files stay identical to
// upstream; only the bundled output says "Markset".
//
// Credits to the upstream project live under open-pdf-studio/markset/ and are
// not rewritten.

import { resolve } from 'node:path';

export const UPSTREAM_NAME = /Open PDF Studio/g;
export const PRODUCT_NAME = 'Markset';

const TEXT_FILE = /\.(m?[jt]sx?|json|html)(\?.*)?$/;

const slashes = (p) => String(p).replace(/\\/g, '/');

/**
 * Should module `id` be rebranded? Not dependencies, and not Markset's own
 * folder (`ownDir`, the absolute path of open-pdf-studio/markset). Only that
 * folder counts: the repository itself is also called "markset", so every
 * path contains "/markset/".
 */
export function shouldBrand(id, ownDir) {
  const path = slashes(id).replace(/\?.*$/, '');
  if (path.includes('/node_modules/')) return false;
  const own = slashes(ownDir).replace(/\/?$/, '/').toLowerCase();
  if (path.toLowerCase().startsWith(own)) return false;
  return TEXT_FILE.test(path);
}

export function marksetBrand() {
  let ownDir = resolve(process.cwd(), 'markset');
  return {
    name: 'markset-brand',
    enforce: 'pre',
    configResolved(config) {
      ownDir = resolve(config.root, 'markset');
    },
    transform(code, id) {
      if (!code.includes('Open PDF Studio') || !shouldBrand(id, ownDir)) return null;
      return { code: code.replace(UPSTREAM_NAME, PRODUCT_NAME), map: null };
    },
    transformIndexHtml(html) {
      return html.replace(UPSTREAM_NAME, PRODUCT_NAME);
    },
  };
}
