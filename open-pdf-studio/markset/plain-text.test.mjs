// Markset: plain text (the Text tool) and its own default style.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAIN_TEXT_TOOL, PLAIN_TEXT_FONT_SIZE, isPlainText, styleTypeOf, plainTextAnnotation, plainTextLineHeight, plainTextHeight,
} from './plain-text.js';
import { getStyleMapping } from '../js/core/stijl-mapping.js';
import { writeStylePrefs } from '../js/core/style-prefs.js';
import { saveTextStyleDefault, textStyleDefault } from './text-defaults.js';

test('a new plain text is a text box without border or fill, in the scheme color', () => {
  const ann = plainTextAnnotation({}, { x: 10, y: 20, width: 180, height: 4 }, { page: 3, inkColor: '#0000ff' });
  assert.equal(ann.type, 'textbox');
  assert.equal(ann.page, 3);
  assert.deepEqual([ann.strokeColor, ann.fillColor, ann.textColor], ['none', 'none', '#0000ff']);
  assert.equal(ann.fontSize, PLAIN_TEXT_FONT_SIZE);
  assert.equal(ann.height, plainTextLineHeight(PLAIN_TEXT_FONT_SIZE), 'at least one line high');
  assert.ok(isPlainText(ann));
  assert.equal(styleTypeOf(ann), PLAIN_TEXT_TOOL);
});

test('saved plain text defaults and text style are used', () => {
  const ann = plainTextAnnotation({ plainTextFontSize: 14, plainTextFontFamily: 'Times New Roman' },
    { x: 0, y: 0, width: 200, height: 60 }, { textStyle: { textColor: '#ff0000', fontBold: true } });
  assert.deepEqual([ann.fontSize, ann.fontFamily, ann.textColor, ann.fontBold, ann.height], [14, 'Times New Roman', '#ff0000', true, 60]);
});

test('only text boxes without border and fill (or made with the Text tool) are plain text', () => {
  assert.ok(isPlainText({ type: 'textbox', strokeColor: 'none', fillColor: null }));
  assert.ok(isPlainText({ type: 'textbox', strokeColor: '#000000', fillColor: '#ffffff', plainText: true }));
  assert.ok(!isPlainText({ type: 'textbox', strokeColor: '#000000', fillColor: 'none' }));
  assert.ok(!isPlainText({ type: 'textbox', strokeColor: 'none', fillColor: '#ffff00' }));
  assert.ok(!isPlainText({ type: 'callout', strokeColor: 'none', fillColor: 'none' }));
  assert.equal(styleTypeOf({ type: 'textbox', strokeColor: '#000' }), 'textbox');
  assert.equal(styleTypeOf(null), undefined);
});

test('Set as Default on plain text changes the plain text defaults, not the text box ones', () => {
  const prefs = { textboxFontSize: 8, textboxFontFamily: 'Arial' };
  const ann = { ...plainTextAnnotation({}, { x: 0, y: 0, width: 100, height: 20 }), fontSize: 12, fontFamily: 'Calibri', textColor: '#008000' };
  assert.ok(getStyleMapping(PLAIN_TEXT_TOOL));
  assert.ok(writeStylePrefs(ann, prefs));
  assert.equal(prefs.plainTextFontSize, 12);
  assert.equal(prefs.plainTextFontFamily, 'Calibri');
  assert.deepEqual([prefs.textboxFontSize, prefs.textboxFontFamily], [8, 'Arial'], 'text box defaults unchanged');
  assert.ok(saveTextStyleDefault(prefs, ann));
  assert.equal(textStyleDefault(prefs, PLAIN_TEXT_TOOL).textColor, '#008000');
  assert.deepEqual(textStyleDefault(prefs, 'textbox'), {});
});

test('plain text fits its wrapped lines; the top or bottom handle may only make it taller', () => {
  const ann = plainTextAnnotation({}, { x: 0, y: 0, width: 100, height: 0 });
  const one = plainTextLineHeight(10);
  assert.equal(one, 14, '10 pt line plus 1 pt inset above and below');
  assert.equal(plainTextHeight(ann, 0), one, 'never less than one line');
  assert.equal(plainTextHeight({ ...ann, height: 80 }, 38), 38, 'narrowed or widened: fits the text');
  assert.equal(plainTextHeight({ ...ann, height: 80 }, 38, { keepTaller: true }), 80, 'dragged taller: kept');
  assert.equal(plainTextHeight({ ...ann, height: 20 }, 38, { keepTaller: true }), 38, 'never shorter than the text');
});
