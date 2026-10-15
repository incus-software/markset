// Plugin API for review tools: selection copies, missing markups, argument checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewApi } from './plugin-review-api.js';

test('review API: copies of the selection, false for a missing markup, required arguments', async () => {
  const a = { id: 'a', type: 'cloud', page: 2, color: '#f00' };
  const doc = { annotations: [a], selectedAnnotations: [a], selectedAnnotation: a };
  const api = createReviewApi({ getActiveDocument: () => doc });
  const sel = api.getSelectedAnnotations();
  assert.deepEqual(sel, [a]);
  sel[0].color = '#000';
  assert.equal(a.color, '#f00', 'a copy, not the live markup');
  doc.selectedAnnotations = [];
  assert.deepEqual(api.getSelectedAnnotations().map((x) => x.id), ['a'], 'a single selection counts');
  assert.equal(await api.showAnnotation('missing'), false);
  await assert.rejects(api.setToolStyle('', {}), /type is required/);
  await assert.rejects(api.openDocument(''), /path is required/);
  assert.deepEqual(createReviewApi({ getActiveDocument: () => null }).getSelectedAnnotations(), []);
});
