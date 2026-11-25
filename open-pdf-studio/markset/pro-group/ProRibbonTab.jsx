// Markset: the "Markset Pro" ribbon tab. The same Pro tools as the
// Toolpalette's "Markset Pro" group (pro-tools.js), one ribbon group per
// section, so Pro is easy to find even with the Toolpalette closed. Without
// the Pro plugin the tools show greyed out; clicking one explains Markset Pro.
// Plugin symbol groups that name a Pro section (proSection) show in that
// section as a gallery button: a click opens their symbols, as in the palette.
// Like the built-in tabs, the groups sit in AdaptiveGroups: in a window too
// narrow for all of them (1280 px with the trade library), the rightmost
// groups fold into a "More" button instead of overlapping their neighbours.
import { For, Show, createSignal, onMount, onCleanup } from 'solid-js';
import RibbonGroup from '../../js/solid/components/ribbon/RibbonGroup.jsx';
import AdaptiveGroups from '../../js/solid/components/ribbon/AdaptiveGroups.jsx';
import RibbonButton from '../../js/solid/components/ribbon/RibbonButton.jsx';
import RibbonButtonStack from '../../js/solid/components/ribbon/RibbonButtonStack.jsx';
import { autoShrinkLabel } from '../../js/solid/components/ribbon/autoShrinkLabel.js';
import { volgPopup } from '../../js/solid/components/ribbon/ribbon-popup.js';
import { selectSymbol } from '../../js/solid/components/SymbolPalette.jsx';
import { pluginCategories } from '../smart/plugin-categories.js';
import { proSections, ribbonSections, ribbonColumns, RIBBON_LARGE_MAX } from './pro-tools.js';
import { clickProTool } from './pro-click.js';
import './pro-group.css';

const ARROW = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="8" height="8"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 9l6 6 6-6"/></svg>';

function ProButton(props) {
  const t = () => props.tool;
  return (
    <RibbonButton
      id={`ribbon-pro-${t().id}`}
      size={props.small ? 'small' : undefined}
      label={t().label}
      icon={t().icon || ''}
      title={t().enabled ? `${t().label}: ${t().description || ''}` : `${t().label} (Markset Pro)`}
      extraClass={`mpr-tool${t().enabled ? '' : ' mpr-locked'}`}
      onClick={() => clickProTool(t())}
    />
  );
}

/** A plugin symbol group as a ribbon button that opens a grid of its symbols. */
function Gallery(props) {
  const [open, setOpen] = createSignal(false);
  let wrap;
  let popup;
  volgPopup(() => popup, () => wrap, open);
  onMount(() => {
    const close = (e) => { if (wrap && !wrap.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', esc);
    onCleanup(() => { document.removeEventListener('click', close); document.removeEventListener('keydown', esc); });
  });
  const cat = () => props.category;
  return (
    <div class="mpr-gallery" ref={wrap}>
      <button
        type="button"
        class={`ribbon-btn mpr-gallery-btn${open() ? ' active' : ''}`}
        id={`ribbon-pro-gallery-${cat().id}`}
        title={`${cat().name}: ${cat().symbols.length} symbols`}
        aria-haspopup="true"
        aria-expanded={open() ? 'true' : 'false'}
        onClick={() => setOpen(!open())}
      >
        <div class="ribbon-btn-icon" innerHTML={cat().icon} />
        <span class="ribbon-btn-label" ref={(el) => autoShrinkLabel(el)}>{cat().name}</span>
        <span class="mpr-gallery-arrow" innerHTML={ARROW} />
      </button>
      <div class={`mpr-gallery-popup${open() ? ' show' : ''}`} ref={popup} role="menu">
        <div class="mpr-gallery-title">{cat().name}</div>
        <div class="mpr-gallery-grid">
          <For each={cat().symbols}>
            {(sym) => (
              <button
                type="button"
                class="mpr-gallery-item"
                role="menuitem"
                title={sym.name}
                onClick={() => { setOpen(false); selectSymbol(sym); }}
              >
                <span class="mpr-gallery-icon" innerHTML={sym.svg} />
                <span class="mpr-gallery-name">{sym.name}</span>
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

export default function ProRibbonTab() {
  const sections = () => ribbonSections(proSections(), pluginCategories());
  return (
    <div class="ribbon-content active" id="tab-pro" role="tabpanel">
      <AdaptiveGroups>
      <For each={sections()}>
        {(section) => (
          <RibbonGroup label={section.name}>
            <For each={section.galleries}>{(cat) => <Gallery category={cat} />}</For>
            <For each={ribbonColumns(section.tools)}>
              {(column) => (
                <Show when={section.tools.length > RIBBON_LARGE_MAX} fallback={<ProButton tool={column[0]} />}>
                  <RibbonButtonStack>
                    <For each={column}>{(tool) => <ProButton tool={tool} small />}</For>
                  </RibbonButtonStack>
                </Show>
              )}
            </For>
          </RibbonGroup>
        )}
      </For>
      </AdaptiveGroups>
    </div>
  );
}
