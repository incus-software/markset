// Markset: markup color scheme rows for Preferences → Annotations → General.
// Picking a scheme sets every scheme key in the dialog (saved with the rest
// of the preferences on Save); users can save their own named schemes.
import { createSignal, Show } from 'solid-js';
import PrefSelect from '../js/solid/components/preferences/PrefSelect.jsx';
import PrefColorPicker from '../js/solid/components/preferences/PrefColorPicker.jsx';
import {
  SCHEME_KEYS, allSchemes, schemeValues, matchingScheme, saveCustomScheme, removeCustomScheme,
} from './color-schemes.js';

/** props.p: the Preferences dialog's [get, set] signals; props.t: preferences i18n. */
export default function ColorSchemePrefs(props) {
  const p = props.p;
  const t = (key, fallback) => props.t(key) || fallback;
  const custom = () => p.customColorSchemes[0]() || [];
  const currentId = () => {
    const prefs = Object.fromEntries(SCHEME_KEYS.map(k => [k, p[k][0]()]));
    return matchingScheme(prefs, custom())?.id || 'mixed';
  };
  const options = () => [
    ...allSchemes(custom()).map(s => ({ value: s.id, label: s.custom ? `${s.name} (${t('annotations.colorSchemeYours', 'yours')})` : s.name })),
    ...(currentId() === 'mixed' ? [{ value: 'mixed', label: t('annotations.colorSchemeMixed', 'Mixed colors') }] : []),
  ];
  function apply(id) {
    const s = allSchemes(custom()).find(x => x.id === id);
    if (!s) return;
    for (const [key, color] of Object.entries(schemeValues(s.color))) p[key][1](color);
    p.markupColorScheme[1](id);
  }
  const [name, setName] = createSignal('');
  const [color, setColor] = createSignal(p.defaultAnnotationColor[0]() || '#0000ff');
  function save() {
    const r = saveCustomScheme(custom(), name(), color());
    if (!r) return;
    p.customColorSchemes[1](r.list);
    apply(r.scheme.id);
    setName('');
  }
  const isCustom = () => custom().some(s => s.id === currentId());

  return (
    <>
      <div class="pref-row">
        <label>{t('annotations.colorScheme', 'Markup color scheme')}</label>
        <PrefSelect value={currentId} setValue={apply} options={options()} />
      </div>
      <div class="pref-row">
        <label>{t('annotations.colorSchemeNew', 'New scheme')}</label>
        <div style="display:flex;gap:6px;align-items:center;flex:1">
          <input type="text" value={name()} onInput={e => setName(e.target.value)}
            placeholder={t('annotations.colorSchemeName', 'Name')} style="flex:1;min-width:0" />
          <PrefColorPicker value={color} setValue={setColor} />
          <button type="button" class="pref-btn pref-btn-secondary" disabled={!name().trim()} onClick={save}>
            {t('annotations.colorSchemeSave', 'Save')}
          </button>
        </div>
      </div>
      <Show when={isCustom()}>
        <div class="pref-row">
          <label />
          <button type="button" class="pref-btn pref-btn-secondary"
            onClick={() => { p.customColorSchemes[1](removeCustomScheme(custom(), currentId())); }}>
            {t('annotations.colorSchemeDelete', 'Delete this scheme')}
          </button>
        </div>
      </Show>
    </>
  );
}
