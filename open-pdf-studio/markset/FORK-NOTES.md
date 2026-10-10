# Markset fork notes

Markset is built on Open PDF Studio (LGPL-3.0-or-later). This file is the
dated modification log required by GPL-3.0 section 5(a) (via LGPL-3.0) and the
working notes for keeping the fork mergeable.

## Rules for this repository

1. **Keep upstream files as close to upstream as possible.** Put Markset code
   in `open-pdf-studio/markset/`. When an upstream file must change, keep the
   change small and mark it with a `Markset:` comment.
2. **Merge upstream weekly** (`git fetch upstream && git merge upstream/main`
   on a `sync/upstream-YYYY-MM-DD` branch, then run the tests).
3. **Paid add-ons are not part of this repository.** Only open-source code
   under licenses compatible with LGPL-3.0 goes here.
4. **Regenerate `markset/licenses.md` before every release.**

## Modification log

| Date | Change |
|---|---|
| 2026-10-10 | Forked from upstream release 2026.41.0 (commit c8459398). |
| 2026-10-10 | Removed the unused AGPL-licensed `mupdf` package; web unit falls back to PDF.js. |
| 2026-10-10 | Renamed the app to Markset (product name, window title, bundle id `com.usemarkset.app`, `Markset.pdf` file type, `markset://` links). UI strings are rewritten at build time by `markset/vite-brand.mjs`. |
| 2026-10-10 | Updater, "What's new", "Install previous version" and feedback now point to Markset services instead of upstream. Updater artifacts are off until Markset has its own signing key. |
| 2026-10-10 | About dialog: added the fork notice (`markset/ForkNotice.jsx`); contact link goes to support@usemarkset.com. |
| 2026-10-10 | Added NOTICE.md, this file, the dependency license report and a Windows CI build (`.github/workflows/markset-windows.yml`). |
| 2026-10-10 | Fixed the brand overlay (`markset/vite-brand.mjs`): it skipped every file because the repository checkout is itself named "markset"; it now skips only `open-pdf-studio/markset/`. |

## Known follow-ups

- [ ] Generate a Markset updater key pair (`npx tauri signer generate`), store the private key as a GitHub secret, put the public key in `tauri.conf.json`, then turn `createUpdaterArtifacts` back on.
- [ ] Code-signing certificate for Windows installers.
- [ ] Rust-side names: the virtual printer is still called "Open PDF Printer", and `standaard_app.rs` / `ocr.rs` / `lib.rs` contain `Open PDF Studio` install paths and `.desktop` names used for default-app detection.
- [ ] "Sign in with OpenAEC" accounts commands (`src-tauri/src/accounts.rs`) are still registered; no UI calls them today. Remove or gate before release.
- [ ] Replace icons, splash and theme with the Markset design.
- [ ] Set up support@usemarkset.com and the usemarkset.com feedback endpoint.
- [ ] Confirm the license of the npm package `@crabnebula/tauri-plugin-drag`.
- [ ] US units: feet-inch fractions, architectural scales, ARCH/ANSI sheet sizes.
