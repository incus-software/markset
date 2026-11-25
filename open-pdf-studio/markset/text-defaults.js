// Markset: the text style of plain text (the Text tool) as part of its
// default style: text color, font, bold/italic/underline/strikethrough,
// alignment and line spacing.
//
// Markset first did this for text boxes and callouts too, when upstream
// always gave them black Arial text. Upstream now keeps those same fields in
// its own preferences (textboxTextColor, textboxFontFamily, textboxFontBold,
// ... #765, #1150), set by "Set as Default Style" and by the tool defaults on
// the Format tab. Markset's copy, applied last, overrode a later choice made
// there, so text boxes and callouts now use upstream's keys only, and
// migrateTextStyles() moves a style saved the old way over once.
//
// Pure: works on the preferences object and an annotation.

import { styleTypeOf } from './plain-text.js';

export const TEXT_STYLE_KEYS = Object.freeze([
  'textColor', 'fontFamily', 'fontBold', 'fontItalic', 'fontUnderline', 'fontStrikethrough', 'textAlign', 'lineSpacing',
]);

const PREF_KEY = Object.freeze({ plainText: 'plainTextTextStyle' });

/** Store the text style of `ann` as plain text's default. Returns false for other types (upstream stores theirs). */
export function saveTextStyleDefault(prefs, ann) {
  const key = PREF_KEY[styleTypeOf(ann)];
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

export const TEXT_STYLE_MIGRATION = 'text-style-upstream-2026-11';

// Markset's old keys and upstream's preference suffix for each field.
const OLD_KEYS = Object.freeze({ textbox: 'textboxTextStyle', callout: 'calloutTextStyle' });
const UPSTREAM_SUFFIX = Object.freeze({
  textColor: 'TextColor', fontFamily: 'FontFamily', fontBold: 'FontBold', fontItalic: 'FontItalic',
  fontUnderline: 'FontUnderline', fontStrikethrough: 'FontStrikethrough', textAlign: 'TextAlign', lineSpacing: 'LineSpacing',
});

/**
 * Once: the text box and callout text styles saved by Markset move to
 * upstream's preferences (the style that was in effect stays in effect) and
 * the old keys are cleared. Returns the changes, including the record in
 * `marksetMigrations` (see pref-migrations.js).
 */
export function migrateTextStyles(prefs) {
  const done = Array.isArray(prefs?.marksetMigrations) ? prefs.marksetMigrations : [];
  if (done.includes(TEXT_STYLE_MIGRATION)) return {};
  const out = {};
  for (const [type, key] of Object.entries(OLD_KEYS)) {
    const s = prefs?.[key];
    if (s && typeof s === 'object') {
      for (const [field, suffix] of Object.entries(UPSTREAM_SUFFIX)) {
        if (s[field] !== undefined && s[field] !== null) out[type + suffix] = s[field];
      }
    }
    if (prefs && key in prefs) out[key] = null;
  }
  out.marksetMigrations = [...done, TEXT_STYLE_MIGRATION];
  return out;
}
