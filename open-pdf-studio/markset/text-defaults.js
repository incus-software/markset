// Markset: the text style of text boxes and callouts as part of their default
// style. Upstream saved the border, fill, opacity and font size, but a new
// text box always got black Arial text, so a text color or font set in the
// tool defaults (or with "Set as Default Style") did not stick.
//
// Pure: works on the preferences object and an annotation.

export const TEXT_STYLE_KEYS = Object.freeze([
  'textColor', 'fontFamily', 'fontBold', 'fontItalic', 'fontUnderline', 'fontStrikethrough', 'textAlign', 'lineSpacing',
]);

const PREF_KEY = Object.freeze({ textbox: 'textboxTextStyle', callout: 'calloutTextStyle' });

/** Store the text style of `ann` as its type's default. Returns false for other types. */
export function saveTextStyleDefault(prefs, ann) {
  const key = PREF_KEY[ann?.type];
  if (!key || !prefs) return false;
  const style = {};
  for (const k of TEXT_STYLE_KEYS) if (ann[k] !== undefined && ann[k] !== null) style[k] = ann[k];
  prefs[key] = style;
  return true;
}

/** The saved text style for annotation type `type` (empty when none). */
export function textStyleDefault(prefs, type) {
  const s = prefs?.[PREF_KEY[type]];
  if (!s || typeof s !== 'object') return {};
  return Object.fromEntries(TEXT_STYLE_KEYS.filter(k => s[k] !== undefined && s[k] !== null).map(k => [k, s[k]]));
}
