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
