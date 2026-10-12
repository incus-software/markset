import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ASSISTANT_EN, applyTranslations } from './assistant-en.js';
import { upstreamRelPath, marksetBrand } from '../vite-brand.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = (rel) => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n');

test('every translated string is still in the upstream file (fails after an upstream change)', () => {
  for (const [rel, pairs] of Object.entries(ASSISTANT_EN)) {
    const code = source(rel);
    for (const [from] of pairs) assert.ok(code.includes(from), `${rel}: not found:\n${from}`);
  }
});

test('no Dutch left in what the assistant panel shows', () => {
  const dutch = /OpenAEC-assistent|Opslaan|Denken|Vraag iets|niet verbonden|werkt in:|API-sleutel|Geen verbinding|Ongeldige|'Vertaal'|'Vat samen'|'Teken'|Herken deuren|'Plattegrond'|'Constructieoverzicht'|Antwoord in het Nederlands|Gebruiker|Geopend document/;
  for (const rel of Object.keys(ASSISTANT_EN)) {
    const out = applyTranslations(source(rel), rel).replace(/^\s*\/\/.*$/gm, ''); // comments are not shown
    const hit = out.match(dutch);
    assert.equal(hit, null, `${rel}: ${hit?.[0]}`);
  }
});

test('translated JavaScript files still parse', () => {
  const dir = mkdtempSync(join(tmpdir(), 'markset-tr-'));
  try {
    for (const rel of Object.keys(ASSISTANT_EN).filter(r => r.endsWith('.js'))) {
      const file = join(dir, rel.replace(/[\\/]/g, '_') + '.mjs');
      writeFileSync(file, applyTranslations(source(rel), rel));
      execFileSync(process.execPath, ['--check', file]);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Dutch building skills are hidden: no buttons, no instructions', async () => {
  // The translated module next to the original, so its own imports resolve.
  const rel = 'js/assistant-skills.js';
  const file = join(root, 'js', `.assistant-skills.markset-test-${process.pid}.mjs`);
  writeFileSync(file, applyTranslations(source(rel), rel));
  try {
    const m = await import(pathToFileURL(file).href);
    assert.deepEqual(m.ASSISTANT_SKILLS.map(s => s.id), ['translate', 'summarize', 'draw', 'detect-doors']);
    assert.deepEqual(m.ASSISTANT_SKILLS.map(s => s.label), ['Translate', 'Summarize', 'Draw', 'Find doors']);
    assert.ok(m.SKILLS_SYSTEM_PROMPT.includes('Answer in English'));
    for (const gone of ['CONSTRUCTIE', 'PLATTEGROND', 'app_structural_layout', 'app_floorplan', 'spouwmuur']) {
      assert.ok(!m.SKILLS_SYSTEM_PROMPT.includes(gone), gone);
    }
    assert.ok(m.SKILLS_SYSTEM_PROMPT.includes('app_create_annotation')); // drawing and doors still work
  } finally { rmSync(file, { force: true }); }
});

test('the build overlay applies the English text and the product name', () => {
  const plugin = marksetBrand();
  plugin.configResolved({ root });
  const rel = 'js/solid/components/AssistantPanel.jsx';
  const out = plugin.transform(source(rel), join(root, rel)).code;
  assert.ok(out.includes('You are the Markset assistant in Markset'));
  assert.ok(!out.includes('Open PDF Studio'));
  assert.ok(out.includes('placeholder="Ask something about this PDF…"'));
  assert.equal(upstreamRelPath(join(root, 'js/a.js') + '?v=1', root), 'js/a.js');
  assert.equal(upstreamRelPath(join(root, '..', 'x.js'), root), null);
});
