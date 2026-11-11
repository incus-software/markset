// Markset: the Text Highlighter (Highlight Text on the Annotation tab).
//
// Upstream can highlight text only from the right-click menu of a text
// selection, and the highlight keeps neither the words it covers nor a note.
// For reviewing a letter or a report this tool:
//  - drags across text (or double-clicks a word) and highlights it at once,
//    staying active for the next passage;
//  - keeps the highlighted words in `markedText` (saved as /OPS_MarkedText,
//    see saver/text-markup-dict.js; the loader already reads it back);
//  - opens a small note box under the highlight. Enter keeps the note as the
//    highlight's comment (/Contents, the `subject` field), Shift+Enter starts
//    a new line, Esc or an empty box skips it. The note is part of the same
//    undo step as the highlight.
// Text is found with the proofreading text model (pdf.js text content), so a
// scanned page has nothing to highlight until it has been through OCR.
//
// Color and opacity follow the Highlight defaults in Preferences.

import { buildTextModel, hitTest, moveCursor, charAt, totalLength } from '../js/annotations/corrections/text-model.js';
import { strikeProps, normalizeRange } from '../js/annotations/corrections/proofreading.js';
import { registerTool } from '../js/tools/tool-registry.js';

export const TEXT_HIGHLIGHTER_TOOL = 'marksetTextHighlighter';
export const DEFAULT_HIGHLIGHT_COLOR = '#FFFF00';
export const DEFAULT_HIGHLIGHT_OPACITY = 0.4;

/** Highlight color and opacity (0..1) from the preferences. */
export function highlightStyle(prefs = {}) {
  const color = typeof prefs.highlightColor === 'string' && /^#[0-9a-f]{6}$/i.test(prefs.highlightColor)
    ? prefs.highlightColor : DEFAULT_HIGHLIGHT_COLOR;
  const pct = Number(prefs.highlightOpacity);
  const opacity = Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct / 100 : DEFAULT_HIGHLIGHT_OPACITY;
  return { color, opacity };
}

/**
 * Properties of a text highlight over positions a..b of the text model (in
 * either order): one rectangle per line, reading direction and the words.
 * null when the range holds no characters or only spaces.
 */
export function highlightProps(model, a, b, { page, color, opacity, snapWords = false } = {}) {
  if (!model || a == null || b == null || a === b) return null;
  const range = snapWords ? snapToWords(model, a, b) : normalizeRange(model, a, b);
  const geo = range ? strikeProps(model, range) : null;
  if (!geo) return null;
  const markedText = cleanText(geo.markedText);
  if (!markedText) return null;
  return {
    type: 'textHighlight',
    page,
    ...geo,
    markedText,
    color: color || DEFAULT_HIGHLIGHT_COLOR,
    opacity: opacity ?? DEFAULT_HIGHLIGHT_OPACITY,
  };
}

/** The word around position g, without trailing spaces. */
export function wordAt(model, g) {
  const start = moveCursor(model, Math.min(totalLength(model), g + 1), 'wordLeft').pos;
  let end = moveCursor(model, start, 'wordRight').pos;
  while (end > start && /\s/u.test(charAt(model, end - 1))) end--;
  return { start, end };
}

const isBlank = (ch) => !ch || /\s/u.test(ch);

/**
 * The range a..b (either order) widened to whole words: an end that falls
 * inside a word moves to that word's edge, and spaces at either end are
 * dropped. null when nothing but spaces is left.
 */
export function snapToWords(model, a, b) {
  const r = normalizeRange(model, a, b);
  if (!r) return null;
  let { start, end } = r;
  if (!isBlank(charAt(model, start)) && !isBlank(charAt(model, start - 1))) start = wordAt(model, start).start;
  if (!isBlank(charAt(model, end - 1)) && !isBlank(charAt(model, end))) end = wordAt(model, end - 1).end;
  while (start < end && isBlank(charAt(model, start))) start++;
  while (end > start && isBlank(charAt(model, end - 1))) end--;
  return end > start ? { start, end } : null;
}

/** Collapses runs of white space (line breaks, hyphenation gaps) to one space. */
export function cleanText(s) {
  return typeof s === 'string' ? s.replace(/\s+/gu, ' ').trim() : '';
}

/** True when the page model has any text to highlight. */
export function hasText(model) {
  return !!model && totalLength(model) > 0;
}

/**
 * The note text to keep: trimmed, with Windows line ends made plain. Empty
 * means no note.
 */
export function noteText(s) {
  return typeof s === 'string' ? s.replace(/\r\n?/g, '\n').trim() : '';
}

