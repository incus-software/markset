// Markset: "Check for updates when Markset starts" — off by default, a quiet
// check (only an available update speaks up), and the branding of its messages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('the preference is off by default and typed', () => {
  assert.match(read('../js/core/constants.ts'), /checkUpdatesOnStartup: false,/);
  assert.match(read('../js/types/preferences.ts'), /checkUpdatesOnStartup: boolean;/);
});

test('the General tab offers it under Startup, with an English label', () => {
  const tab = read('../js/solid/components/preferences/GeneralTab.jsx');
  assert.match(tab, /p\.checkUpdatesOnStartup\[0\]\(\)/);
  assert.match(tab, /p\.checkUpdatesOnStartup\[1\]\(e\.target\.checked\)/);
  const en = JSON.parse(read('../js/i18n/locales/en/preferences.json'));
  assert.equal(en.general.checkUpdatesOnStartup, 'Check for updates when Markset starts');
});

test('startup runs the quiet check only when the preference is on', () => {
  const main = read('../js/main.js');
  const at = main.indexOf('if (state.preferences.checkUpdatesOnStartup)');
  assert.ok(at > 0, 'guarded by the preference');
  assert.match(main.slice(at, at + 300), /checkForUpdates\(true\)/, 'silent: no "up to date" message at startup');
});

test('the up-to-date message names Markset', () => {
  const updater = read('../js/ui/chrome/updater.js');
  assert.match(updater, /latest version of Markset\./);
  assert.ok(!/latest version of Open PDF Studio/.test(updater));
});
