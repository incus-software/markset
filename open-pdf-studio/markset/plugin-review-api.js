// Markset: plugin API calls for review tools (feature flag `reviewTools`),
// such as a markup log, saved tool styles and working copies of evidence.
//
//   api.showAnnotation(id) -> boolean
//       Goes to the markup's page, selects it and scrolls it into view, as a
//       click in the Annotations panel does. False when it is not loaded.
//   api.getSelectedAnnotations() -> object[]
//       Copies of the selected markups (changing them changes nothing).
//   api.setToolStyle(type, props)
//       Makes props (color, strokeColor, fillColor, lineWidth, opacity,
//       borderStyle, line ends, fontSize...) the default style for new markups
//       of that type, as "Set as default style" does.
//   api.openDocument(path) -> Promise
//       Opens a PDF in its own tab (or switches to it when already open).
//   api.getDocumentInfo() also carries `path` (null for a new, unsaved PDF),
//   and api.readPageContent(page, { vectors: false }) skips the vector pass
//   when only the page text is needed.
//
// App modules load on use, so this file stays importable under node --test.

const copy = (v) => JSON.parse(JSON.stringify(v));

export function createReviewApi({ getActiveDocument }) {
  return {
    async showAnnotation(id) {
      const doc = getActiveDocument();
      const ann = (doc?.annotations || []).find((a) => a.id === id);
      if (!ann) return false;
      const { selectAnnotationItem } = await import('../js/ui/panels/annotations-list.js');
      await selectAnnotationItem(id, ann.page);
      return true;
    },
    getSelectedAnnotations() {
      const doc = getActiveDocument();
      const list = doc?.selectedAnnotations?.length ? doc.selectedAnnotations : (doc?.selectedAnnotation ? [doc.selectedAnnotation] : []);
      return list.map(copy);
    },
    async setToolStyle(type, props = {}) {
      if (typeof type !== 'string' || !type) throw new TypeError('setToolStyle: type is required');
      const { setAsDefaultStyle } = await import('../js/core/preferences.js');
      setAsDefaultStyle({ ...copy(props || {}), type });
    },
    async openDocument(path) {
      if (typeof path !== 'string' || !path) throw new TypeError('openDocument: path is required');
      const { isTauri } = await import('../js/core/platform.js');
      if (isTauri()) {
        try { await window.__TAURI__.core.invoke('allow_fs_scope', { path }); } catch { /* scope may already allow it */ }
      }
      const { createTab } = await import('../js/ui/chrome/tabs.js');
      const { loadPDFIfNeeded } = await import('../js/pdf/loader.js');
      const { index } = createTab(path);
      await loadPDFIfNeeded(path, index);
    },
  };
}
