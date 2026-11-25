import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { saveTextStyleDefault, textStyleDefault, migrateTextStyles, TEXT_STYLE_KEYS, TEXT_STYLE_MIGRATION } from './text-defaults.js';

test('plain text keeps its own text style; text boxes and callouts use upstream\'s keys', () => {
  const prefs = {};
  const plain = { type: 'textbox', plainText: true, textColor: '#0000ff', fontFamily: 'Arial Narrow', fontBold: true, fontItalic: false, textAlign: 'center', lineSpacing: 1.2, strokeColor: 'none' };
  assert.equal(saveTextStyleDefault(prefs, plain), true);
  assert.deepEqual(textStyleDefault(prefs, 'plainText'), { textColor: '#0000ff', fontFamily: 'Arial Narrow', fontBold: true, fontItalic: false, textAlign: 'center', lineSpacing: 1.2 });
  assert.equal(saveTextStyleDefault(prefs, { type: 'textbox', strokeColor: '#ff0000', textColor: '#00ff00' }), false);
  assert.equal(saveTextStyleDefault(prefs, { type: 'callout', textColor: '#00ff00' }), false);
  assert.deepEqual(textStyleDefault(prefs, 'textbox'), {});
  assert.deepEqual(textStyleDefault(prefs, 'callout'), {});
  assert.equal(saveTextStyleDefault(prefs, { type: 'line', textColor: 'x' }), false);
  assert.ok(!TEXT_STYLE_KEYS.includes('strokeColor')); // border colors stay with upstream's keys
});

test('a text box or callout style saved the old way moves to upstream\'s keys once', () => {
  const prefs = {
    marksetMigrations: ['theme-light-2026-10'],
    textboxTextStyle: { textColor: '#38761d', fontFamily: 'Calibri', fontBold: true, textAlign: 'center', lineSpacing: 1.5 },
    calloutTextStyle: { textColor: '#0000ff' },
    textboxTextColor: '#000000',
  };
  const out = migrateTextStyles(prefs);
  assert.equal(out.textboxTextColor, '#38761d');
  assert.equal(out.textboxFontFamily, 'Calibri');
  assert.equal(out.textboxFontBold, true);
  assert.equal(out.textboxTextAlign, 'center');
  assert.equal(out.textboxLineSpacing, 1.5);
  assert.equal(out.calloutTextColor, '#0000ff');
  assert.equal(out.calloutFontFamily, undefined);
  assert.equal(out.textboxTextStyle, null);
  assert.equal(out.calloutTextStyle, null);
  assert.deepEqual(out.marksetMigrations, ['theme-light-2026-10', TEXT_STYLE_MIGRATION]);
  // Never again, so a later choice in upstream's keys stays.
  assert.deepEqual(migrateTextStyles({ ...prefs, ...out }), {});
  // Nothing saved: only the record.
  assert.deepEqual(migrateTextStyles({}), { marksetMigrations: [TEXT_STYLE_MIGRATION] });
});

test('the hooks are in place: save, apply, migrate, new plain text, button', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const prefs = read('../js/core/preferences.js');
  assert.match(prefs, /saveTextStyleDefault\(state\.preferences, annotation\);/);
  assert.match(prefs, /Object\.assign\(annotation, textStyleDefault\(prefs, styleTypeOf\(annotation\)\)\);/);
  assert.match(prefs, /Object\.assign\(state\.preferences, migrateTextStyles\(state\.preferences\)\);/);
  const ac = read('../js/tools/annotation-creators.js');
  assert.match(ac, /textStyle: textStyleDefault\(prefs, PLAIN_TEXT_TOOL\)/);
  assert.doesNotMatch(ac, /textStyleDefault\(prefs, '(textbox|callout)'\)/);
  assert.match(read('../js/solid/components/properties-panel/AppearanceSection.jsx'), /id="prop-set-as-default"/);
});
