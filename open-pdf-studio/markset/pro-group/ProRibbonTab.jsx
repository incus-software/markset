// Markset: the "Markset Pro" ribbon tab. The same Pro tools as the
// Toolpalette's "Markset Pro" group (pro-tools.js), one ribbon group per
// section, so Pro is easy to find even with the Toolpalette closed. Without
// the Pro plugin the tools show greyed out; clicking one explains Markset Pro.
import { For, Show } from 'solid-js';
import RibbonGroup from '../../js/solid/components/ribbon/RibbonGroup.jsx';
import RibbonButton from '../../js/solid/components/ribbon/RibbonButton.jsx';
import RibbonButtonStack from '../../js/solid/components/ribbon/RibbonButtonStack.jsx';
import { proSections, ribbonColumns, RIBBON_LARGE_MAX } from './pro-tools.js';
import { clickProTool } from './pro-click.js';
import './pro-group.css';

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

export default function ProRibbonTab() {
  return (
    <div class="ribbon-content active" id="tab-pro" role="tabpanel">
      <For each={proSections()}>
        {(section) => (
          <RibbonGroup label={section.name}>
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
    </div>
  );
}
