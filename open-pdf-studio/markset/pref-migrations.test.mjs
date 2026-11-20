import test from 'node:test';
import assert from 'node:assert/strict';
import { marksetPrefMigrations } from './pref-migrations.js';

test('a saved dark default theme moves to Light once', () => {
  const out = marksetPrefMigrations({ theme: 'default' });
  assert.equal(out.theme, 'light');
  assert.deepEqual(out.marksetMigrations, ['theme-light-2026-10', 'units-upstream-2026-11']);
  // Picked dark again later: kept.
  assert.deepEqual(marksetPrefMigrations({ theme: 'default', marksetMigrations: ['theme-light-2026-10', 'units-upstream-2026-11'] }), {});
});

test('other themes are kept; the migration is still recorded', () => {
  const out = marksetPrefMigrations({ theme: 'warm-ember' });
  assert.equal(out.theme, undefined);
  assert.deepEqual(out.marksetMigrations, ['theme-light-2026-10', 'units-upstream-2026-11']);
  assert.equal(marksetPrefMigrations({}).theme, undefined);
});

test('Markset unit preferences move to the upstream ones once, US by default', () => {
  const us = marksetPrefMigrations({ marksetMigrations: ['theme-light-2026-10'], paperSizeUnit: 'mm' });
  assert.equal(us.scaleUnitSystem, 'imperial');
  assert.equal(us.imperialLengthFormat, 'feetInch');
  assert.equal(us.paperSizeUnit, 'in');
  assert.equal(us.unitsDefaultMetric, true);
  const metric = marksetPrefMigrations({ marksetMigrations: ['theme-light-2026-10'], unitSystem: 'metric',
    measureImperialFormat: 'decimal', measureFractionDenominator: 8, paperSizeUnit: 'mm' });
  assert.equal(metric.scaleUnitSystem, 'metric');
  assert.equal(metric.imperialLengthFormat, 'decimal');
  assert.equal(metric.imperialFractionPrecision, 8);
  assert.equal(metric.paperSizeUnit, undefined);
});
