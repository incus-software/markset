// Markset: "Place on Pages" dialog, opened from a markup's right-click menu.
import { createSignal, createMemo, Show } from 'solid-js';
import Dialog from '../../js/solid/components/Dialog.jsx';
import { closeDialog } from '../../js/solid/stores/dialogStore.js';
import { getActiveDocument } from '../../js/core/state.js';
import { annotationBounds } from '../../js/annotations/spatial-index.js';
import { parsePageList, unionBounds, nearestAnchor } from './placement.js';
import { previewPlacement, placeOnPages } from './place.js';
import './place-on-pages.css';

export const NAME = 'markset-place-on-pages';

const ANCHOR_LABELS = {
  'bottom-right': 'Bottom-right corner (title block)',
  'bottom-left': 'Bottom-left corner',
  'top-right': 'Top-right corner',
  'top-left': 'Top-left corner',
  same: 'Same position on every sheet',
};

export default function PlaceOnPagesDialog(props) {
  const doc = getActiveDocument();
  const ids = new Set(props.data?.annotationIds || []);
  const sources = (doc?.annotations || []).filter((a) => ids.has(a.id));
  const pageCount = doc?.pdfDoc?.numPages || Object.keys(doc?.pageDims || {}).length || 1;
  const sourcePage = sources[0]?.page || 1;
  const close = () => closeDialog(NAME);

  const [which, setWhich] = createSignal('all');
  const [list, setList] = createSignal('');
  const [anchor, setAnchor] = createSignal(
    nearestAnchor(unionBounds(sources.map((a) => annotationBounds(a))), doc?.pageDims?.[sourcePage]),
  );

  const pages = createMemo(() => {
    if (which() === 'all') return Array.from({ length: pageCount }, (_, i) => i + 1);
    return parsePageList(list(), pageCount);
  });
  const plan = createMemo(() => (pages() ? previewPlacement(sources, pages(), anchor()) : null));

  const summary = () => {
    const p = plan();
    if (!p) return 'Enter pages like 2-5, 8, 10- (10 to the end).';
    const n = p.place.length;
    let s = n ? `Places a copy on ${n} page${n === 1 ? '' : 's'}.` : 'No other pages selected.';
    if (p.skipped.length) s += ` Skips ${p.skipped.length} where it would fall off the sheet (${p.skipped.slice(0, 6).join(', ')}${p.skipped.length > 6 ? ', …' : ''}).`;
    return s;
  };

  const apply = () => {
    if (!plan()?.place.length) return;
    placeOnPages(sources, pages(), anchor());
    close();
  };

  const what = sources.length === 1 ? 'this markup' : `these ${sources.length} markups`;

  return (
    <Dialog
      title="Place on Pages"
      onClose={close}
      footer={
        <div class="mpp-footer">
          <button class="pref-btn pref-btn-secondary" onClick={close}>Cancel</button>
          <button class="pref-btn pref-btn-primary" disabled={!plan()?.place.length} onClick={apply}>Place</button>
        </div>
      }
    >
      <div class="mpp-body">
        <p class="mpp-intro">Copy {what} from page {sourcePage} to other pages, in the same spot on each sheet. Each copy can still be moved or deleted on its own; Undo removes them all.</p>

        <fieldset class="mpp-group">
          <legend>Pages</legend>
          <label class="mpp-choice">
            <input type="radio" name="mpp-which" checked={which() === 'all'} onChange={() => setWhich('all')} />
            All other pages ({Math.max(0, pageCount - 1)})
          </label>
          <label class="mpp-choice">
            <input type="radio" name="mpp-which" checked={which() === 'list'} onChange={() => setWhich('list')} />
            Pages:
            <input
              type="text"
              class="mpp-list"
              placeholder="2-5, 8, 10-"
              value={list()}
              aria-invalid={which() === 'list' && pages() === null ? 'true' : 'false'}
              onFocus={() => setWhich('list')}
              onInput={(e) => setList(e.currentTarget.value)}
            />
          </label>
        </fieldset>

        <label class="mpp-row">
          <span>Keep the same distance from</span>
          <select value={anchor()} onChange={(e) => setAnchor(e.currentTarget.value)}>
            {Object.entries(ANCHOR_LABELS).map(([value, label]) => <option value={value}>{label}</option>)}
          </select>
        </label>
        <p class="mpp-hint">Measuring from a corner keeps a title-block seal in the title block when sheets are different sizes.</p>

        <p class="mpp-summary" role="status" aria-live="polite">{summary()}</p>
        <Show when={sources.length === 0}>
          <p class="mpp-summary">Nothing selected to place.</p>
        </Show>
      </div>
    </Dialog>
  );
}
