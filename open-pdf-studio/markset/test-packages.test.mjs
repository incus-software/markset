// Markset: test files that need a package Markset does not install are skipped.
// The import lines below are built from parts, so this file is not skipped itself.
const MU = 'mu' + 'pdf';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { leftOutImports, splitRunnable } from './test-packages.mjs';

test('imports of a left-out package are found, others are not', () => {
  assert.deepEqual(leftOutImports(`import * as m from '${MU}';`), ['mupdf']);
  assert.deepEqual(leftOutImports(`const m = await import('${MU}/dist/x.js');`), ['mupdf']);
  assert.deepEqual(leftOutImports("import { PDFDocument } from 'pdf-lib';\nimport './mupdf.js';"), []);
});

test('a test file is skipped only while the package is missing', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mset-tp-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'a.test.mjs'), `import * as m from '${MU}';`);
  fs.writeFileSync(path.join(dir, 'b.test.mjs'), "import test from 'node:test';");
  let r = splitRunnable(['a.test.mjs', 'b.test.mjs'], dir);
  assert.deepEqual(r.run, ['b.test.mjs']);
  assert.deepEqual(r.skipped, [{ file: 'a.test.mjs', missing: ['mupdf'] }]);
  fs.mkdirSync(path.join(dir, 'node_modules', 'mupdf'), { recursive: true });
  r = splitRunnable(['a.test.mjs', 'b.test.mjs'], dir);
  assert.deepEqual(r.run, ['a.test.mjs', 'b.test.mjs']);
});
