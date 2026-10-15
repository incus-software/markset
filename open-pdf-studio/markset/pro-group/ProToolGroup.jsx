// Markset: "Markset Pro" group at the top of the Toolpalette (see pro-tools.js).
import { For, createSignal } from 'solid-js';
import { state } from '../../js/core/state.js';
import { setTool } from '../../js/tools/manager.js';
import { showMessage } from '../../js/solid/stores/dialogStore.js';
import { proTools, proUpsellMessage } from './pro-tools.js';
import './pro-group.css';

const ARROW = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

export default function ProToolGroup() {
  const [open, setOpen] = createSignal(true);
  const click = (t) => {
    if (!t.enabled) { showMessage(proUpsellMessage(t), 'Markset Pro'); return; }
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
      {open() && (
        <div class="sp-grid mpg-grid">
          <For each={proTools()}>
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
      )}
    </div>
  );
}
