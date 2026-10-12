// Markset: Stamp Builder. Makes a submittal / shop drawing review stamp:
// logo, firm, title, checkbox list, By / Date lines and the limitation text,
// at a true printed width. Saved stamps go to "My Stamps" in the symbol
// palette; "Edit design" on a placed stamp opens this dialog on that stamp.
import { createSignal, createMemo, For, Show } from 'solid-js';
import Dialog from '../../js/solid/components/Dialog.jsx';
import { closeDialog } from '../../js/solid/stores/dialogStore.js';
import { setTool } from '../../js/tools/manager.js';
import { setPendingSymbolWithParams } from '../../js/solid/stores/parametricSymbolStore.js';
import { isTauri, saveFileDialog, writeBinaryFile } from '../../js/core/platform.js';
import { PRESET_SCHEMES } from '../color-schemes.js';
import {
  STAMP_TEMPLATE_ID, REVIEW_TERMS, APPROVAL_TERMS, NOT_REQUIRED, DELEGATED, DEFAULT_DISCLAIMER,
  STAMP_WIDTHS, DISCLAIMER_SIZES, MIN_RECOMMENDED_PT, defaultStampDesign, stampSizeIn, stampWarnings,
  actionList,
} from './layout.js';
import { savedStamps, saveStamp, deleteStamp, cleanDesign, stampPreviewSvg } from './store.js';
import { withPngDpi } from './png.js';
import './stamp-builder.css';

const NAME = 'markset-stamp-builder';
const PNG_DPI = 300;
const LOGO_MAX_PX = 600;

