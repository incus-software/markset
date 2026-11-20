// Markset: one-time preference updates, run when preferences load
// (js/core/preferences.js). Each one records itself in
// `marksetMigrations` so it never runs twice and never overrides a choice
// the user makes afterwards.
//
// Pure: works on a plain preferences object.

const MIGRATIONS = [
  {
    // Light became the default theme on 2026-10-12. Preferences saved before
    // then hold upstream's dark default ('default') only because it was the
    // default, so move them to Light once.
    id: 'theme-light-2026-10',
    apply(prefs) {
      return prefs.theme === 'default' ? { theme: 'light' } : {};
    },
  },
  {
    // The 2026.48.1 upstream merge: Markset's unit preferences move to
    // upstream's (#996, #1158), which now drive the same features. Carries the
    // user's choices over (US by default) and marks upstream's own one-time
    // switch to metric (unitsDefaultMetric) as done, so it never runs.
    id: 'units-upstream-2026-11',
    apply(prefs) {
      const metric = prefs.unitSystem === 'metric';
      const out = {
        scaleUnitSystem: metric ? 'metric' : 'imperial',
        imperialLengthFormat: prefs.measureImperialFormat === 'decimal' ? 'decimal' : 'feetInch',
        unitsDefaultMetric: true,
      };
      const den = Number(prefs.measureFractionDenominator);
      if ([2, 4, 8, 16, 32, 64].includes(den)) out.imperialFractionPrecision = den;
      if (!metric && (prefs.paperSizeUnit === undefined || prefs.paperSizeUnit === 'pt' || prefs.paperSizeUnit === 'mm')) {
        out.paperSizeUnit = 'in';
      }
      return out;
    },
  },
  {
    // The dimension (measure distance) line default went from 2 pt to 1 pt
    // on 2026-11-19: 2 pt drew twice as heavy as the drawing's own
    // dimension strings. A saved 2 is the old default, so halve it once.
    id: 'dim-line-weight-2026-11',
    apply(prefs) {
      return prefs.measureDistLineWidth === 2 ? { measureDistLineWidth: 1 } : {};
    },
  },
];

/** The changes to apply to `prefs` (including the record of what ran). */
export function marksetPrefMigrations(prefs) {
  const done = new Set(Array.isArray(prefs?.marksetMigrations) ? prefs.marksetMigrations : []);
  const out = {};
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    Object.assign(out, m.apply(prefs || {}));
    done.add(m.id);
  }
  if (done.size !== (prefs?.marksetMigrations?.length || 0)) out.marksetMigrations = [...done];
  return out;
}
