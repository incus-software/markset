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
