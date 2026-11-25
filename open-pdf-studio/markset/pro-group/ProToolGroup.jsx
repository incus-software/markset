// Markset: "Markset Pro" group at the top of the Toolpalette (see pro-tools.js).
// The tools are listed under section headings (Review & Seal, Expert Witness...),
// each of which opens and closes. Until the user opens or closes one, only the
// section of the Pro tool used last is open (defaultClosedSections); after
// that, the user's choice is remembered.
import { For, Show, createSignal } from 'solid-js';
import { state } from '../../js/core/state.js';
import { proSections, defaultClosedSections } from './pro-tools.js';
import { clickProTool } from './pro-click.js';
import './pro-group.css';

const ARROW = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const CLOSED_KEY = 'markset.proGroup.closedSections';
const LAST_KEY = 'markset.proGroup.lastSection';

/** The sections the user closed, or null when they never opened or closed one. */
function loadClosed() {
  try {
    const raw = localStorage.getItem(CLOSED_KEY);
    if (raw == null) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : null;
  } catch { return null; }
}

function loadLast() {
  try { return localStorage.getItem(LAST_KEY) || ''; } catch { return ''; }
}

function saveLast(name) {
  try { localStorage.setItem(LAST_KEY, name); } catch { /* not kept */ }
}

function saveClosed(list) {
  try { localStorage.setItem(CLOSED_KEY, JSON.stringify(list)); } catch { /* not kept */ }
}

export default function ProToolGroup() {
  const [open, setOpen] = createSignal(true);
  const [chosen, setChosen] = createSignal(loadClosed()); // null: not chosen yet
  const [last, setLast] = createSignal(loadLast());
  const closed = () => chosen() ?? defaultClosedSections(proSections(), last());
  const isOpen = (name) => !closed().includes(name);
  const toggle = (name) => {
    const now = closed();
    const next = isOpen(name) ? [...now, name] : now.filter((s) => s !== name);
    setChosen(next);
    saveClosed(next);
  };
  const click = (t, section) => {
    if (!t.enabled) { clickProTool(t); return; }
    setLast(section);
    saveLast(section);
    clickProTool(t);
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
                        onClick={() => click(t, section.name)}
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
