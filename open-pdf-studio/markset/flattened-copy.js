// Markset: File > Save Flattened Copy. Saves a copy of the open PDF with every
// markup drawn into the pages (markset/flatten-pdf.js), for sending to people
// who may open it in any viewer: the notes show everywhere, like a printed
// set, and cannot be hidden by a viewer's comment settings. The open document
// and its file are not changed, and the copy can never replace the file.
// App modules load on use, so this file stays importable under node --test.

const samePath = (a, b) => !!a && !!b && a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase();

/** "C:\Jobs\A-101.pdf" → "C:\Jobs\A-101 (flattened).pdf" */
export function flattenedCopyPath(doc) {
  const name = String(doc?.fileName || 'document.pdf').replace(/\.pdf$/i, '');
  const path = !doc?.isUntitled && doc?.filePath ? String(doc.filePath) : '';
  const cut = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  const dir = cut > 0 ? path.slice(0, cut + 1) : '';
  return `${dir}${name} (flattened).pdf`;
}

export async function saveFlattenedCopy(doc) {
  const { getActiveDocument } = await import('../js/core/state.js');
  const { isTauri, saveFileDialog, writeBinaryFileAtomic } = await import('../js/core/platform.js');
  const { showLoading, hideLoading } = await import('../js/ui/chrome/dialogs.js');
  const { updateStatusMessage } = await import('../js/ui/chrome/status-bar.js');
  const { showMessage } = await import('../js/bridge.js');
  const { default: i18next } = await import('../js/i18n/config.js');
  doc = doc || getActiveDocument();
  if (!doc?.pdfDoc) { showMessage(i18next.t('noPdfLoaded')); return false; }
  const path = await saveFileDialog(flattenedCopyPath(doc), [{ name: 'PDF Files', extensions: ['pdf'] }]);
  if (!path) return false;
  if (samePath(path, doc.filePath) || samePath(path, doc.saveTargetPath)) {
    showMessage(i18next.t('flattenedCopySameFile', { defaultValue: 'Choose another name: the flattened copy cannot replace the PDF you are working on.' }));
    return false;
  }
  const { buildPdfBytes } = await import('../js/pdf/saver.js');
  const bytes = await buildPdfBytes(doc);
  if (!bytes) return false; // the save step has already said why
  showLoading(i18next.t('flatteningMarkups', { defaultValue: 'Flattening markups…' }));
  try {
    const { flattenPdf } = await import('./flatten-pdf.js');
    const { bytes: flat, flattened, kept } = await flattenPdf(bytes);
    if (isTauri()) {
      try { await window.__TAURI__.core.invoke('allow_fs_scope', { path }); } catch { /* scope may already allow it */ }
    }
    await writeBinaryFileAtomic(path, flat);
    const name = String(path).split(/[\\/]/).pop();
    updateStatusMessage(i18next.t('flattenedCopySaved', {
      defaultValue: 'Saved {{name}} with {{count}} markups drawn into the pages.', name, count: flattened,
    }) + (kept ? ` ${i18next.t('flattenedCopyKept', { defaultValue: '{{count}} could not be flattened and stay as comments.', count: kept })}` : ''));
    return true;
  } catch (e) {
    showMessage(i18next.t('failedToSavePdf', { error: e?.message || String(e) }));
    return false;
  } finally {
    hideLoading();
  }
}
