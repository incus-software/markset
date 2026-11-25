// node --test scripts/build-msix.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { msixVersion, fillManifest, TEST_IDENTITY } from './build-msix.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const template = readFileSync(path.join(here, '..', 'packaging', 'msix', 'AppxManifest.xml'), 'utf8');

test('MSIX version: the tauri version plus .0, each part at most 65535', () => {
  assert.equal(msixVersion('2026.48.10'), '2026.48.10.0');
  assert.throws(() => msixVersion('2026.48'), /MSIX/);
  assert.throws(() => msixVersion('2026.48.70000'), /MSIX/);
  assert.throws(() => msixVersion('2026.48.1-beta'), /MSIX/);
});

test('the version in tauri.conf.json fits MSIX', () => {
  const conf = JSON.parse(readFileSync(path.join(here, '..', 'src-tauri', 'tauri.conf.json'), 'utf8'));
  assert.match(msixVersion(conf.version), /^\d+\.\d+\.\d+\.0$/);
});

test('manifest: every value filled in and escaped, none left over', () => {
  const out = fillManifest(template, { ...TEST_IDENTITY, version: '2026.48.10.0', executable: 'open-pdf-studio.exe' });
  assert.ok(!/\{\{/.test(out));
  assert.ok(out.includes('Version="2026.48.10.0"'));
  assert.ok(out.includes('Executable="open-pdf-studio.exe"'));
  assert.ok(out.includes('<rescap:Capability Name="runFullTrust" />'));
  assert.ok(out.includes('.pdf</uap:FileType>'));
  const amp = fillManifest(template, { identityName: 'X', publisher: 'CN=A & B', publisherDisplayName: 'A & B', version: '1.2.3.0', executable: 'a.exe' });
  assert.ok(amp.includes('Publisher="CN=A &amp; B"'));
  assert.throws(() => fillManifest(template, { ...TEST_IDENTITY, version: '', executable: 'a.exe' }), /VERSION is empty/);
});

test('the local test identity is one Windows installs unsigned', () => {
  assert.match(TEST_IDENTITY.publisher, /OID\.2\.25\.311729368913984317654407730594956997722=1/);
});
