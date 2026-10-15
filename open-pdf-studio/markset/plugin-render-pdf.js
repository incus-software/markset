// Markset: lets a plugin render a page of a PDF it was given as bytes (for
// example a file the user picked), using the app's own pdf.js. Plugins are
// loaded from a single file and cannot bundle pdf.js and its worker.

/** Longest side, in pixels, a plugin may request (keeps memory bounded). */
export const MAX_RENDER_PX = 6000;

/** Clamp the requested scale so the rendered page stays within MAX_RENDER_PX. */
export function clampRenderScale(widthPt, heightPt, scale) {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 4;
  const longest = Math.max(widthPt, heightPt);
  return longest > 0 ? Math.min(s, MAX_RENDER_PX / longest) : s;
}

/**
 * Render one page of a PDF to a canvas with a transparent background.
 * @param {ArrayBuffer|Uint8Array} bytes
 * @param {{page?: number, scale?: number}} [options] scale in px per point (default 4 = 288 dpi)
 * @returns {Promise<{canvas: HTMLCanvasElement, widthPt: number, heightPt: number, pageCount: number}>}
 */
export async function renderPdfBytes(bytes, { page = 1, scale = 4 } = {}) {
  if (!bytes || !(bytes.byteLength > 0)) throw new TypeError('renderPdf needs the PDF bytes');
  const pdfjsLib = await import('pdfjs-dist');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes).slice() }).promise;
  try {
    if (!Number.isInteger(page) || page < 1 || page > doc.numPages) throw new RangeError('Invalid page');
    const pdfPage = await doc.getPage(page);
    const base = pdfPage.getViewport({ scale: 1 });
    const viewport = pdfPage.getViewport({ scale: clampRenderScale(base.width, base.height, scale) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport, background: 'rgba(0,0,0,0)' }).promise;
    return { canvas, widthPt: base.width, heightPt: base.height, pageCount: doc.numPages };
  } finally {
    doc.destroy();
  }
}
