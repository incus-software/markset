import test from 'node:test';
import assert from 'node:assert/strict';
import { marksetPrefMigrations } from './pref-migrations.js';

test('a saved dark default theme moves to Light once', () => {
  const out = marksetPrefMigrations({ theme: 'default' });
  assert.equal(out.theme, 'light');
  assert.deepEqual(out.marksetMigrations, ['theme-light-2026-10']);
  // Picked dark again later: kept.
  assert.deepEqual(marksetPrefMigrations({ theme: 'default', marksetMigrations: ['theme-light-2026-10'] }), {});
});

test('other themes are kept; the migration is still recorded', () => {
  const out = marksetPrefMigrations({ theme: 'warm-ember' });
  assert.equal(out.theme, undefined);
  assert.deepEqual(out.marksetMigrations, ['theme-light-2026-10']);
  assert.equal(marksetPrefMigrations({}).theme, undefined);
});
