// Markset brand overlay.
//
// Upstream Open PDF Studio uses its product name in hundreds of places (UI
// strings in 39 languages, window titles, document metadata). Editing those
// files would turn every weekly upstream merge into a conflict, so Markset
// rewrites the name at build/dev time instead. Source files stay identical to
// upstream; only the bundled output says "Markset".
//
// Credits to the upstream project live under markset/ and are not rewritten.

export const UPSTREAM_NAME = /Open PDF Studio/g;
export const PRODUCT_NAME = 'Markset';

const TEXT_FILE = /\.(m?[jt]sx?|json|html)(\?.*)?$/;

export function marksetBrand() {
  return {
    name: 'markset-brand',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('node_modules') || id.includes('/markset/')) return null;
      if (!TEXT_FILE.test(id) || !code.includes('Open PDF Studio')) return null;
      return { code: code.replace(UPSTREAM_NAME, PRODUCT_NAME), map: null };
    },
    transformIndexHtml(html) {
      return html.replace(UPSTREAM_NAME, PRODUCT_NAME);
    },
  };
}
