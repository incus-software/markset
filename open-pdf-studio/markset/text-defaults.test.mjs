import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { saveTextStyleDefault, textStyleDefault, TEXT_STYLE_KEYS } from './text-defaults.js';

test('a text box\'s text style becomes the default; other types are left alone', () => {
  const prefs = {};
  const tb = { type: 'textbox', textColor: '#0000ff', fontFamily: 'Arial Narrow', fontBold: true, fontItalic: false, textAlign: 'center', lineSpacing: 1.2, strokeColor: '#0000ff' };
  assert.equal(saveTextStyleDefault(prefs, tb), true);
  assert.deepEqual(textStyleDefault(prefs, 'textbox'), { textColor: '#0000ff', fontFamily: 'Arial Narrow', fontBold: true, fontItalic: false, textAlign: 'center', lineSpacing: 1.2 });
  assert.deepEqual(textStyleDefault(prefs, 'callout'), {});
  assert.equal(saveTextStyleDefault(prefs, { type: 'line', textColor: 'x' }), false);
  assert.deepEqual(textStyleDefault({}, 'textbox'), {});
  assert.ok(!TEXT_STYLE_KEYS.includes('strokeColor')); // border colors stay with upstream's keys
});

test('the hooks are in place: save, apply, new text box and callout, button', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const prefs = read('../js/core/preferences.js');
  assert.match(prefs, /saveTextStyleDefault\(prefs, annotation\);/);
  assert.match(prefs, /Object\.assign\(annotation, textStyleDefault\(prefs, annotation\.type\)\);/);
  const ac = read('../js/tools/annotation-creators.js');
  assert.match(ac, /\.\.\.textStyleDefault\(prefs, 'textbox'\)/);
  assert.match(ac, /\.\.\.textStyleDefault\(prefs, 'callout'\)/);
  assert.match(read('../js/solid/components/properties-panel/AppearanceSection.jsx'), /id="prop-set-as-default"/);
});
