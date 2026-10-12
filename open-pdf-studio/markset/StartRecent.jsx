// Markset: recent files on the start screen (shown when no document is open),
// so they are one click away instead of behind File → Open.
import { createSignal, createEffect, For, Show, onMount, onCleanup } from 'solid-js';
import { state } from '../js/core/state.js';
import { getRecentFiles, removeRecentFile } from '../js/mobile/recent-files.js';
import { loadPDFIfNeeded } from '../js/pdf/loader.js';
import { createTab } from '../js/ui/chrome/tabs.js';
import { isTauri, fileExists } from '../js/core/platform.js';
import { startScreenRecents, folderOf } from './recent.js';
import './start-recent.css';

export default function StartRecent() {
  const [files, setFiles] = createSignal([]);
  const refresh = () => setFiles(startScreenRecents(getRecentFiles()));
  onMount(() => {
    refresh();
    window.addEventListener('focus', refresh);
    onCleanup(() => window.removeEventListener('focus', refresh));
  });
  // The start screen shows again when the last document closes: re-read then.
  createEffect(() => { if ((state.documents?.length ?? 0) === 0) refresh(); });

  async function open(file) {
    if (isTauri()) {
      try {
        await window.__TAURI__.core.invoke('allow_fs_scope', { path: file.path });
        if (!(await fileExists(file.path))) {
          removeRecentFile(file.path);
          refresh();
          return;
        }
      } catch { /* could not check: try opening anyway */ }
    }
    const { index } = createTab(file.path);
    await loadPDFIfNeeded(file.path, index);
  }

  return (
    <Show when={files().length > 0}>
      <div class="markset-start-recent">
        <h3>Recent files</h3>
        <ul>
          <For each={files()}>
            {(f) => (
              <li>
                <button type="button" onClick={() => open(f)} title={f.path}>
                  <span class="markset-recent-name">{f.pinned ? '★ ' : ''}{f.name || f.path}</span>
                  <span class="markset-recent-folder">{folderOf(f.path)}</span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>
    </Show>
  );
}
