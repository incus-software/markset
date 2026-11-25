// Markset: an MSIX package for the Microsoft Store from a finished Windows
// build (npm run tauri -- build). The Store signs the package when it is
// published, so no certificate is needed here.
//
//   node scripts/build-msix.mjs           Store package; needs the identity
//                                         from packaging/msix/identity.json
//   node scripts/build-msix.mjs --test    local test package; sign it with a
//                                         self-signed certificate whose subject is
//                                         TEST_IDENTITY.publisher, trust that
//                                         certificate, then Add-AppxPackage
//                                         (a desktop app can't install unsigned)
//
// Output: target/msix/Markset_<version>_x64.msix (next to target/release).
// The NSIS installer's extras are not in the package: the virtual printer and
// the File Explorer thumbnail handler need an installer that runs as admin.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');

/** The four-part MSIX version of a tauri version (2026.48.10 -> 2026.48.10.0). */
export function msixVersion(version) {
  const parts = String(version).split('.');
  if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p) && Number(p) <= 65535)) {
    throw new Error(`not a version MSIX can carry: ${version}`);
  }
  return `${parts.join('.')}.0`;
}

/** The local test identity: sign with a self-signed certificate of this subject. */
export const TEST_IDENTITY = Object.freeze({
  identityName: 'Markset.LocalTest',
  publisher: 'CN=Markset Local Test',
  publisherDisplayName: 'Markset (local test)',
});

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** AppxManifest.xml with its {{...}} values filled in; every value is required. */
export function fillManifest(template, { identityName, publisher, publisherDisplayName, version, executable }) {
  const values = {
    IDENTITY_NAME: identityName, PUBLISHER: publisher, PUBLISHER_DISPLAY_NAME: publisherDisplayName,
    VERSION: version, EXECUTABLE: executable,
  };
  for (const [k, v] of Object.entries(values)) if (!v) throw new Error(`MSIX manifest: ${k} is empty`);
  const out = template.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in values)) throw new Error(`MSIX manifest: unknown value ${m}`);
    return xml(values[k]);
  });
  return out;
}

/** The newest makeappx.exe of the Windows SDK. */
function findMakeAppx() {
  const bin = 'C:/Program Files (x86)/Windows Kits/10/bin';
  if (!existsSync(bin)) throw new Error('Windows SDK not found (needs makeappx.exe)');
  const versions = readdirSync(bin).filter((d) => /^10\.\d/.test(d)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const v of versions.reverse()) {
    const exe = path.join(bin, v, 'x64', 'makeappx.exe');
    if (existsSync(exe)) return exe;
  }
  throw new Error('makeappx.exe not found in the Windows SDK');
}

function main() {
  const test = process.argv.includes('--test');
  const conf = JSON.parse(readFileSync(path.join(app, 'src-tauri', 'tauri.conf.json'), 'utf8'));
  const version = msixVersion(conf.version);
  const identity = test ? TEST_IDENTITY : JSON.parse(readFileSync(path.join(app, 'packaging', 'msix', 'identity.json'), 'utf8'));
  if (!test && !(identity.identityName && identity.publisher && identity.publisherDisplayName)) {
    throw new Error('packaging/msix/identity.json is not filled in yet (Partner Center > Product identity); use --test for a local package');
  }

  const release = path.resolve(app, '..', 'target', 'release');
  const outDir = path.resolve(app, '..', 'target', 'msix');
  const stage = path.join(outDir, 'stage');
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(path.join(stage, 'Assets'), { recursive: true });

  const executable = 'open-pdf-studio.exe';
  // What the NSIS installer puts in the install folder (tauri.conf.json and
  // tauri.windows.conf.json): the app, the pdfium sidecar and its DLL, and the
  // bundled resources.
  for (const f of [executable, 'pdfium-worker.exe', 'pdfium.dll', 'WebView2Loader.dll', 'file-icon.ico']) {
    const src = path.join(release, f);
    if (!existsSync(src)) throw new Error(`missing from the build: target/release/${f} (run npm run tauri -- build first)`);
    cpSync(src, path.join(stage, f));
  }
  for (const d of ['tessdata', 'fonts']) cpSync(path.join(release, d), path.join(stage, d), { recursive: true });

  const icons = path.join(app, 'src-tauri', 'icons');
  for (const [from, to] of [
    ['StoreLogo.png', 'StoreLogo.png'], ['Square44x44Logo.png', 'Square44x44Logo.png'],
    ['Square150x150Logo.png', 'Square150x150Logo.png'], ['file-icon-64.png', 'FileIcon.png'],
  ]) cpSync(path.join(icons, from), path.join(stage, 'Assets', to));

  const template = readFileSync(path.join(app, 'packaging', 'msix', 'AppxManifest.xml'), 'utf8');
  writeFileSync(path.join(stage, 'AppxManifest.xml'), fillManifest(template, { ...identity, version, executable }));

  const msix = path.join(outDir, `Markset_${conf.version}_x64${test ? '_test' : ''}.msix`);
  rmSync(msix, { force: true });
  execFileSync(findMakeAppx(), ['pack', '/d', stage, '/p', msix, '/o'], { stdio: 'inherit' });
  console.log(`\nMSIX ${version}${test ? ' (local test, sign before installing)' : ''}: ${msix}`);
  if (test) console.log(`Sign: signtool sign /fd SHA256 /n "${TEST_IDENTITY.publisher.slice(3)}" "${msix}"`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
