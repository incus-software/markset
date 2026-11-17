// Markset: file and folder pickers for plugins (feature flag `multiFilePick`).
//
//   api.pickFilePaths(extensions?) -> string[]
//       Asks for one or more existing files (Ctrl/Shift-click to pick many) and
//       returns their paths; [] when cancelled. For example a site visit's photos.
//   api.pickFolderPath(title?) -> path | null
//       Asks for a folder and returns its path; null when cancelled. For example
//       where to save working copies of many files at once.
//
// The dialogs are the app's own (js/core/platform.js); they are passed in so
// the tests can stand in for them.

/** The dialog's answer as a list of paths: one path, a list, or nothing (cancelled). */
export function pickedPaths(result) {
  const list = Array.isArray(result) ? result : result ? [result] : [];
  return list.map((p) => (p && typeof p === 'object' && 'path' in p ? p.path : p))
    .filter((p) => typeof p === 'string' && p)
    .map(String);
}

/** The picker calls, given the app's dialogs ({ openFileDialog, openFolderDialog }). */
export function createFilePickApi(dialogs) {
  return {
    async pickFilePaths(extensions) {
      const exts = Array.isArray(extensions) && extensions.length ? extensions : undefined;
      return pickedPaths(await dialogs.openFileDialog(exts, { multiple: true }));
    },
    async pickFolderPath(title) {
      const picked = await dialogs.openFolderDialog(typeof title === 'string' && title ? title : undefined);
      return pickedPaths(picked)[0] || null;
    },
  };
}
