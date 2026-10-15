import test from 'node:test';
import assert from 'node:assert/strict';
import { clampRenderScale, MAX_RENDER_PX } from './plugin-render-pdf.js';

test('render scale defaults to 4 px/pt and is capped for big sheets', () => {
  assert.equal(clampRenderScale(119, 119, undefined), 4);       // a 1.65" seal at 288 dpi
  assert.equal(clampRenderScale(119, 119, 8), 8);
  assert.equal(clampRenderScale(3456, 2592, 4), MAX_RENDER_PX / 3456); // ARCH E is capped
  assert.equal(clampRenderScale(612, 792, -2), 4);
});
