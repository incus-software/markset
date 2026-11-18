// Markset: "Markset Pro" group at the top of the Toolpalette (see pro-tools.js).
// The tools are listed under section headings (Review & Seal, Expert Witness...),
// each of which opens and closes; which ones are closed is remembered.
import { For, Show, createSignal } from 'solid-js';
import { state } from '../../js/core/state.js';
import { setTool } from '../../js/tools/manager.js';
import { showMessage } from '../../js/solid/stores/dialogStore.js';
import { proSections, proUpsellMessage, PRO_URL } from './pro-tools.js';
import { openExtern } from '../../js/core/extern-openen.js';
import './pro-group.css';

const ARROW = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const CLOSED_KEY = 'markset.proGroup.closedSections';

function loadClosed() {
  try {
    const v = JSON.parse(localStorage.getItem(CLOSED_KEY) || '[]');
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : [];
  } catch { return []; }
}

function saveClosed(list) {
  try { localStorage.setItem(CLOSED_KEY, JSON.stringify(list)); } catch { /* not kept */ }
}

export default function ProToolGroup() {
  const [open, setOpen] = createSignal(true);
  const [closed, setClosed] = createSignal(loadClosed());
  const isOpen = (name) => !closed().includes(name);
  const toggle = (name) => {
    const next = isOpen(name) ? [...closed(), name] : closed().filter((s) => s !== name);
    setClosed(next);
    saveClosed(next);
  };
  const click = (t) => {
    if (!t.enabled) {
      showMessage(proUpsellMessage(t), 'Markset Pro', { action: { label: 'Visit usemarkset.com', onClick: () => openExtern(PRO_URL) } });
      return;
    }
    if (t.tool) setTool(t.tool);
    else t.onClick?.();
  };
  return (
    <div class="mpg">
      <div class="sp-cat-header mpg-header" onClick={() => setOpen(!open())}>
        <div class={`sp-cat-arrow${open() ? ' expanded' : ''}`} innerHTML={ARROW} />
        <span class="sp-cat-name">Markset Pro</span>
        <span class="mpg-badge">PRO</span>
      </div>
      <Show when={open()}>
        <For each={proSections()}>
          {(section) => (
            <div class="mpg-section">
              <button
                type="button"
                class="mpg-section-header"
                aria-expanded={isOpen(section.name) ? 'true' : 'false'}
                onClick={() => toggle(section.name)}
              >
                <span class={`sp-cat-arrow${isOpen(section.name) ? ' expanded' : ''}`} innerHTML={ARROW} />
                <span class="mpg-section-name">{section.name}</span>
                <span class="mpg-section-count">{section.tools.length}</span>
              </button>
              <Show when={isOpen(section.name)}>
                <div class="sp-grid mpg-grid">
                  <For each={section.tools}>
                    {(t) => (
                      <button
                        type="button"
                        class={`sp-symbol-btn sp-symbol-named mpg-tool${t.enabled ? '' : ' mpg-locked'}${t.enabled && t.tool && state.currentTool === t.tool ? ' active' : ''}`}
                        title={t.enabled ? `${t.label}: ${t.description || ''}` : `${t.label} (Markset Pro)`}
                        aria-disabled={t.enabled ? 'false' : 'true'}
                        onClick={() => click(t)}
                      >
                        <span class="sp-symbol-icon" innerHTML={t.icon || ''} />
                        <span class="sp-symbol-name">{t.label}</span>
                        {!t.enabled && <span class="mpg-lock" aria-hidden="true">PRO</span>}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
