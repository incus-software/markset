// Markset: editing and resizing plain text (the Text tool, markset/plain-text.js).
//
// Hooks in js/tools/text-editing.js and js/tools/tool-dispatcher.js:
// - Escape keeps what was typed: for a text box Escape throws the typing away,
//   but plain text has no border to show it is there, and people press Escape
//   to finish typing.
// - Plain text fits its text: after typing, and after the box is made wider or
//   narrower, the height follows the wrapped lines, so a line never hides
//   below the box and no empty space is left. Dragging only the top or bottom
//   handle may make it taller, never shorter than its text.
// - Plain text left empty is removed (one undo step brings it back), so no
//   invisible empty boxes stay on the sheet.
import { isPlainText, plainTextHeight } from './plain-text.js';
import { deleteAnnotationsWithUndo } from '../js/annotations/mutations.js';
import { computeTextboxContentHeight } from '../js/annotations/rendering/shapes.js';

/** Should cancelling the edit of `ann` keep the typed text instead? */
export function escapeKeepsText(ann) {
  return isPlainText(ann);
}

/** Fit plain text to its text. `handle` is the resize handle used, if any. */
export function fitPlainText(ann, handle = null) {
  if (!isPlainText(ann) || !String(ann.text || '').trim()) return false;
  const h = plainTextHeight(ann, computeTextboxContentHeight(ann), { keepTaller: handle === 't' || handle === 'b' });
  if (Math.abs(h - (ann.height || 0)) < 0.5) return false;
  ann.height = h;
  return true;
}

/**
 * After an edit: remove plain text that ended up empty, else fit it to its
 * text. True when it was removed.
 */
export function finishPlainTextEdit(doc, ann) {
  if (!doc || !isPlainText(ann)) return false;
  if (String(ann.text || '').trim()) { fitPlainText(ann); return false; }
  if (!doc.annotations.includes(ann)) return false;
  deleteAnnotationsWithUndo(doc, [ann]);
  if (doc.selectedAnnotation === ann) doc.selectedAnnotation = null;
  if (Array.isArray(doc.selectedAnnotations)) doc.selectedAnnotations = doc.selectedAnnotations.filter((a) => a !== ann);
  return true;
}
