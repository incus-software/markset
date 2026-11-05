// Markset: plain text, the Text button on the Annotation tab.
//
// Upstream's Text tool ("Add Text") writes the text into the page content when
// the PDF is saved: it is not a markup, so it cannot be selected, moved,
// resized or edited again, and Enter does not start a new line. Markset's Text
// tool places a text box without a border or fill instead: click and type, or
// drag to set the width; the text wraps inside the box, Enter starts a new
// line, and the box can be moved, resized and edited later like any markup.
// Other PDF apps show it as a text box (FreeText) without a border.
//
// Plain text keeps its own default style (font, size, color), separate from
// text boxes: "Set as Default Style" on plain text and the tool defaults for
// the Text tool change only plain text.
//
// Pure: no app imports, so the rules can be unit tested.

export const PLAIN_TEXT_TOOL = 'plainText';

/** Default font size of new plain text, in points. */
export const PLAIN_TEXT_FONT_SIZE = 10;

/** Width of a box placed with a click (no drag), in page points (2.5"). */
export const PLAIN_TEXT_CLICK_WIDTH = 180;

const hasColor = (c) => !!c && c !== 'none' && c !== 'transparent';
const isOff = (c) => c === 'none' || c === 'transparent';

/**
 * Plain text: a text box made with the Text tool (flag `plainText`, kept while
 * the file is open) or any text box whose border is turned off and that has
 * no fill. A text box with no border color set at all is a normal text box.
 */
export function isPlainText(ann) {
  if (!ann || ann.type !== 'textbox') return false;
  return ann.plainText === true || (isOff(ann.strokeColor) && !hasColor(ann.fillColor));
}

/**
 * The type whose default style applies to `ann`: plain text has its own
 * ('plainText'); everything else uses its own type.
 */
export function styleTypeOf(ann) {
  return isPlainText(ann) ? PLAIN_TEXT_TOOL : ann?.type;
}

/**
 * Height of a one-line box for `fontSize`: the line plus the text inset above
 * and below (the border width, 1 pt, as the text box layout uses).
 */
export function plainTextLineHeight(fontSize = PLAIN_TEXT_FONT_SIZE, lineSpacing = 1.2, inset = 1) {
  return Math.ceil(fontSize * lineSpacing + 2 * inset);
}

/**
 * The height plain text needs: its wrapped lines (`contentHeight`), at least
 * one line, and with `keepTaller` the current height when that is larger.
 */
export function plainTextHeight(ann, contentHeight, { keepTaller = false } = {}) {
  const oneLine = plainTextLineHeight(ann.fontSize || PLAIN_TEXT_FONT_SIZE, ann.lineSpacing || 1.2, ann.lineWidth ?? 1);
  const fit = Math.max(oneLine, Math.ceil(Number(contentHeight) || 0));
  return keepTaller ? Math.max(fit, ann.height || 0) : fit;
}

/** The style mapping of plain text in the preferences (core/stijl-mapping.js). */
export const PLAIN_TEXT_STYLE_MAPPING = Object.freeze({
  prefix: PLAIN_TEXT_TOOL, opacity: 'Opacity', fontSize: 'FontSize', fontFamily: 'FontFamily',
});

/**
 * A new plain text annotation in box `b` ({ x, y, width, height }).
 * `textStyle` is the saved text style (markset/text-defaults.js);
 * `inkColor` is the markup color of the current color scheme, used for the
 * text when no text color was saved.
 */
export function plainTextAnnotation(prefs, b, { page = 1, textStyle = {}, inkColor = '#000000' } = {}) {
  const p = prefs || {};
  const fontSize = Number(p.plainTextFontSize) > 0 ? Number(p.plainTextFontSize) : PLAIN_TEXT_FONT_SIZE;
  return {
    type: 'textbox',
    plainText: true,
    page,
    x: b.x, y: b.y,
    width: b.width,
    height: Math.max(b.height, plainTextLineHeight(fontSize)),
    text: '',
    strokeColor: 'none',
    color: inkColor,
    fillColor: 'none',
    textColor: inkColor,
    fontSize,
    fontFamily: p.plainTextFontFamily || 'Arial',
    lineWidth: 1,
    borderStyle: 'solid',
    opacity: (Number(p.plainTextOpacity) || 100) / 100,
    ...textStyle,
  };
}