// ── The tool (browser only) ────────────────────────────────────────────────

const S = { page: null, model: null, anchor: null, focus: null, dragging: false, note: null };
const models = new Map(); // key -> promise of the page's text model
const ready = new Map();  // key -> the model, once loaded
let A = null;             // the app modules, once loaded

function modelKey(doc, page, rotation) { return `${doc.id}|${page}|${rotation}`; }

let measureCtx = null;
function measurer(styles) {
  if (typeof document === 'undefined') return undefined;
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return undefined;
  return (str, item) => {
    measureCtx.font = `100px ${styles?.[item?.fontName]?.fontFamily || 'sans-serif'}`;
    return measureCtx.measureText(str).width;
  };
}

async function app() {
  if (A) return A;
  const [stateMod, rendering, overlay, undo, status, factory] = await Promise.all([
    import('../js/core/state.js'),
    import('../js/annotations/rendering.js'),
    import('../js/annotations/corrections/proofreading-overlay.js'),
    import('../js/core/undo-manager.js'),
    import('../js/ui/chrome/status-bar.js'),
    import('../js/annotations/factory.js'),
  ]);
  A = { ...stateMod, ...rendering, ...overlay, ...undo, ...status, ...factory };
  return A;
}

function keyFor(a, doc, page) { return modelKey(doc, page, a.getPageRotation?.(page) || 0); }

function loadModel(a, doc, page) {
  const k = keyFor(a, doc, page);
  if (!models.has(k)) {
    const p = (async () => {
      const pg = await doc.pdfDoc.getPage(page);
      const rot = (((pg.rotate || 0) + (a.getPageRotation?.(page) || 0)) % 360 + 360) % 360;
      const transform = pg.getViewport({ scale: 1, rotation: rot }).transform;
      const content = await pg.getTextContent();
      const model = buildTextModel(content.items, { transform, measure: measurer(content.styles) });
      ready.set(k, model);
      return model;
    })();
    p.catch(() => models.delete(k));
    models.set(k, p);
  }
  return models.get(k);
}

function redraw(a) {
  if (a.getActiveDocument()?.viewMode === 'continuous') a.redrawContinuous(true);
  else a.redrawAnnotations(true);
}

function showDrag(a) {
  const doc = a.getActiveDocument();
  const geo = doc && S.model && S.anchor != null && S.anchor !== S.focus
    ? highlightProps(S.model, S.anchor, S.focus, { page: S.page, snapWords: true }) : null;
  if (geo) a.setProofreadingOverlay({ docId: doc.id, page: S.page, caret: null, rects: geo.rects });
  else a.clearProofreadingOverlay();
  redraw(a);
}

function resetDrag(a) {
  S.anchor = null; S.focus = null; S.dragging = false;
  a?.clearProofreadingOverlay();
}

/** Adds the highlight over S.anchor..S.focus and opens its note box. */
function commit(a) {
  const doc = a.getActiveDocument();
  const props = doc ? highlightProps(S.model, S.anchor, S.focus, {
    page: S.page, snapWords: true, ...highlightStyle(a.state.preferences),
  }) : null;
  resetDrag(a);
  if (!props) { redraw(a); return; }
  const ann = a.createAnnotation(props);
  doc.annotations.push(ann);
  a.recordAdd(ann);
  const stored = doc.annotations.find((x) => x.id === ann.id) || ann;
  doc.selectedAnnotations = [stored];
  doc.selectedAnnotation = stored;
  redraw(a);
  import('../js/ui/panels/annotations-list.js').then((m) => m.updateAnnotationsList()).catch(() => {});
  openNote(a, doc, stored);
}

// The note box: a small text area under the last line of the highlight.
function openNote(a, doc, ann) {
  closeNote(true);
  const box = document.createElement('textarea');
  box.className = 'markset-highlight-note';
  box.placeholder = 'Add a note (Enter to keep, Esc to skip)';
  box.setAttribute('aria-label', 'Note for this highlight');
  box.spellcheck = true;
  box.rows = 2;
  Object.assign(box.style, {
    position: 'fixed', left: '-1000px', top: '-1000px', width: '280px', zIndex: '10000',
    font: '13px "Segoe UI", sans-serif', padding: '4px 6px', resize: 'none',
    background: '#fffde7', color: '#1a1a1a', border: '1px solid #c8b400', borderRadius: '0',
    boxShadow: '0 2px 6px rgba(0,0,0,.18)', outline: 'none',
  });
  box.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); closeNote(true); }
    else if (e.key === 'Escape') { e.preventDefault(); closeNote(false); }
  });
  box.addEventListener('blur', () => { if (S.note?.box === box) closeNote(true); });
  const container = document.getElementById('pdf-container');
  const onScroll = () => closeNote(true);
  container?.addEventListener('scroll', onScroll, { passive: true });
  S.note = { box, ann, a, container, onScroll };
  document.body.appendChild(box);

  const last = ann.rects?.[ann.rects.length - 1] || ann;
  import('../js/pdf/weergave-ruimte.js').then(({ paginaNaarClient }) => {
    if (S.note?.box !== box) return;
    const p = paginaNaarClient(ann.page, last.x, last.y + last.height, doc);
    box.style.left = `${Math.max(4, Math.min(p?.x ?? 100, window.innerWidth - 300))}px`;
    box.style.top = `${Math.max(4, Math.min((p?.y ?? 100) + 4, window.innerHeight - 90))}px`;
    box.focus();
  }).catch(() => { box.style.left = '100px'; box.style.top = '100px'; box.focus(); });
}