/** Read an image file as a PNG/JPEG data URL no larger than LOGO_MAX_PX. */
function readLogo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Not an image Markset can read.'));
      img.onload = () => {
        const w = img.naturalWidth || 300, h = img.naturalHeight || 300;
        const k = Math.min(1, LOGO_MAX_PX / Math.max(w, h));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k));
        c.height = Math.max(1, Math.round(h * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        // JPEG keeps photos small; PNG keeps transparency and sharp edges.
        const jpeg = /jpe?g$/i.test(file.type);
        resolve({ src: c.toDataURL(jpeg ? 'image/jpeg' : 'image/png', 0.9), aspect: w / h });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** The stamp as a transparent PNG at `dpi`, true size. */
export async function stampPng(design, dpi) {
  const svg = stampPreviewSvg(design);
  const { width, height } = stampSizeIn(design);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('Could not draw the stamp.'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const c = document.createElement('canvas');
  c.width = Math.round(width * dpi);
  c.height = Math.round(height * dpi);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return withPngDpi(new Uint8Array(await blob.arrayBuffer()), dpi);
}

const slug = (s) => String(s || 'stamp').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stamp';

export default function StampBuilderDialog(props) {
  const data = props.data || {};
  const editingPlaced = typeof data.onApply === 'function';
  const start = () => {
    if (data.design) return { ...cleanDesign(data.design) };
    const s = data.stampId && savedStamps().find(x => x.id === data.stampId);
    return s ? { ...s } : { id: '', ...defaultStampDesign() };
  };
  const [d, setD] = createSignal(start());
  const [status, setStatus] = createSignal('');
  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }));
  const close = () => closeDialog(NAME);

  const size = createMemo(() => stampSizeIn(d()));
  const warnings = createMemo(() => stampWarnings(d()));
  // Preview with the first box checked, so the check mark shows.
  const preview = createMemo(() => stampPreviewSvg(d(), { checked: actionList(d()).length ? 0 : -1 }));

  const loadSaved = (id) => {
    if (!id) { setD({ id: '', ...defaultStampDesign() }); return; }
    const s = savedStamps().find(x => x.id === id);
    if (s) setD({ ...s });
    setStatus('');
  };
  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { src, aspect } = await readLogo(file);
      setD(prev => ({ ...prev, logo: src, logoAspect: aspect }));
    } catch (err) { setStatus(err.message || 'Could not read that image.'); }
  };
  const preset = (list) => set('actions', [...list, ...actionList(d()).filter(a => a === NOT_REQUIRED || a === DELEGATED)].join('\n'));
  const toggleLine = (lineText, on) => {
    const rest = actionList(d()).filter(a => a !== lineText);
    set('actions', (on ? [...rest, lineText] : rest).join('\n'));
  };

  const save = () => {
    const s = saveStamp(d());
    setD({ ...s });
    setStatus(`Saved "${s.name}" to My Stamps.`);
    return s;
  };
  const place = () => {
    const s = save();
    setPendingSymbolWithParams(STAMP_TEMPLATE_ID, cleanDesign(s));
    setTool('parametricSymbol');
    close();
  };
  const apply = () => { data.onApply(cleanDesign(d())); close(); };
  const remove = () => {
    if (!d().id) return;
    deleteStamp(d().id);
    setD({ id: '', ...defaultStampDesign() });
    setStatus('Stamp deleted.');
  };
  const exportPng = async () => {
    try {
      const bytes = await stampPng(d(), PNG_DPI);
      const name = `${slug(d().name)}.png`;
      const path = await saveFileDialog(name, [{ name: 'PNG image', extensions: ['png'] }]);
      if (!path) return;
      if (isTauri()) {
        try { await window.__TAURI__.core.invoke('allow_fs_scope', { path }); } catch { /* scope may already allow it */ }
      }
      await writeBinaryFile(path, bytes);
      setStatus(`Saved ${name} (${PNG_DPI} dpi, true size).`);
    } catch (err) { setStatus(`Could not save the PNG: ${err.message || err}`); }
  };

  const row = (label, input) => <label class="msb-row"><span>{label}</span>{input}</label>;
  const check = (label, key) => (
    <label class="msb-check"><input type="checkbox" checked={!!d()[key]} onChange={(e) => set(key, e.target.checked)} /> {label}</label>
  );

  return (
    <Dialog
      title={editingPlaced ? 'Edit Stamp' : 'Stamp Builder'}
      dialogClass="markset-stamp-builder"
      onClose={close}
      footer={
        <div class="msb-footer">
          <button class="pref-btn pref-btn-secondary" onClick={exportPng} title="Transparent PNG at 300 dpi for Bluebeam or Acrobat stamp libraries">Save PNG...</button>
          <span style="flex:1" />
          <Show when={editingPlaced} fallback={<>
            <button class="pref-btn pref-btn-secondary" onClick={save}>Save</button>
            <button class="pref-btn pref-btn-primary" onClick={place}>Save and place</button>
          </>}>
            <button class="pref-btn pref-btn-primary" onClick={apply}>{data.applyLabel || 'Apply'}</button>
          </Show>
          <button class="pref-btn pref-btn-secondary" onClick={close}>Cancel</button>
        </div>
      }
    >
      <div class="msb-body">
        <div class="msb-form">
          <Show when={!editingPlaced}>
            <div class="msb-row">
              <span>Stamp</span>
              <div class="msb-inline">
                <select value={d().id || ''} onChange={(e) => loadSaved(e.target.value)}>
                  <option value="">New stamp</option>
                  <For each={savedStamps()}>{(s) => <option value={s.id}>{s.name}</option>}</For>
                </select>
                <button type="button" class="pref-btn pref-btn-secondary" disabled={!d().id} onClick={remove}>Delete</button>
              </div>
            </div>
            {row('Name in palette', <input type="text" value={d().name} onInput={(e) => set('name', e.target.value)} />)}
          </Show>

          <div class="msb-row">
            <span>Logo</span>
            <div class="msb-inline">
              <label class="pref-btn pref-btn-secondary msb-file">
                {d().logo ? 'Replace logo...' : 'Choose logo...'}
                <input type="file" accept="image/png,image/jpeg" onChange={onLogo} />
              </label>
              <Show when={d().logo}>
                <button type="button" class="pref-btn pref-btn-secondary" onClick={() => set('logo', '')}>Remove</button>
              </Show>
            </div>
          </div>
          {row('Firm name', <input type="text" value={d().firm} onInput={(e) => set('firm', e.target.value)} />)}
          {row('Stamp title', <input type="text" value={d().title} onInput={(e) => set('title', e.target.value)} />)}

          <div class="msb-row">
            <span>Checkboxes</span>
            <div>
              <div class="msb-inline">
                <button type="button" class="pref-btn pref-btn-secondary" onClick={() => preset(REVIEW_TERMS)} title="Insurer-preferred; avoids &quot;Approved&quot;">Review terms</button>
                <button type="button" class="pref-btn pref-btn-secondary" onClick={() => preset(APPROVAL_TERMS)} title="Matches AIA A201 / EJCDC wording">Approval terms</button>
              </div>
              <textarea rows="5" value={d().actions} onInput={(e) => set('actions', e.target.value)} placeholder="One checkbox per line" />
              <label class="msb-check"><input type="checkbox" checked={actionList(d()).includes(NOT_REQUIRED)} onChange={(e) => toggleLine(NOT_REQUIRED, e.target.checked)} /> Not required, returned without action</label>
              <label class="msb-check"><input type="checkbox" checked={actionList(d()).includes(DELEGATED)} onChange={(e) => toggleLine(DELEGATED, e.target.checked)} /> Delegated design line (A201 §3.12.10)</label>
            </div>
          </div>

          <div class="msb-row">
            <span>Lines</span>
            <div class="msb-checks">
              {check('Project no.', 'showProject')}
              {check('Submittal no.', 'showSubmittal')}
              {check('By', 'showBy')}
              {check('Date', 'showDate')}
            </div>
          </div>

          {row('Stamp width', (
            <select value={String(d().widthIn)} onChange={(e) => set('widthIn', Number(e.target.value))}>
              <For each={STAMP_WIDTHS}>{(w) => <option value={String(w.value)}>{w.label}</option>}</For>
            </select>
          ))}
          {row('Ink color', (
            <div class="msb-inline">
              <For each={PRESET_SCHEMES}>{(s) => (
                <button type="button" class={`msb-swatch${d().ink.toLowerCase() === s.color ? ' active' : ''}`}
                  title={s.name} style={{ background: s.color }} onClick={() => set('ink', s.color)} />
              )}</For>
              <input type="color" value={d().ink} onInput={(e) => set('ink', e.target.value)} title="Other color" />
            </div>
          ))}

          <div class="msb-row">
            <span>Stamp language</span>
            <div>
              <textarea rows="7" value={d().disclaimer} onInput={(e) => set('disclaimer', e.target.value)} />
              <div class="msb-inline">
                <select value={String(d().discPt)} onChange={(e) => set('discPt', Number(e.target.value))}>
                  <For each={DISCLAIMER_SIZES}>{(pt) => (
                    <option value={String(pt)}>{pt} pt{pt === 8 ? ' (recommended)' : pt < MIN_RECOMMENDED_PT ? ' (not recommended)' : ''}</option>
                  )}</For>
                </select>
                <button type="button" class="pref-btn pref-btn-secondary" disabled={d().disclaimer === DEFAULT_DISCLAIMER}
                  onClick={() => set('disclaimer', DEFAULT_DISCLAIMER)}>Reset to default</button>
              </div>
              <p class="msb-note">
                The default text is generic language based on AIA A201-2017 §3.12 and §4.2.7. It is not legal advice:
                match it to your owner-architect agreement and Section 01 33 00. Do not use your professional seal on a review stamp.
              </p>
            </div>
          </div>
        </div>

        <div class="msb-preview">
          <div class="msb-paper" innerHTML={preview()} />
          <div class="msb-size">Print size {size().width.toFixed(1)} x {size().height.toFixed(2)} in · stamp language {d().discPt} pt</div>
          <For each={warnings()}>{(w) => <div class="msb-warn">{w}</div>}</For>
          <Show when={status()}><div class="msb-status" role="status">{status()}</div></Show>
          <p class="msb-note">After placing, double-click a checkbox on the stamp to check it, or a line (By, Date, Project no.) to type on it; the Properties panel has the same fields. Right-click a stamp in My Stamps to edit its design.</p>
        </div>
      </div>
    </Dialog>
  );
}
