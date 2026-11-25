import test from 'node:test';
import assert from 'node:assert/strict';
import { readableToolName } from './tool-label.js';

test('tool ids without a translation read as words in the status bar', () => {
  assert.equal(readableToolName('marksetTextHighlighter'), 'Text highlighter');
  assert.equal(readableToolName('markset-pro-deficiency-tool'), 'Deficiency');
  assert.equal(readableToolName('markset-pro-review-stamp'), 'Review stamp');
  assert.equal(readableToolName('splineArrow'), 'Spline arrow');
  assert.equal(readableToolName('chamfer'), 'Chamfer');
  assert.equal(readableToolName(''), '');
  assert.equal(readableToolName(undefined), '');
});
