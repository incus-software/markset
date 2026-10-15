// Markset: plugin API calls for smart symbols (feature flag `smartSymbols`).
//
//   api.registerParametricTemplate(template) -> remove()
//       A parametric template drawn by the core: { id, name, nameEn?, params:
//       [{key, label, type, default}], render(params, box) -> commands,
//       defaultSize?, editableLabels?, markset?: { contentSize, colors,
//       toggleAt, editHitAt, propertiesPanel } } (see smart/hooks.js). Saved
//       symbols keep a frozen copy, so copies of Markset without the plugin
//       still show them.
//   api.registerSymbolCategory(descriptor) -> { update(partial), remove() }
//       A Toolpalette group (see smart/plugin-categories.js).
//   api.placeParametricSymbol(templateId, params)
//       Starts placing that symbol with those params (the next click places it).
//   api.saveBinaryFile(defaultName, bytes, filters?) -> path | null
//       Asks where to save and writes the bytes; null when cancelled.
//   api.pickFilePath(extensions?) -> path | null           (flag filePaths)
//       Asks for an existing file and returns its path, so the plugin can
//       read it again later (e.g. a shared file on an office drive).
//   api.readFileAt(path) -> Uint8Array | null              (flag filePaths)
//       The file's bytes, or null when it is missing or cannot be read.
//   api.writeFileAt(path, bytes) -> true                   (flag filePaths)
//       Writes the bytes in place (staged, so a failed write keeps the old file).
//   api.symbolPreviewSvg(cmds, box, { color, lineWidth }?) -> svg | null
//       Draw commands (as a template's render returns them) as an SVG string,
//       for palette entries and previews; drawn by the app (smart/cmds-svg.js).
//
// Everything a plugin registers is removed when it is deactivated.
import { getTemplate } from '../js/symbols/registry.js';
import { registerPluginTemplate } from './smart/index.js';
import { cmdsToSvg } from './smart/cmds-svg.js';
import { registerSymbolCategory as addCategory, unregisterSymbolCategory } from './smart/plugin-categories.js';

export function createSmartSymbolApi() {
  const removers = new Map(); // template id -> remove()
  const categoryIds = new Set();

  return {
    methods: {
      registerParametricTemplate(template) {
        const id = template?.id;
        if (removers.has(id)) removers.get(id)();
        else if (id && getTemplate(id)) throw new Error(`A symbol template "${id}" already exists`);
        const remove = registerPluginTemplate(template);
        removers.set(id, remove);
        return () => { if (removers.get(id) === remove) { remove(); removers.delete(id); } };
      },
      async placeParametricSymbol(templateId, params = {}) {
        if (!getTemplate(templateId)) throw new Error(`No symbol template "${templateId}"`);
        // App modules load on use, so this file stays importable under node --test.
        const { setPendingSymbolWithParams } = await import('../js/solid/stores/parametricSymbolStore.js');
        const { setTool } = await import('../js/tools/manager.js');
        setPendingSymbolWithParams(templateId, params);
        setTool('parametricSymbol');
      },
      async saveBinaryFile(defaultName, bytes, filters) {
        const { isTauri, saveFileDialog, writeBinaryFile } = await import('../js/core/platform.js');
        const path = await saveFileDialog(String(defaultName || 'file'), filters);
        if (!path) return null;
        if (isTauri()) {
          try { await window.__TAURI__.core.invoke('allow_fs_scope', { path }); } catch { /* scope may already allow it */ }
        }
        await writeBinaryFile(path, bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
        return path;
      },
      async pickFilePath(extensions) {
        const { openFileDialog } = await import('../js/core/platform.js');
        const picked = await openFileDialog(Array.isArray(extensions) && extensions.length ? extensions : undefined);
        const path = Array.isArray(picked) ? picked[0] : picked;
        return path ? String(path) : null;
      },
      async readFileAt(path) {
        if (!path) return null;
        const { isTauri, readBinaryFile } = await import('../js/core/platform.js');
        try {
          if (isTauri()) await window.__TAURI__.core.invoke('allow_fs_scope', { path: String(path) });
          const bytes = await readBinaryFile(String(path));
          return bytes ? new Uint8Array(bytes) : null;
        } catch {
          return null;
        }
      },
      async writeFileAt(path, bytes) {
        if (!path) throw new Error('writeFileAt: no path');
        const { isTauri, writeBinaryFileAtomic } = await import('../js/core/platform.js');
        if (isTauri()) {
          try { await window.__TAURI__.core.invoke('allow_fs_scope', { path: String(path) }); } catch { /* scope may already allow it */ }
        }
        await writeBinaryFileAtomic(String(path), bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
        return true;
      },
      symbolPreviewSvg(cmds, box, opts) {
        return cmdsToSvg(cmds, box, opts);
      },
      registerSymbolCategory(descriptor) {
        const handle = addCategory(descriptor);
        categoryIds.add(descriptor.id);
        return {
          update: handle.update,
          remove() { handle.remove(); categoryIds.delete(descriptor.id); },
        };
      },
    },
    cleanup() {
      for (const remove of removers.values()) remove();
      removers.clear();
      for (const id of categoryIds) unregisterSymbolCategory(id);
      categoryIds.clear();
    },
  };
}
