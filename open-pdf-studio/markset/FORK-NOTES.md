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
| 2026-10-10 | US units (`markset/us-units.js`): ft/in measurements display as feet-inch fractions (preference, default 1/16"); length fields accept `12'-6 3/8"`; architectural and engineering scale presets; title-block detection reads `1/4" = 1'-0"` as 1:48 in feet (it was read as 1:4); ANSI A-E and ARCH A-E1 sheets in New Document and Insert Page. Hooks are marked `Markset:` in measurement.js, maat-label.js, document-scale.js, loader.js, constants.ts, preferences.ts, the calibration/scale/viewport/scale-region/measured-length dialogs, NewDocDialog, InsertPageDialog and AnnotationsTab. |
| 2026-10-10 | US units, part 2: feet-inch text in the remaining places that formatted lengths themselves (propertiesStore.js, annotation-creators.js, annotation-converter.js, measurement.js, rendering.js, snap-engine.js, MeasurementsPanel.jsx); a new scale bar is 5 m in any metric unit and 20'/24" in imperial ones (was 5000 of any unit, scale-bar.js); `unitSystem` preference for dialog defaults. |
| 2026-10-10 | US units, part 3: ANSI C-E and ARCH A-E1 sheets in print (print_instelling.rs, print-pagina-instelling.js) and CAD import (open-pdf-cad paper.rs, cad-import-logica.js, cad-import-instellingen.js; the sync test in cad-import.test.mjs accepts ids with a hyphen). Rust tests in the Windows CI; src-tauri/build.rs embeds the Common Controls v6 manifest in test binaries only, without which `cargo test` cannot start on Windows. |
| 2026-10-10 | Symbol groundwork (Phase B): SVG symbol stamps save as vector appearances (`markset/svg-to-pdf.js`, `stamp-vector.js`; hook in saver.js) with the SVG in `OPS_StampSvg` (read back in color-extraction.js / annotation-converter.js); bundled US Starter Library (`markset/library/`, MIT) listed first in the palette (symbolStore.js); sheet-relative size (stamps.js), review mark color (`reviewMarkColor`, SymbolPalette.jsx, AnnotationsTab.jsx) and K / X shortcuts (keyboard-handlers.js; `selectSymbol` exported). NOTICE.md notes the artwork license. |
| 2026-10-10 | Fixed the brand overlay (`markset/vite-brand.mjs`): it skipped every file because the repository checkout is itself named "markset"; it now skips only `open-pdf-studio/markset/`. |
| 2026-10-10 | Review marks (Phase C, Starter Library batch 1): circled check, circled X, question mark, VIF, NIC, OK, EQ, see-comment dot and strike line join the checkmark and X. Symbol palette defaults to the United States (symbolLocales.js; was the Netherlands). |
| 2026-10-10 | Starter Library batch 2: drawing symbols in black (north arrow, centerline, break line, match line, level datum, spot elevation; wide ones use a 128- or 192-unit viewBox, still 64 high) and punch / field icons in review red (punch pin, finish, door/hardware, MEP, safety, damage, water/moisture, crack, camera). The graphic scale bar is the existing scale-bar tool, not a symbol. |
| 2026-10-10 | Starter Library batch 3: 15 stamps (7 submittal review, 8 issue/status) as 256x64 vector symbols with role `stamp`: fixed meaning colors (green accepted, amber conditional, red not accepted, blue informational, gray archival), not recolored. Live date, initials and firm fields are not part of the open-source app. |
| 2026-10-10 | Smart symbols (Phase E): 13 US parametric templates in `markset/smart/` (detail callout, section marker, exterior and 4-way interior elevation, grid bubble, revision delta, keynote, room, door, window, wall-type and equipment tags, numbered punch marker), registered at start-up (main.js) with editable text fields. Placed at the sheet-relative size (annotation-creators.js); saved with a vector appearance through `cmds-svg.js` + `svg-to-pdf.js` (saver.js; upstream templates keep their PNG). Listed in the US Starter Library palette group. |
| 2026-10-11 | Drawing symbols revised to US drafting conventions after review: 19 smart templates (building, wall and non-directional detail sections with filled hoods, enlarged detail reference, exterior and diamond interior elevation, elevation target, spot elevation, column grid bubble with line, drawing title, revision delta, room name over boxed number, ceiling height, door and window numbers, partition type, keynote, equipment, punch marker), regular-weight text; static north arrow redrawn and align note added; the static level datum and spot elevation were replaced by their smart versions. |
| 2026-10-11 | Section hoods restyled (winged, flatter), rectangular foot on wall and detail sections, SIM option, interior elevation as black corner pointers around a sheet circle. Plan door and window drawn to the drawing scale (`markset/smart/plan.js`: width, wall thickness, swing, hinge side, single/double leaves typed in feet and inches). US Electrical collection (`markset/library/us-electrical-starter/`, 22 receptacle, switch and light symbols); `markset.json` `order` sets the palette position of bundled collections. |

## Known follow-ups

- [ ] Generate a Markset updater key pair (`npx tauri signer generate`), store the private key as a GitHub secret, put the public key in `tauri.conf.json`, then turn `createUpdaterArtifacts` back on.
- [ ] Code-signing certificate for Windows installers.
- [ ] Rust-side names: the virtual printer is still called "Open PDF Printer", and `standaard_app.rs` / `ocr.rs` / `lib.rs` contain `Open PDF Studio` install paths and `.desktop` names used for default-app detection.
- [ ] "Sign in with OpenAEC" accounts commands (`src-tauri/src/accounts.rs`) are still registered; no UI calls them today. Remove or gate before release.
- [ ] Replace icons, splash and theme with the Markset design.
- [ ] Set up support@usemarkset.com and the usemarkset.com feedback endpoint.
- [ ] Confirm the license of the npm package `@crabnebula/tauri-plugin-drag`.
- [x] US units: feet-inch fractions, architectural scales, ARCH/ANSI sheet sizes (`markset/us-units.js`).
- [x] US units, part 2: feet-inch text in the properties panel, Measurements panel totals, perimeter with a manual scale, measured-length flow, PDF-loaded dimensions and the polar readout (`imperialOr`). Schedules and CSV stay decimal on purpose (US takeoffs use decimal LF/SF, and CSV needs plain numbers).
- [x] US units, part 2: `unitSystem` preference (`us` default, or `metric`) sets the starting unit, scale and sheet in the scale dialogs and New Document (`markset/unit-defaults.js`).
- [x] US units, part 3: ANSI C-E and ARCH A-E1 in Page Setup / print (`Papier` in `print_instelling.rs`; ANSI by `DMPAPER` code, ARCH as a custom size or the plotter's own form of that size) and in CAD import (`paper.rs`, picked by hand only).
- [ ] US scales in CAD import's scale list (`STANDARD_SCALES` in `paper.rs` and `STANDAARDSCHALEN`): adding 1:48, 1:96 etc. would change which scale "auto" picks for metric drawings, so it needs a unit-aware rule.
- [x] `cargo test` runs in `markset-windows.yml` (app and CAD crates; dynamic CRT in `target/rust-tests`). The two `mcp_server` screenshot tests are skipped there because the test binary cannot find PDFium; `open-pdf-render` tests are not run yet.
- [ ] Translate the new US units strings (only `en` has them; other locales fall back to English).
- [ ] Symbols: round-trip a saved file in Bluebeam and Acrobat (vector appearance, size, color). Three upstream floor-pattern symbols (`param-vloer-*`) still save as PNG because their SVG uses features the converter does not draw.
- [ ] Smart symbols: auto-numbering (P-001, next revision) and a building section with bubbles at both ends of the cut. Upstream parametric templates still save as PNG; switch them to `cmds-svg.js` once each kind they draw (hatch, zigzag, rings) is supported.
- [ ] Symbol palette: upstream groups without a country tag (e.g. "NL Elektra") still show when the country is US; the IFC category field shows Dutch descriptions.