/** Closes the note box; with `keep` a typed note becomes the comment. */
export function closeNote(keep) {
  const n = S.note;
  if (!n) return;
  S.note = null;
  n.container?.removeEventListener('scroll', n.onScroll);
  const text = noteText(n.box.value);
  n.box.remove();
  if (!keep || !text) return;
  const { a, ann } = n;
  const old = a.cloneAnnotation(ann);
  ann.subject = text;
  ann.modifiedAt = new Date().toISOString();
  if (!a.amendLastAdd(ann)) a.recordModify(ann.id, old, ann);
  import('../js/ui/panels/annotations-list.js').then((m) => m.updateAnnotationsList()).catch(() => {});
  import('../js/ui/panels/properties-panel.js').then((m) => m.showProperties?.(ann)).catch(() => {});
}

function makeTool() {
  return {
    name: TEXT_HIGHLIGHTER_TOOL,
    cursor: 'text',

    onActivate() {
      clearTextHighlighterCache(); // pages may have moved since last time
      app().then((a) => {
        const doc = a.getActiveDocument();
        if (doc?.pdfDoc) loadModel(a, doc, doc.currentPage || 1).catch(() => {});
        a.updateStatusMessage('Highlight Text: drag across text or double-click a word, then type a note or press Esc.', 7000);
      }).catch(() => {});
    },

    onDeactivate() {
      closeNote(true);
      if (A) { resetDrag(A); redraw(A); }
    },

    onPointerDown(ctx, e) {
      if (e.button !== 0) return;
      if (S.note) closeNote(true);
      const start = (a, doc, model) => {
        if (!hasText(model)) {
          a.updateStatusMessage('No text on this page to highlight. For a scan, run Recognize Text (OCR) first.', 7000);
          return;
        }
        const g = hitTest(model, ctx.x, ctx.y);
        S.page = ctx.pageNum; S.model = model;
        if (e.detail === 2) {
          const w = wordAt(model, g);
          S.anchor = w.start; S.focus = w.end; S.dragging = false;
          commit(a);
          return;
        }
        S.anchor = g; S.focus = g; S.dragging = true;
        showDrag(a);
      };
      const go = (a) => {
        const doc = a.getActiveDocument();
        if (!doc?.pdfDoc || !(ctx.pageNum >= 1)) return;
        const k = keyFor(a, doc, ctx.pageNum);
        if (ready.has(k)) start(a, doc, ready.get(k));
        else loadModel(a, doc, ctx.pageNum).then((m) => start(a, doc, m)).catch(() => {});
      };
      if (A) go(A); else app().then(go).catch(() => {});
    },

    onPointerMove(ctx, e) {
      if (!A || !S.dragging || !S.model || ctx.pageNum !== S.page || !(e.buttons & 1)) return;
      const g = hitTest(S.model, ctx.x, ctx.y);
      if (g === S.focus) return;
      S.focus = g;
      showDrag(A);
    },

    onPointerUp() {
      if (!S.dragging || !A) return true;
      S.dragging = false;
      if (S.anchor == null || S.anchor === S.focus) { resetDrag(A); redraw(A); return true; }
      commit(A);
      return true;
    },

    onEscape() {
      if (S.dragging && A) { resetDrag(A); redraw(A); return true; }
      return false;
    },
  };
}

let registered = false;
/** Register the Text Highlighter once (the Annotation tab imports this module). */
export function registerTextHighlighter() {
  if (registered) return;
  registered = true;
  registerTool(TEXT_HIGHLIGHTER_TOOL, makeTool());
}

/** Clears cached page text (a document closed or its pages changed). */
export function clearTextHighlighterCache() { models.clear(); ready.clear(); }
