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

import { resolve, relative } from 'node:path';
import { applyTranslations, ASSISTANT_EN } from './translations/assistant-en.js';

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

/**
 * The upstream file's path from open-pdf-studio/ ("js/…") for a module id,
 * or null outside it. Used to look up English text for files that have
 * Dutch written into the code (markset/translations/).
 */
export function upstreamRelPath(id, root) {
  const rel = slashes(relative(root, slashes(id).replace(/\?.*$/, '')));
  return rel && !rel.startsWith('..') ? rel : null;
}

export function marksetBrand() {
  let root = process.cwd();
  let ownDir = resolve(root, 'markset');
  return {
    name: 'markset-brand',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
      ownDir = resolve(config.root, 'markset');
    },
    transform(code, id) {
      if (!shouldBrand(id, ownDir)) return null;
      const rel = upstreamRelPath(id, root);
      // English text first: the pairs match upstream's source as written.
      let out = rel && ASSISTANT_EN[rel] ? applyTranslations(code, rel) : code;
      if (out.includes('Open PDF Studio')) out = out.replace(UPSTREAM_NAME, PRODUCT_NAME);
      return out === code ? null : { code: out, map: null };
    },
    transformIndexHtml(html) {
      return html.replace(UPSTREAM_NAME, PRODUCT_NAME);
    },
  };
}
