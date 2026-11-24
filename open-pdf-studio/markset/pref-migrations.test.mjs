import test from 'node:test';
import assert from 'node:assert/strict';
import { marksetPrefMigrations } from './pref-migrations.js';

const ALL = ['theme-light-2026-10', 'ai-link-off-2026-11'];

test('a saved dark default theme moves to Light once', () => {
  const out = marksetPrefMigrations({ theme: 'default' });
  assert.equal(out.theme, 'light');
  assert.deepEqual(out.marksetMigrations, ALL);
  // Picked dark again later: kept.
  assert.deepEqual(marksetPrefMigrations({ theme: 'default', marksetMigrations: ALL }), {});
});

test('other themes are kept; the migration is still recorded', () => {
  const out = marksetPrefMigrations({ theme: 'warm-ember' });
  assert.equal(out.theme, undefined);
  assert.deepEqual(out.marksetMigrations, ALL);
  assert.equal(marksetPrefMigrations({}).theme, undefined);
});

test('the AI link is turned off once for preferences saved while it was on by default', () => {
  const out = marksetPrefMigrations({ mcpEnabled: true, marksetMigrations: ['theme-light-2026-10'] });
  assert.equal(out.mcpEnabled, false);
  assert.deepEqual(out.marksetMigrations, ALL);
  // Turned back on later: kept.
  assert.deepEqual(marksetPrefMigrations({ mcpEnabled: true, marksetMigrations: ALL }), {});
  // Already off: nothing to change, but the migration is recorded.
  const off = marksetPrefMigrations({ mcpEnabled: false });
  assert.equal(off.mcpEnabled, undefined);
  assert.deepEqual(off.marksetMigrations, ALL);
});
