// Markset: unit tests that need a package Markset does not install.
//
// Some upstream tests check their output against MuPDF, a second PDF engine.
// MuPDF is AGPL-licensed and Markset does not ship or install it (see
// FORK-NOTES.md), so those test files cannot run here. The test runner
// (scripts/draai-unit-tests.mjs) skips a file that imports a package missing
// from node_modules and names it, instead of failing on the import.
import fs from 'node:fs';
import path from 'node:path';

// Packages a test may need that Markset leaves out on purpose.
export const LEFT_OUT = Object.freeze(['mupdf']);

const IMPORT = /(?:from\s+|import\s*\(\s*)['"]([^'"./][^'"]*)['"]/g;

/** The left-out packages that the test file's source imports. */
export function leftOutImports(source) {
  const found = new Set();
  for (const m of String(source).matchAll(IMPORT)) {
    const name = m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0];
    if (LEFT_OUT.includes(name)) found.add(name);
  }
  return [...found];
}

// Test helpers (`*.testhulp.mjs`) imported by a test file: their imports count
// as the test's own. App source is not followed, since it may load a left-out
// package only when it is there.
const HELPER_IMPORT = /(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]*testhulp[^'"]*)['"]/g;

function sourceWithHelpers(file, seen = new Set()) {
  if (seen.has(file)) return '';
  seen.add(file);
  let source = fs.readFileSync(file, 'utf8');
  for (const m of [...source.matchAll(HELPER_IMPORT)]) {
    try { source += '\n' + sourceWithHelpers(path.resolve(path.dirname(file), m[1]), seen); } catch { /* missing helper: the test reports it */ }
  }
  return source;
}

/** Split test files into those that can run and those skipped for a missing package. */
export function splitRunnable(files, appDir) {
  const run = [], skipped = [];
  for (const file of files) {
    let source = '';
    try { source = sourceWithHelpers(path.join(appDir, file)); } catch { run.push(file); continue; }
    const missing = leftOutImports(source).filter((p) => !fs.existsSync(path.join(appDir, 'node_modules', p)));
    if (missing.length) skipped.push({ file, missing }); else run.push(file);
  }
  return { run, skipped };
}
