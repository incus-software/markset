// Markset: Properties panel section for a placed review stamp: which box is
// checked, the fill-in lines, and "Edit design" (opens the Stamp Builder on
// this stamp). Typing By / Date is part of the open-source app; filling them
// in automatically is not.
import { For, Show } from 'solid-js';
import { updateAnnotProp } from '../../js/solid/stores/propertiesStore.js';
import { openDialog } from '../../js/solid/stores/dialogStore.js';
import { actionList, defaultStampDesign, PLACEMENT_DEFAULTS } from './layout.js';

/** Today as MM/DD/YYYY. */
export function todayUs(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}`;
}

export default function StampProps(props) {
  const p = () => ({ ...defaultStampDesign(), ...PLACEMENT_DEFAULTS, ...props.params() });
  const set = (key, value) => props.setParam(key, value);
  const editDesign = () => {
    const current = JSON.parse(JSON.stringify(props.params()));
    openDialog('markset-stamp-builder', {
      design: current,
      applyLabel: 'Apply to stamp',
      onApply: (design) => updateAnnotProp('params', { ...current, ...design }),
    });
  };
  const field = (key, label, extra) => (
    <div class="property-group">
      <label>{label}</label>
      <div style="display:flex;gap:4px">
        <input type="text" style="flex:1;min-width:0" value={p()[key] || ''} onInput={(e) => set(key, e.target.value)} />
        {extra}
      </div>
    </div>
  );
  return (
    <>
      <div class="property-group">
        <label>Checked</label>
        <select value={String(p().checked)} onChange={(e) => set('checked', Number(e.target.value))}>
          <option value="-1">(none)</option>
          <For each={actionList(p())}>{(a, i) => <option value={String(i())}>{a}</option>}</For>
        </select>
      </div>
      <Show when={p().showProject}>{field('projectNo', 'Project no.')}</Show>
      <Show when={p().showSubmittal}>{field('submittalNo', 'Submittal no.')}</Show>
      <Show when={p().showBy}>{field('by', 'By')}</Show>
      <Show when={p().showDate}>
        {field('date', 'Date', <button type="button" class="prop-action-btn" title="Today's date" onClick={() => set('date', todayUs())}>Today</button>)}
      </Show>
      <div class="property-group">
        <button type="button" class="prop-action-btn" style="width:100%" onClick={editDesign}>Edit design...</button>
      </div>
    </>
  );
}
