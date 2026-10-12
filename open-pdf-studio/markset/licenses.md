# Markset dependency license report

Generated 2026-10-10 from Cargo.lock (cargo metadata --locked) and open-pdf-studio/package-lock.json (production packages only). Workspace crates excluded.

Total third-party packages: 815 (781 Rust crates, 34 npm packages).

## Needs attention (copyleft or unknown, with no permissive alternative)

| Ecosystem | Package | Version | License |
|---|---|---|---|
| cargo | acadrust | 0.5.5 | MPL-2.0 |
| cargo | cssparser | 0.36.0 | MPL-2.0 |
| cargo | cssparser-macros | 0.6.1 | MPL-2.0 |
| cargo | dtoa-short | 0.3.5 | MPL-2.0 |
| cargo | option-ext | 0.2.0 | MPL-2.0 |
| cargo | selectors | 0.36.1 | MPL-2.0 |
| npm | @crabnebula/tauri-plugin-drag | 2.1.0 | UNKNOWN |

**Review notes**

- MPL-2.0 crates (acadrust, cssparser, cssparser-macros, dtoa-short, option-ext, selectors): file-level copyleft. Allowed; we must offer their source alongside ours (MPL-2.0 section 3.2). They do not extend to separately distributed software.
- @crabnebula/tauri-plugin-drag (npm): no license field in its package.json. Its Rust counterpart (`drag`, `tauri-plugin-drag` 2.1.1) is `Apache-2.0 OR MIT`; confirm the JS package matches before the first sale.
- mupdf (AGPL-3.0) was removed in this branch and no longer appears.
- Regenerate this report before every release.

## License counts

| License expression | Packages |
|---|---|
| MIT OR Apache-2.0 | 354 |
| MIT | 196 |
| Apache-2.0 OR MIT | 91 |
| MIT/Apache-2.0 | 38 |
| Zlib OR Apache-2.0 OR MIT | 19 |
| Unicode-3.0 | 18 |
| Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | 15 |
| Unlicense OR MIT | 7 |
| Apache-2.0 | 7 |
| MPL-2.0 | 6 |
| MIT OR Apache-2.0 OR Zlib | 6 |
| BSD-3-Clause | 5 |
| Apache-2.0/MIT | 5 |
| ISC | 5 |
| Zlib | 3 |
| Apache-2.0 OR ISC OR MIT | 3 |
| BSL-1.0 | 2 |
| CC0-1.0 OR MIT-0 OR Apache-2.0 | 2 |
| BSD-3-Clause OR Apache-2.0 | 2 |
| BSD-3-Clause OR MIT OR Apache-2.0 | 2 |
| MIT OR Apache-2.0 OR LGPL-2.1-or-later | 2 |
| Unlicense/MIT | 2 |
| Apache-2.0 OR BSL-1.0 OR MIT | 2 |
| CDLA-Permissive-2.0 | 2 |
| BSD-2-Clause OR Apache-2.0 OR MIT | 2 |
| 0BSD OR MIT OR Apache-2.0 | 1 |
| BSD-2-Clause | 1 |
| ISC AND (Apache-2.0 OR ISC) | 1 |
| ISC AND (Apache-2.0 OR ISC) AND Apache-2.0 AND MIT AND BSD-3-Clause AND (Apache-2.0 OR ISC OR MIT) AND (Apache-2.0 OR ISC OR MIT-0) | 1 |
| BSD-3-Clause AND MIT | 1 |
| BSD-3-Clause/MIT | 1 |
| Apache-2.0 AND MIT | 1 |
| (Apache-2.0 OR MIT) AND BSD-3-Clause | 1 |
| Apache-2.0 / MIT | 1 |
| MIT AND BSD-3-Clause | 1 |
| MIT OR Zlib OR Apache-2.0 | 1 |
| Apache-2.0 AND ISC | 1 |
| Apache-2.0 OR BSL-1.0 | 1 |
| Apache-2.0 WITH LLVM-exception | 1 |
| CC0-1.0 | 1 |
| (MIT OR Apache-2.0) AND Unicode-3.0 | 1 |
| UNKNOWN | 1 |
| (MIT AND Zlib) | 1 |
| 0BSD | 1 |

## Full list

| Ecosystem | Package | Version | License |
|---|---|---|---|
| cargo | acadrust | 0.5.5 | MPL-2.0 |
| cargo | adler2 | 2.0.1 | 0BSD OR MIT OR Apache-2.0 |
| cargo | aes | 0.8.4 | MIT OR Apache-2.0 |
| cargo | ahash | 0.7.8 | MIT OR Apache-2.0 |
| cargo | ahash | 0.8.12 | MIT OR Apache-2.0 |
| cargo | aho-corasick | 1.1.4 | Unlicense OR MIT |
| cargo | alloc-no-stdlib | 2.0.4 | BSD-3-Clause |
| cargo | alloc-stdlib | 0.2.2 | BSD-3-Clause |
| cargo | android_log-sys | 0.3.2 | MIT OR Apache-2.0 |
| cargo | android_logger | 0.15.1 | MIT OR Apache-2.0 |
| cargo | android_system_properties | 0.1.5 | MIT/Apache-2.0 |
| cargo | anstream | 1.0.0 | MIT OR Apache-2.0 |
| cargo | anstyle | 1.0.14 | MIT OR Apache-2.0 |
| cargo | anstyle-parse | 1.0.0 | MIT OR Apache-2.0 |
| cargo | anstyle-query | 1.1.5 | MIT OR Apache-2.0 |
| cargo | anstyle-wincon | 3.0.11 | MIT OR Apache-2.0 |
| cargo | anyhow | 1.0.102 | MIT OR Apache-2.0 |
| cargo | arbitrary | 1.4.2 | MIT OR Apache-2.0 |
| cargo | arboard | 3.6.1 | MIT OR Apache-2.0 |
| cargo | arrayref | 0.3.9 | BSD-2-Clause |
| cargo | arrayvec | 0.7.6 | MIT OR Apache-2.0 |
| cargo | async-broadcast | 0.7.2 | MIT OR Apache-2.0 |
| cargo | async-channel | 2.5.0 | Apache-2.0 OR MIT |
| cargo | async-executor | 1.14.0 | Apache-2.0 OR MIT |
| cargo | async-io | 2.6.0 | Apache-2.0 OR MIT |
| cargo | async-lock | 3.4.2 | Apache-2.0 OR MIT |
| cargo | async-process | 2.5.0 | Apache-2.0 OR MIT |
| cargo | async-recursion | 1.1.1 | MIT OR Apache-2.0 |
| cargo | async-signal | 0.2.14 | Apache-2.0 OR MIT |
| cargo | async-task | 4.7.1 | Apache-2.0 OR MIT |
| cargo | async-trait | 0.1.89 | MIT OR Apache-2.0 |
| cargo | atk | 0.18.2 | MIT |
| cargo | atk-sys | 0.18.2 | MIT |
| cargo | atomic-waker | 1.1.2 | Apache-2.0 OR MIT |
| cargo | autocfg | 1.5.0 | Apache-2.0 OR MIT |
| cargo | aws-lc-rs | 1.18.1 | ISC AND (Apache-2.0 OR ISC) |
| cargo | aws-lc-sys | 0.45.0 | ISC AND (Apache-2.0 OR ISC) AND Apache-2.0 AND MIT AND BSD-3-Clause AND (Apache-2.0 OR ISC OR MIT) AND (Apache-2.0 OR ISC OR MIT-0) |
| cargo | axum | 0.8.9 | MIT |
| cargo | axum-core | 0.5.6 | MIT |
| cargo | base16ct | 0.2.0 | Apache-2.0 OR MIT |
| cargo | base64 | 0.21.7 | MIT OR Apache-2.0 |
| cargo | base64 | 0.22.1 | MIT OR Apache-2.0 |
| cargo | base64 | 0.23.1 | MIT OR Apache-2.0 |
| cargo | base64ct | 1.8.3 | Apache-2.0 OR MIT |
| cargo | bit-set | 0.8.0 | Apache-2.0 OR MIT |
| cargo | bit-vec | 0.8.0 | Apache-2.0 OR MIT |
| cargo | bitflags | 1.3.2 | MIT/Apache-2.0 |
| cargo | bitflags | 2.11.1 | MIT OR Apache-2.0 |
| cargo | bitvec | 1.0.1 | MIT |
| cargo | block-buffer | 0.10.4 | MIT OR Apache-2.0 |
| cargo | block-padding | 0.3.3 | MIT OR Apache-2.0 |
| cargo | block2 | 0.6.2 | MIT |
| cargo | blocking | 1.6.2 | Apache-2.0 OR MIT |
| cargo | borsh | 1.6.1 | MIT OR Apache-2.0 |
| cargo | borsh-derive | 1.6.1 | Apache-2.0 |
| cargo | brotli | 8.0.2 | BSD-3-Clause AND MIT |
| cargo | brotli-decompressor | 5.0.0 | BSD-3-Clause/MIT |
| cargo | bs58 | 0.5.1 | MIT/Apache-2.0 |
| cargo | bumpalo | 3.20.2 | MIT OR Apache-2.0 |
| cargo | byte-unit | 5.2.0 | MIT |
| cargo | bytecheck | 0.6.12 | MIT |
| cargo | bytecheck_derive | 0.6.12 | MIT |
| cargo | bytemuck | 1.25.0 | Zlib OR Apache-2.0 OR MIT |
| cargo | byteorder | 1.5.0 | Unlicense OR MIT |
| cargo | byteorder-lite | 0.1.0 | Unlicense OR MIT |
| cargo | bytes | 1.11.1 | MIT |
| cargo | bzip2 | 0.5.2 | MIT OR Apache-2.0 |
| cargo | bzip2-sys | 0.1.13+1.0.8 | MIT/Apache-2.0 |
| cargo | cairo-rs | 0.18.5 | MIT |
| cargo | cairo-sys-rs | 0.18.2 | MIT |
| cargo | camino | 1.2.2 | MIT OR Apache-2.0 |
| cargo | cargo-platform | 0.1.9 | MIT OR Apache-2.0 |
| cargo | cargo_metadata | 0.19.2 | MIT |
| cargo | cargo_toml | 0.22.3 | Apache-2.0 OR MIT |
| cargo | cbc | 0.1.2 | MIT OR Apache-2.0 |
| cargo | cc | 1.4.6 | MIT OR Apache-2.0 |
| cargo | cesu8 | 1.1.0 | Apache-2.0/MIT |
| cargo | cfb | 0.7.3 | MIT |
| cargo | cfg-expr | 0.15.8 | MIT OR Apache-2.0 |
| cargo | cfg-if | 1.0.4 | MIT OR Apache-2.0 |
| cargo | cfg_aliases | 0.2.1 | MIT |
| cargo | chrono | 0.4.44 | MIT OR Apache-2.0 |
| cargo | cipher | 0.4.4 | MIT OR Apache-2.0 |
| cargo | clap | 4.6.1 | MIT OR Apache-2.0 |
| cargo | clap_builder | 4.6.0 | MIT OR Apache-2.0 |
| cargo | clap_derive | 4.6.1 | MIT OR Apache-2.0 |
| cargo | clap_lex | 1.1.0 | MIT OR Apache-2.0 |
| cargo | clipboard-win | 5.4.1 | BSL-1.0 |
| cargo | cmake | 0.1.58 | MIT OR Apache-2.0 |
| cargo | cms | 0.2.3 | Apache-2.0 OR MIT |
| cargo | colorchoice | 1.0.5 | MIT OR Apache-2.0 |
| cargo | combine | 4.6.7 | MIT |
| cargo | concurrent-queue | 2.5.0 | Apache-2.0 OR MIT |
| cargo | console_error_panic_hook | 0.1.7 | Apache-2.0/MIT |
| cargo | console_log | 1.0.0 | MIT/Apache-2.0 |
| cargo | const-oid | 0.9.6 | Apache-2.0 OR MIT |
| cargo | const-random | 0.1.18 | MIT OR Apache-2.0 |
| cargo | const-random-macro | 0.1.16 | MIT OR Apache-2.0 |
| cargo | constant_time_eq | 0.3.1 | CC0-1.0 OR MIT-0 OR Apache-2.0 |
| cargo | cookie | 0.18.1 | MIT OR Apache-2.0 |
| cargo | core-foundation | 0.10.1 | MIT OR Apache-2.0 |
| cargo | core-foundation | 0.9.4 | MIT OR Apache-2.0 |
| cargo | core-foundation-sys | 0.8.7 | MIT OR Apache-2.0 |
| cargo | core-graphics | 0.24.0 | MIT OR Apache-2.0 |
| cargo | core-graphics | 0.25.0 | MIT OR Apache-2.0 |
| cargo | core-graphics-types | 0.2.0 | MIT OR Apache-2.0 |
| cargo | cpufeatures | 0.2.17 | MIT OR Apache-2.0 |
| cargo | crc | 3.4.0 | MIT OR Apache-2.0 |
| cargo | crc-catalog | 2.5.0 | MIT OR Apache-2.0 |
| cargo | crc32fast | 1.5.0 | MIT OR Apache-2.0 |
| cargo | crossbeam-channel | 0.5.15 | MIT OR Apache-2.0 |
| cargo | crossbeam-deque | 0.8.6 | MIT OR Apache-2.0 |
| cargo | crossbeam-epoch | 0.9.18 | MIT OR Apache-2.0 |
| cargo | crossbeam-utils | 0.8.21 | MIT OR Apache-2.0 |
| cargo | crunchy | 0.2.4 | MIT |
| cargo | crypto-bigint | 0.5.5 | Apache-2.0 OR MIT |
| cargo | crypto-common | 0.1.7 | MIT OR Apache-2.0 |
| cargo | cssparser | 0.36.0 | MPL-2.0 |
| cargo | cssparser-macros | 0.6.1 | MPL-2.0 |
| cargo | ctor | 0.8.0 | Apache-2.0 OR MIT |
| cargo | ctor-proc-macro | 0.0.7 | Apache-2.0 OR MIT |
| cargo | darling | 0.23.0 | MIT |
| cargo | darling_core | 0.23.0 | MIT |
| cargo | darling_macro | 0.23.0 | MIT |
| cargo | dbus | 0.9.11 | Apache-2.0/MIT |
| cargo | deflate64 | 0.1.12 | MIT |
| cargo | der | 0.7.10 | Apache-2.0 OR MIT |
| cargo | der_derive | 0.7.3 | Apache-2.0 OR MIT |
| cargo | deranged | 0.5.8 | MIT OR Apache-2.0 |
| cargo | derive_arbitrary | 1.4.2 | MIT OR Apache-2.0 |
| cargo | derive_more | 2.1.1 | MIT |
| cargo | derive_more-impl | 2.1.1 | MIT |
| cargo | des | 0.8.1 | MIT OR Apache-2.0 |
| cargo | digest | 0.10.7 | MIT OR Apache-2.0 |
| cargo | dirs | 5.0.1 | MIT OR Apache-2.0 |
| cargo | dirs | 6.0.0 | MIT OR Apache-2.0 |
| cargo | dirs-sys | 0.4.1 | MIT OR Apache-2.0 |
| cargo | dirs-sys | 0.5.0 | MIT OR Apache-2.0 |
| cargo | dispatch2 | 0.3.1 | Zlib OR Apache-2.0 OR MIT |
| cargo | displaydoc | 0.2.5 | MIT OR Apache-2.0 |
| cargo | dlopen2 | 0.8.2 | MIT |
| cargo | dlopen2_derive | 0.4.3 | MIT |
| cargo | dlv-list | 0.5.2 | MIT OR Apache-2.0 |
| cargo | dom_query | 0.27.0 | MIT |
| cargo | downcast-rs | 1.2.1 | MIT/Apache-2.0 |
| cargo | dpi | 0.1.2 | Apache-2.0 AND MIT |
| cargo | drag | 2.1.1 | Apache-2.0 OR MIT |
| cargo | dtoa | 1.0.11 | MIT OR Apache-2.0 |
| cargo | dtoa-short | 0.3.5 | MPL-2.0 |
| cargo | dtor | 0.3.0 | Apache-2.0 OR MIT |
| cargo | dtor-proc-macro | 0.0.6 | Apache-2.0 OR MIT |
| cargo | dunce | 1.0.5 | CC0-1.0 OR MIT-0 OR Apache-2.0 |
| cargo | dyn-clone | 1.0.20 | MIT OR Apache-2.0 |
| cargo | ecdsa | 0.16.9 | Apache-2.0 OR MIT |
| cargo | either | 1.15.0 | MIT OR Apache-2.0 |
| cargo | elliptic-curve | 0.13.8 | Apache-2.0 OR MIT |
| cargo | embed-resource | 3.0.9 | MIT |
| cargo | embed_plist | 1.2.2 | MIT OR Apache-2.0 |
| cargo | encoding_rs | 0.8.35 | (Apache-2.0 OR MIT) AND BSD-3-Clause |
| cargo | endi | 1.1.1 | MIT |
| cargo | enumflags2 | 0.7.12 | MIT OR Apache-2.0 |
| cargo | enumflags2_derive | 0.7.12 | MIT OR Apache-2.0 |
| cargo | env_filter | 0.1.4 | MIT OR Apache-2.0 |
| cargo | equivalent | 1.0.2 | Apache-2.0 OR MIT |
| cargo | erased-serde | 0.4.10 | MIT OR Apache-2.0 |
| cargo | errno | 0.3.14 | MIT OR Apache-2.0 |
| cargo | error-code | 3.3.2 | BSL-1.0 |
| cargo | event-listener | 5.4.1 | Apache-2.0 OR MIT |
| cargo | event-listener-strategy | 0.5.4 | Apache-2.0 OR MIT |
| cargo | fastrand | 2.4.1 | Apache-2.0 OR MIT |
| cargo | fax | 0.2.7 | MIT |
| cargo | fdeflate | 0.3.7 | MIT OR Apache-2.0 |
| cargo | fern | 0.7.1 | MIT |
| cargo | ff | 0.13.1 | MIT/Apache-2.0 |
| cargo | field-offset | 0.3.6 | MIT OR Apache-2.0 |
| cargo | filetime | 0.2.29 | MIT/Apache-2.0 |
| cargo | find-msvc-tools | 0.1.12 | MIT OR Apache-2.0 |
| cargo | fixedbitset | 0.5.7 | MIT OR Apache-2.0 |
| cargo | flagset | 0.4.7 | Apache-2.0 |
| cargo | flate2 | 1.1.9 | MIT OR Apache-2.0 |
| cargo | fnv | 1.0.7 | Apache-2.0 / MIT |
| cargo | foldhash | 0.1.5 | Zlib |
| cargo | foldhash | 0.2.0 | Zlib |
| cargo | foreign-types | 0.5.0 | MIT/Apache-2.0 |
| cargo | foreign-types-macros | 0.2.3 | MIT/Apache-2.0 |
| cargo | foreign-types-shared | 0.3.1 | MIT/Apache-2.0 |
| cargo | form_urlencoded | 1.2.2 | MIT OR Apache-2.0 |
| cargo | fs_extra | 1.3.0 | MIT |
| cargo | funty | 2.0.0 | MIT |
| cargo | futures-channel | 0.3.32 | MIT OR Apache-2.0 |
| cargo | futures-core | 0.3.32 | MIT OR Apache-2.0 |
| cargo | futures-executor | 0.3.32 | MIT OR Apache-2.0 |
| cargo | futures-io | 0.3.32 | MIT OR Apache-2.0 |
| cargo | futures-lite | 2.6.1 | Apache-2.0 OR MIT |
| cargo | futures-macro | 0.3.32 | MIT OR Apache-2.0 |
| cargo | futures-sink | 0.3.32 | MIT OR Apache-2.0 |
| cargo | futures-task | 0.3.32 | MIT OR Apache-2.0 |
| cargo | futures-util | 0.3.32 | MIT OR Apache-2.0 |
| cargo | gcd | 2.3.0 | MIT/Apache-2.0 |
| cargo | gdk | 0.18.2 | MIT |
| cargo | gdk-pixbuf | 0.18.5 | MIT |
| cargo | gdk-pixbuf-sys | 0.18.0 | MIT |
| cargo | gdk-sys | 0.18.2 | MIT |
| cargo | gdkwayland-sys | 0.18.2 | MIT |
| cargo | gdkx11 | 0.18.2 | MIT |
| cargo | gdkx11-sys | 0.18.2 | MIT |
| cargo | generic-array | 0.14.7 | MIT |
| cargo | gethostname | 1.1.0 | Apache-2.0 |
| cargo | getrandom | 0.2.17 | MIT OR Apache-2.0 |
| cargo | getrandom | 0.3.4 | MIT OR Apache-2.0 |
| cargo | getrandom | 0.4.2 | MIT OR Apache-2.0 |
| cargo | gio | 0.18.4 | MIT |
| cargo | gio-sys | 0.18.1 | MIT |
| cargo | glib | 0.18.5 | MIT |
| cargo | glib-macros | 0.18.5 | MIT |
| cargo | glib-sys | 0.18.1 | MIT |
| cargo | glob | 0.3.3 | MIT OR Apache-2.0 |
| cargo | global-hotkey | 0.8.0 | Apache-2.0 OR MIT |
| cargo | gobject-sys | 0.18.0 | MIT |
| cargo | group | 0.13.0 | MIT/Apache-2.0 |
| cargo | gtk | 0.18.2 | MIT |
| cargo | gtk-sys | 0.18.2 | MIT |
| cargo | gtk3-macros | 0.18.2 | MIT |
| cargo | h2 | 0.4.19 | MIT |
| cargo | half | 2.7.1 | MIT OR Apache-2.0 |
| cargo | hashbrown | 0.12.3 | MIT OR Apache-2.0 |
| cargo | hashbrown | 0.14.5 | MIT OR Apache-2.0 |
| cargo | hashbrown | 0.15.5 | MIT OR Apache-2.0 |
| cargo | hashbrown | 0.17.1 | MIT OR Apache-2.0 |
| cargo | hayro-font | 0.4.0 | Apache-2.0 OR MIT |
| cargo | heck | 0.4.1 | MIT OR Apache-2.0 |
| cargo | heck | 0.5.0 | MIT OR Apache-2.0 |
| cargo | hermit-abi | 0.5.2 | MIT OR Apache-2.0 |
| cargo | hex | 0.4.3 | MIT OR Apache-2.0 |
| cargo | hmac | 0.12.1 | MIT OR Apache-2.0 |
| cargo | html5ever | 0.38.0 | MIT OR Apache-2.0 |
| cargo | http | 1.4.0 | MIT OR Apache-2.0 |
| cargo | http-body | 1.0.1 | MIT |
| cargo | http-body-util | 0.1.3 | MIT |
| cargo | httparse | 1.10.1 | MIT OR Apache-2.0 |
| cargo | httpdate | 1.0.3 | MIT OR Apache-2.0 |
| cargo | hyper | 1.9.0 | MIT |
| cargo | hyper-rustls | 0.27.9 | Apache-2.0 OR ISC OR MIT |
| cargo | hyper-util | 0.1.20 | MIT |
| cargo | iana-time-zone | 0.1.65 | MIT OR Apache-2.0 |
| cargo | iana-time-zone-haiku | 0.1.2 | MIT OR Apache-2.0 |
| cargo | ico | 0.5.0 | MIT |
| cargo | icu_collections | 2.2.0 | Unicode-3.0 |
| cargo | icu_locale_core | 2.2.0 | Unicode-3.0 |
| cargo | icu_normalizer | 2.2.0 | Unicode-3.0 |
| cargo | icu_normalizer_data | 2.2.0 | Unicode-3.0 |
| cargo | icu_properties | 2.2.0 | Unicode-3.0 |
| cargo | icu_properties_data | 2.2.0 | Unicode-3.0 |
| cargo | icu_provider | 2.2.0 | Unicode-3.0 |
| cargo | id-arena | 2.3.0 | MIT/Apache-2.0 |
| cargo | ident_case | 1.0.1 | MIT/Apache-2.0 |
| cargo | idna | 1.1.0 | MIT OR Apache-2.0 |
| cargo | idna_adapter | 1.2.2 | Apache-2.0 OR MIT |
| cargo | image | 0.25.10 | MIT OR Apache-2.0 |
| cargo | indexmap | 1.9.3 | Apache-2.0 OR MIT |
| cargo | indexmap | 2.14.0 | Apache-2.0 OR MIT |
| cargo | infer | 0.19.0 | MIT |
| cargo | inout | 0.1.4 | MIT OR Apache-2.0 |
| cargo | ipnet | 2.12.0 | MIT OR Apache-2.0 |
| cargo | is-docker | 0.2.0 | MIT |
| cargo | is-wsl | 0.4.0 | MIT |
| cargo | is_terminal_polyfill | 1.70.2 | MIT OR Apache-2.0 |
| cargo | itertools | 0.14.0 | MIT OR Apache-2.0 |
| cargo | itoa | 1.0.18 | MIT OR Apache-2.0 |
| cargo | javascriptcore-rs | 1.1.2 | MIT |
| cargo | javascriptcore-rs-sys | 1.1.1 | MIT |
| cargo | jni | 0.21.1 | MIT/Apache-2.0 |
| cargo | jni | 0.22.4 | MIT OR Apache-2.0 |
| cargo | jni-macros | 0.22.4 | MIT OR Apache-2.0 |
| cargo | jni-sys | 0.3.1 | MIT OR Apache-2.0 |
| cargo | jni-sys | 0.4.1 | MIT OR Apache-2.0 |
| cargo | jni-sys-macros | 0.4.1 | MIT OR Apache-2.0 |
| cargo | jobserver | 0.1.34 | MIT OR Apache-2.0 |
| cargo | js-sys | 0.3.98 | MIT OR Apache-2.0 |
| cargo | json-patch | 3.0.1 | MIT/Apache-2.0 |
| cargo | jsonptr | 0.6.3 | MIT OR Apache-2.0 |
| cargo | keyboard-types | 0.7.0 | MIT OR Apache-2.0 |
| cargo | keyring | 3.6.3 | MIT OR Apache-2.0 |
| cargo | lazy_static | 1.5.0 | MIT OR Apache-2.0 |
| cargo | leb128fmt | 0.1.0 | MIT OR Apache-2.0 |
| cargo | libappindicator | 0.9.0 | Apache-2.0 OR MIT |
| cargo | libappindicator-sys | 0.9.0 | Apache-2.0 OR MIT |
| cargo | libc | 0.2.186 | MIT OR Apache-2.0 |
| cargo | libdbus-sys | 0.2.7 | Apache-2.0/MIT |
| cargo | libloading | 0.7.4 | ISC |
| cargo | libloading | 0.8.9 | ISC |
| cargo | libloading | 0.9.0 | ISC |
| cargo | libm | 0.2.16 | MIT |
| cargo | libredox | 0.1.16 | MIT |
| cargo | linux-raw-sys | 0.12.1 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | litemap | 0.8.2 | Unicode-3.0 |
| cargo | lock_api | 0.4.14 | MIT OR Apache-2.0 |
| cargo | log | 0.4.29 | MIT OR Apache-2.0 |
| cargo | lopdf | 0.34.0 | MIT |
| cargo | lru-slab | 0.1.2 | MIT OR Apache-2.0 OR Zlib |
| cargo | lzma-rs | 0.3.0 | MIT |
| cargo | lzma-sys | 0.1.20 | MIT/Apache-2.0 |
| cargo | markup5ever | 0.38.0 | MIT OR Apache-2.0 |
| cargo | matchit | 0.8.4 | MIT AND BSD-3-Clause |
| cargo | maybe-owned | 0.3.4 | MIT OR Apache-2.0 |
| cargo | md-5 | 0.10.6 | MIT OR Apache-2.0 |
| cargo | memchr | 2.8.0 | Unlicense OR MIT |
| cargo | memmap2 | 0.9.10 | MIT OR Apache-2.0 |
| cargo | memoffset | 0.9.1 | MIT |
| cargo | mime | 0.3.17 | MIT OR Apache-2.0 |
| cargo | mime_guess | 2.0.5 | MIT |
| cargo | minimal-lexical | 0.2.1 | MIT/Apache-2.0 |
| cargo | minisign-verify | 0.2.5 | MIT |
| cargo | miniz_oxide | 0.8.9 | MIT OR Zlib OR Apache-2.0 |
| cargo | mio | 1.2.0 | MIT |
| cargo | moxcms | 0.8.1 | BSD-3-Clause OR Apache-2.0 |
| cargo | muda | 0.19.1 | Apache-2.0 OR MIT |
| cargo | ndk | 0.9.0 | MIT OR Apache-2.0 |
| cargo | ndk-sys | 0.6.0+11769913 | MIT OR Apache-2.0 |
| cargo | new_debug_unreachable | 1.0.6 | MIT |
| cargo | nix | 0.30.1 | MIT |
| cargo | nom | 7.1.3 | MIT |
| cargo | nom | 8.0.0 | MIT |
| cargo | num-bigint-dig | 0.8.6 | MIT/Apache-2.0 |
| cargo | num-conv | 0.2.2 | MIT OR Apache-2.0 |
| cargo | num-integer | 0.1.47 | MIT OR Apache-2.0 |
| cargo | num-iter | 0.1.46 | MIT OR Apache-2.0 |
| cargo | num-traits | 0.2.19 | MIT OR Apache-2.0 |
| cargo | num_enum | 0.7.6 | BSD-3-Clause OR MIT OR Apache-2.0 |
| cargo | num_enum_derive | 0.7.6 | BSD-3-Clause OR MIT OR Apache-2.0 |
| cargo | num_threads | 0.1.7 | MIT OR Apache-2.0 |
| cargo | objc2 | 0.6.4 | MIT |
| cargo | objc2-app-kit | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-cloud-kit | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-core-data | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-core-foundation | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-core-graphics | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-core-image | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-core-location | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-core-text | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-core-video | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-encode | 4.1.0 | MIT |
| cargo | objc2-exception-helper | 0.1.1 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-foundation | 0.3.2 | MIT |
| cargo | objc2-io-surface | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-osa-kit | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-quartz-core | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-ui-kit | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-user-notifications | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | objc2-web-kit | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| cargo | once_cell | 1.21.4 | MIT OR Apache-2.0 |
| cargo | once_cell_polyfill | 1.70.2 | MIT OR Apache-2.0 |
| cargo | open | 5.3.5 | MIT |
| cargo | openssl-probe | 0.2.1 | MIT OR Apache-2.0 |
| cargo | option-ext | 0.2.0 | MPL-2.0 |
| cargo | ordered-multimap | 0.7.3 | MIT |
| cargo | ordered-stream | 0.2.0 | MIT OR Apache-2.0 |
| cargo | os_info | 3.14.0 | MIT |
| cargo | os_pipe | 1.2.3 | MIT |
| cargo | osakit | 0.3.1 | MIT OR Apache-2.0 |
| cargo | p256 | 0.13.2 | Apache-2.0 OR MIT |
| cargo | p384 | 0.13.1 | Apache-2.0 OR MIT |
| cargo | pango | 0.18.3 | MIT |
| cargo | pango-sys | 0.18.0 | MIT |
| cargo | parking | 2.2.1 | Apache-2.0 OR MIT |
| cargo | parking_lot | 0.12.5 | MIT OR Apache-2.0 |
| cargo | parking_lot_core | 0.9.12 | MIT OR Apache-2.0 |
| cargo | pathdiff | 0.2.3 | MIT/Apache-2.0 |
| cargo | pbkdf2 | 0.12.2 | MIT OR Apache-2.0 |
| cargo | pdfium-render | 0.9.4 | MIT OR Apache-2.0 |
| cargo | pem-rfc7468 | 0.7.0 | Apache-2.0 OR MIT |
| cargo | percent-encoding | 2.3.2 | MIT OR Apache-2.0 |
| cargo | petgraph | 0.8.3 | MIT OR Apache-2.0 |
| cargo | phf | 0.13.1 | MIT |
| cargo | phf_codegen | 0.13.1 | MIT |
| cargo | phf_generator | 0.13.1 | MIT |
| cargo | phf_macros | 0.13.1 | MIT |
| cargo | phf_shared | 0.13.1 | MIT |
| cargo | pin-project-lite | 0.2.17 | Apache-2.0 OR MIT |
| cargo | piper | 0.2.5 | MIT OR Apache-2.0 |
| cargo | piston-float | 1.0.1 | MIT |
| cargo | pkcs1 | 0.7.5 | Apache-2.0 OR MIT |
| cargo | pkcs12 | 0.1.0 | Apache-2.0 OR MIT |
| cargo | pkcs5 | 0.7.1 | Apache-2.0 OR MIT |
| cargo | pkcs8 | 0.10.2 | Apache-2.0 OR MIT |
| cargo | pkg-config | 0.3.33 | MIT OR Apache-2.0 |
| cargo | plain | 0.2.3 | MIT/Apache-2.0 |
| cargo | plist | 1.9.0 | MIT |
| cargo | png | 0.17.16 | MIT OR Apache-2.0 |
| cargo | png | 0.18.1 | MIT OR Apache-2.0 |
| cargo | polling | 3.11.0 | Apache-2.0 OR MIT |
| cargo | potential_utf | 0.1.5 | Unicode-3.0 |
| cargo | powerfmt | 0.2.0 | MIT OR Apache-2.0 |
| cargo | ppv-lite86 | 0.2.21 | MIT OR Apache-2.0 |
| cargo | precomputed-hash | 0.1.1 | MIT |
| cargo | prettyplease | 0.2.37 | MIT OR Apache-2.0 |
| cargo | primeorder | 0.13.6 | Apache-2.0 OR MIT |
| cargo | proc-macro-crate | 1.3.1 | MIT OR Apache-2.0 |
| cargo | proc-macro-crate | 2.0.2 | MIT OR Apache-2.0 |
| cargo | proc-macro-crate | 3.5.0 | MIT OR Apache-2.0 |
| cargo | proc-macro-error | 1.0.4 | MIT OR Apache-2.0 |
| cargo | proc-macro-error-attr | 1.0.4 | MIT OR Apache-2.0 |
| cargo | proc-macro2 | 1.0.106 | MIT OR Apache-2.0 |
| cargo | ptr_meta | 0.1.4 | MIT |
| cargo | ptr_meta_derive | 0.1.4 | MIT |
| cargo | pxfm | 0.1.29 | BSD-3-Clause OR Apache-2.0 |
| cargo | quick-error | 2.0.1 | MIT/Apache-2.0 |
| cargo | quick-xml | 0.39.4 | MIT |
| cargo | quinn | 0.11.9 | MIT OR Apache-2.0 |
| cargo | quinn-proto | 0.11.14 | MIT OR Apache-2.0 |
| cargo | quinn-udp | 0.5.14 | MIT OR Apache-2.0 |
| cargo | quote | 1.0.45 | MIT OR Apache-2.0 |
| cargo | r-efi | 5.3.0 | MIT OR Apache-2.0 OR LGPL-2.1-or-later |
| cargo | r-efi | 6.0.0 | MIT OR Apache-2.0 OR LGPL-2.1-or-later |
| cargo | radium | 0.7.0 | MIT |
| cargo | rand | 0.8.6 | MIT OR Apache-2.0 |
| cargo | rand | 0.9.4 | MIT OR Apache-2.0 |
| cargo | rand_chacha | 0.3.1 | MIT OR Apache-2.0 |
| cargo | rand_chacha | 0.9.0 | MIT OR Apache-2.0 |
| cargo | rand_core | 0.6.4 | MIT OR Apache-2.0 |
| cargo | rand_core | 0.9.5 | MIT OR Apache-2.0 |
| cargo | rangemap | 1.7.1 | MIT/Apache-2.0 |
| cargo | raw-window-handle | 0.6.2 | MIT OR Apache-2.0 OR Zlib |
| cargo | rayon | 1.12.0 | MIT OR Apache-2.0 |
| cargo | rayon-core | 1.13.0 | MIT OR Apache-2.0 |
| cargo | rc2 | 0.8.1 | MIT OR Apache-2.0 |
| cargo | redox_syscall | 0.5.18 | MIT |
| cargo | redox_syscall | 0.7.5 | MIT |
| cargo | redox_users | 0.4.6 | MIT |
| cargo | redox_users | 0.5.2 | MIT |
| cargo | ref-cast | 1.0.25 | MIT OR Apache-2.0 |
| cargo | ref-cast-impl | 1.0.25 | MIT OR Apache-2.0 |
| cargo | regex | 1.12.3 | MIT OR Apache-2.0 |
| cargo | regex-automata | 0.4.14 | MIT OR Apache-2.0 |
| cargo | regex-syntax | 0.8.10 | MIT OR Apache-2.0 |
| cargo | rend | 0.4.2 | MIT |
| cargo | reqwest | 0.12.28 | MIT OR Apache-2.0 |
| cargo | reqwest | 0.13.5 | MIT OR Apache-2.0 |
| cargo | rfc6979 | 0.4.0 | Apache-2.0 OR MIT |
| cargo | rfd | 0.16.0 | MIT |
| cargo | ring | 0.17.14 | Apache-2.0 AND ISC |
| cargo | rkyv | 0.7.46 | MIT |
| cargo | rkyv_derive | 0.7.46 | MIT |
| cargo | rsa | 0.9.10 | MIT OR Apache-2.0 |
| cargo | rust-ini | 0.21.3 | MIT |
| cargo | rust_decimal | 1.42.0 | MIT |
| cargo | rustc-hash | 2.1.2 | Apache-2.0 OR MIT |
| cargo | rustc_version | 0.4.1 | MIT OR Apache-2.0 |
| cargo | rustix | 1.1.4 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | rustls | 0.23.40 | Apache-2.0 OR ISC OR MIT |
| cargo | rustls-native-certs | 0.8.3 | Apache-2.0 OR ISC OR MIT |
| cargo | rustls-pki-types | 1.14.1 | MIT OR Apache-2.0 |
| cargo | rustls-platform-verifier | 0.7.0 | MIT OR Apache-2.0 |
| cargo | rustls-platform-verifier-android | 0.1.1 | MIT OR Apache-2.0 |
| cargo | rustls-webpki | 0.103.13 | ISC |
| cargo | rustversion | 1.0.22 | MIT OR Apache-2.0 |
| cargo | ryu | 1.0.23 | Apache-2.0 OR BSL-1.0 |
| cargo | salsa20 | 0.10.2 | MIT OR Apache-2.0 |
| cargo | same-file | 1.0.6 | Unlicense/MIT |
| cargo | schannel | 0.1.29 | MIT |
| cargo | schemars | 0.8.22 | MIT |
| cargo | schemars | 0.9.0 | MIT |
| cargo | schemars | 1.2.1 | MIT |
| cargo | schemars_derive | 0.8.22 | MIT |
| cargo | scopeguard | 1.2.0 | MIT OR Apache-2.0 |
| cargo | scrypt | 0.11.0 | MIT OR Apache-2.0 |
| cargo | seahash | 4.1.0 | MIT |
| cargo | sec1 | 0.7.3 | Apache-2.0 OR MIT |
| cargo | security-framework | 3.7.0 | MIT OR Apache-2.0 |
| cargo | security-framework-sys | 2.17.0 | MIT OR Apache-2.0 |
| cargo | selectors | 0.36.1 | MPL-2.0 |
| cargo | semver | 1.0.28 | MIT OR Apache-2.0 |
| cargo | serde | 1.0.228 | MIT OR Apache-2.0 |
| cargo | serde-untagged | 0.1.9 | MIT OR Apache-2.0 |
| cargo | serde_core | 1.0.228 | MIT OR Apache-2.0 |
| cargo | serde_derive | 1.0.228 | MIT OR Apache-2.0 |
| cargo | serde_derive_internals | 0.29.1 | MIT OR Apache-2.0 |
| cargo | serde_json | 1.0.149 | MIT OR Apache-2.0 |
| cargo | serde_path_to_error | 0.1.20 | MIT OR Apache-2.0 |
| cargo | serde_repr | 0.1.20 | MIT OR Apache-2.0 |
| cargo | serde_spanned | 0.6.9 | MIT OR Apache-2.0 |
| cargo | serde_spanned | 1.1.1 | MIT OR Apache-2.0 |
| cargo | serde_urlencoded | 0.7.1 | MIT/Apache-2.0 |
| cargo | serde_with | 3.20.0 | MIT OR Apache-2.0 |
| cargo | serde_with_macros | 3.20.0 | MIT OR Apache-2.0 |
| cargo | serialize-to-javascript | 0.1.2 | MIT OR Apache-2.0 |
| cargo | serialize-to-javascript-impl | 0.1.2 | MIT OR Apache-2.0 |
| cargo | servo_arc | 0.4.3 | MIT OR Apache-2.0 |
| cargo | sha1 | 0.10.6 | MIT OR Apache-2.0 |
| cargo | sha2 | 0.10.9 | MIT OR Apache-2.0 |
| cargo | shared_child | 1.1.1 | MIT |
| cargo | shlex | 2.0.1 | MIT OR Apache-2.0 |
| cargo | sigchld | 0.2.4 | MIT |
| cargo | signal-hook | 0.3.18 | Apache-2.0/MIT |
| cargo | signal-hook-registry | 1.4.8 | MIT OR Apache-2.0 |
| cargo | signature | 2.2.0 | Apache-2.0 OR MIT |
| cargo | simd-adler32 | 0.3.9 | MIT |
| cargo | simd_cesu8 | 1.1.1 | Apache-2.0 OR MIT |
| cargo | simdutf8 | 0.1.5 | MIT OR Apache-2.0 |
| cargo | siphasher | 1.0.3 | MIT/Apache-2.0 |
| cargo | slab | 0.4.12 | MIT |
| cargo | smallvec | 1.15.1 | MIT OR Apache-2.0 |
| cargo | socket2 | 0.6.3 | MIT OR Apache-2.0 |
| cargo | softbuffer | 0.4.8 | MIT OR Apache-2.0 |
| cargo | soup3 | 0.5.0 | MIT |
| cargo | soup3-sys | 0.5.0 | MIT |
| cargo | spin | 0.9.9 | MIT |
| cargo | spki | 0.7.3 | Apache-2.0 OR MIT |
| cargo | stable_deref_trait | 1.2.1 | MIT OR Apache-2.0 |
| cargo | strict-num | 0.1.1 | MIT |
| cargo | string_cache | 0.9.0 | MIT OR Apache-2.0 |
| cargo | string_cache_codegen | 0.6.1 | MIT OR Apache-2.0 |
| cargo | strsim | 0.11.1 | MIT |
| cargo | subtle | 2.6.1 | BSD-3-Clause |
| cargo | swift-rs | 1.0.7 | MIT OR Apache-2.0 |
| cargo | syn | 1.0.109 | MIT OR Apache-2.0 |
| cargo | syn | 2.0.117 | MIT OR Apache-2.0 |
| cargo | sync_wrapper | 1.0.2 | Apache-2.0 |
| cargo | synstructure | 0.13.2 | MIT |
| cargo | sys-locale | 0.3.2 | MIT OR Apache-2.0 |
| cargo | system-configuration | 0.7.0 | MIT OR Apache-2.0 |
| cargo | system-configuration-sys | 0.6.0 | MIT OR Apache-2.0 |
| cargo | system-deps | 6.2.2 | MIT OR Apache-2.0 |
| cargo | tao | 0.35.2 | Apache-2.0 |
| cargo | tao-macros | 0.1.3 | MIT OR Apache-2.0 |
| cargo | tap | 1.0.1 | MIT |
| cargo | tar | 0.4.46 | MIT OR Apache-2.0 |
| cargo | target-lexicon | 0.12.16 | Apache-2.0 WITH LLVM-exception |
| cargo | tauri | 2.11.2 | Apache-2.0 OR MIT |
| cargo | tauri-build | 2.6.2 | Apache-2.0 OR MIT |
| cargo | tauri-codegen | 2.6.2 | Apache-2.0 OR MIT |
| cargo | tauri-macros | 2.6.2 | Apache-2.0 OR MIT |
| cargo | tauri-plugin | 2.6.2 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-clipboard-manager | 2.3.2 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-deep-link | 2.4.9 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-dialog | 2.7.1 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-drag | 2.1.1 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-fs | 2.5.1 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-global-shortcut | 2.3.2 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-log | 2.8.0 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-os | 2.3.2 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-process | 2.3.1 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-shell | 2.3.5 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-single-instance | 2.4.2 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-store | 2.4.3 | Apache-2.0 OR MIT |
| cargo | tauri-plugin-updater | 2.10.1 | Apache-2.0 OR MIT |
| cargo | tauri-runtime | 2.11.2 | Apache-2.0 OR MIT |
| cargo | tauri-runtime-wry | 2.11.2 | Apache-2.0 OR MIT |
| cargo | tauri-utils | 2.9.2 | Apache-2.0 OR MIT |
| cargo | tauri-winres | 0.3.6 | MIT |
| cargo | tempfile | 3.27.0 | MIT OR Apache-2.0 |
| cargo | tendril | 0.5.0 | MIT OR Apache-2.0 |
| cargo | tesseract-rs | 0.4.0 | MIT |
| cargo | thiserror | 1.0.69 | MIT OR Apache-2.0 |
| cargo | thiserror | 2.0.18 | MIT OR Apache-2.0 |
| cargo | thiserror-impl | 1.0.69 | MIT OR Apache-2.0 |
| cargo | thiserror-impl | 2.0.18 | MIT OR Apache-2.0 |
| cargo | tiff | 0.11.3 | MIT |
| cargo | time | 0.3.47 | MIT OR Apache-2.0 |
| cargo | time-core | 0.1.8 | MIT OR Apache-2.0 |
| cargo | time-macros | 0.2.27 | MIT OR Apache-2.0 |
| cargo | tiny-keccak | 2.0.2 | CC0-1.0 |
| cargo | tiny-skia | 0.11.4 | BSD-3-Clause |
| cargo | tiny-skia-path | 0.11.4 | BSD-3-Clause |
| cargo | tinystr | 0.8.3 | Unicode-3.0 |
| cargo | tinyvec | 1.11.0 | Zlib OR Apache-2.0 OR MIT |
| cargo | tinyvec_macros | 0.1.1 | MIT OR Apache-2.0 OR Zlib |
| cargo | tls_codec | 0.4.2 | Apache-2.0 OR MIT |
| cargo | tls_codec_derive | 0.4.2 | Apache-2.0 OR MIT |
| cargo | tokio | 1.52.3 | MIT |
| cargo | tokio-macros | 2.7.0 | MIT |
| cargo | tokio-rustls | 0.26.4 | MIT OR Apache-2.0 |
| cargo | tokio-util | 0.7.18 | MIT |
| cargo | toml | 0.8.2 | MIT OR Apache-2.0 |
| cargo | toml | 0.9.12+spec-1.1.0 | MIT OR Apache-2.0 |
| cargo | toml | 1.1.2+spec-1.1.0 | MIT OR Apache-2.0 |
| cargo | toml_datetime | 0.6.3 | MIT OR Apache-2.0 |
| cargo | toml_datetime | 0.7.5+spec-1.1.0 | MIT OR Apache-2.0 |
| cargo | toml_datetime | 1.1.1+spec-1.1.0 | MIT OR Apache-2.0 |
| cargo | toml_edit | 0.19.15 | MIT OR Apache-2.0 |
| cargo | toml_edit | 0.20.2 | MIT OR Apache-2.0 |
| cargo | toml_edit | 0.25.11+spec-1.1.0 | MIT OR Apache-2.0 |
| cargo | toml_parser | 1.1.2+spec-1.1.0 | MIT OR Apache-2.0 |
| cargo | toml_writer | 1.1.1+spec-1.1.0 | MIT OR Apache-2.0 |
| cargo | tower | 0.5.3 | MIT |
| cargo | tower-http | 0.6.11 | MIT |
| cargo | tower-layer | 0.3.3 | MIT |
| cargo | tower-service | 0.3.3 | MIT |
| cargo | tracing | 0.1.44 | MIT |
| cargo | tracing-attributes | 0.1.31 | MIT |
| cargo | tracing-core | 0.1.36 | MIT |
| cargo | tray-icon | 0.23.1 | MIT OR Apache-2.0 |
| cargo | tree_magic_mini | 3.2.2 | MIT |
| cargo | try-lock | 0.2.5 | MIT |
| cargo | ttf-parser | 0.25.1 | MIT OR Apache-2.0 |
| cargo | turbojpeg | 1.4.0 | Unlicense OR MIT |
| cargo | turbojpeg-sys | 1.1.1 | Unlicense OR MIT |
| cargo | typed-path | 0.12.3 | MIT OR Apache-2.0 |
| cargo | typeid | 1.0.3 | MIT OR Apache-2.0 |
| cargo | typenum | 1.20.0 | MIT OR Apache-2.0 |
| cargo | uds_windows | 1.2.1 | MIT |
| cargo | unic-char-property | 0.9.0 | MIT/Apache-2.0 |
| cargo | unic-char-range | 0.9.0 | MIT/Apache-2.0 |
| cargo | unic-common | 0.9.0 | MIT/Apache-2.0 |
| cargo | unic-ucd-ident | 0.9.0 | MIT/Apache-2.0 |
| cargo | unic-ucd-version | 0.9.0 | MIT/Apache-2.0 |
| cargo | unicase | 2.9.0 | MIT OR Apache-2.0 |
| cargo | unicode-ident | 1.0.24 | (MIT OR Apache-2.0) AND Unicode-3.0 |
| cargo | unicode-segmentation | 1.13.2 | MIT OR Apache-2.0 |
| cargo | unicode-xid | 0.2.6 | MIT OR Apache-2.0 |
| cargo | untrusted | 0.9.0 | ISC |
| cargo | url | 2.5.8 | MIT OR Apache-2.0 |
| cargo | urlencoding | 2.1.3 | MIT |
| cargo | urlpattern | 0.3.0 | MIT |
| cargo | utf-8 | 0.7.6 | MIT OR Apache-2.0 |
| cargo | utf16string | 0.2.0 | MIT OR Apache-2.0 |
| cargo | utf8-width | 0.1.8 | MIT |
| cargo | utf8_iter | 1.0.4 | Apache-2.0 OR MIT |
| cargo | utf8parse | 0.2.2 | Apache-2.0 OR MIT |
| cargo | uuid | 1.23.1 | Apache-2.0 OR MIT |
| cargo | value-bag | 1.12.0 | Apache-2.0 OR MIT |
| cargo | vecmath | 1.0.0 | MIT |
| cargo | version-compare | 0.2.1 | MIT |
| cargo | version_check | 0.9.5 | MIT/Apache-2.0 |
| cargo | vswhom | 0.1.0 | MIT |
| cargo | vswhom-sys | 0.1.3 | MIT |
| cargo | walkdir | 2.5.0 | Unlicense/MIT |
| cargo | want | 0.3.1 | MIT |
| cargo | wasi | 0.11.1+wasi-snapshot-preview1 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wasip2 | 1.0.3+wasi-0.2.9 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wasip3 | 0.4.0+wasi-0.3.0-rc-2026-01-06 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wasite | 0.1.0 | Apache-2.0 OR BSL-1.0 OR MIT |
| cargo | wasm-bindgen | 0.2.121 | MIT OR Apache-2.0 |
| cargo | wasm-bindgen-futures | 0.4.71 | MIT OR Apache-2.0 |
| cargo | wasm-bindgen-macro | 0.2.121 | MIT OR Apache-2.0 |
| cargo | wasm-bindgen-macro-support | 0.2.121 | MIT OR Apache-2.0 |
| cargo | wasm-bindgen-shared | 0.2.121 | MIT OR Apache-2.0 |
| cargo | wasm-encoder | 0.244.0 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wasm-metadata | 0.244.0 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wasm-streams | 0.5.0 | MIT OR Apache-2.0 |
| cargo | wasmparser | 0.244.0 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wayland-backend | 0.3.15 | MIT |
| cargo | wayland-client | 0.31.14 | MIT |
| cargo | wayland-protocols | 0.32.13 | MIT |
| cargo | wayland-protocols-wlr | 0.3.12 | MIT |
| cargo | wayland-scanner | 0.31.10 | MIT |
| cargo | wayland-sys | 0.31.11 | MIT |
| cargo | web-sys | 0.3.98 | MIT OR Apache-2.0 |
| cargo | web-time | 1.1.0 | MIT OR Apache-2.0 |
| cargo | web_atoms | 0.2.4 | MIT OR Apache-2.0 |
| cargo | webkit2gtk | 2.0.2 | MIT |
| cargo | webkit2gtk-sys | 2.0.2 | MIT |
| cargo | webpki-root-certs | 1.0.7 | CDLA-Permissive-2.0 |
| cargo | webpki-roots | 1.0.7 | CDLA-Permissive-2.0 |
| cargo | webview2-com | 0.38.2 | MIT |
| cargo | webview2-com-macros | 0.8.1 | MIT |
| cargo | webview2-com-sys | 0.38.2 | MIT |
| cargo | weezl | 0.1.12 | MIT OR Apache-2.0 |
| cargo | whoami | 1.6.1 | Apache-2.0 OR BSL-1.0 OR MIT |
| cargo | winapi | 0.3.9 | MIT/Apache-2.0 |
| cargo | winapi-i686-pc-windows-gnu | 0.4.0 | MIT/Apache-2.0 |
| cargo | winapi-util | 0.1.11 | Unlicense OR MIT |
| cargo | winapi-x86_64-pc-windows-gnu | 0.4.0 | MIT/Apache-2.0 |
| cargo | window-vibrancy | 0.6.0 | Apache-2.0 OR MIT |
| cargo | windows | 0.52.0 | MIT OR Apache-2.0 |
| cargo | windows | 0.61.3 | MIT OR Apache-2.0 |
| cargo | windows-collections | 0.2.0 | MIT OR Apache-2.0 |
| cargo | windows-core | 0.52.0 | MIT OR Apache-2.0 |
| cargo | windows-core | 0.58.0 | MIT OR Apache-2.0 |
| cargo | windows-core | 0.61.2 | MIT OR Apache-2.0 |
| cargo | windows-core | 0.62.2 | MIT OR Apache-2.0 |
| cargo | windows-future | 0.2.1 | MIT OR Apache-2.0 |
| cargo | windows-implement | 0.52.0 | MIT OR Apache-2.0 |
| cargo | windows-implement | 0.58.0 | MIT OR Apache-2.0 |
| cargo | windows-implement | 0.60.2 | MIT OR Apache-2.0 |
| cargo | windows-interface | 0.52.0 | MIT OR Apache-2.0 |
| cargo | windows-interface | 0.58.0 | MIT OR Apache-2.0 |
| cargo | windows-interface | 0.59.3 | MIT OR Apache-2.0 |
| cargo | windows-link | 0.1.3 | MIT OR Apache-2.0 |
| cargo | windows-link | 0.2.1 | MIT OR Apache-2.0 |
| cargo | windows-numerics | 0.2.0 | MIT OR Apache-2.0 |
| cargo | windows-registry | 0.5.3 | MIT OR Apache-2.0 |
| cargo | windows-result | 0.2.0 | MIT OR Apache-2.0 |
| cargo | windows-result | 0.3.4 | MIT OR Apache-2.0 |
| cargo | windows-result | 0.4.1 | MIT OR Apache-2.0 |
| cargo | windows-strings | 0.1.0 | MIT OR Apache-2.0 |
| cargo | windows-strings | 0.4.2 | MIT OR Apache-2.0 |
| cargo | windows-strings | 0.5.1 | MIT OR Apache-2.0 |
| cargo | windows-sys | 0.45.0 | MIT OR Apache-2.0 |
| cargo | windows-sys | 0.48.0 | MIT OR Apache-2.0 |
| cargo | windows-sys | 0.52.0 | MIT OR Apache-2.0 |
| cargo | windows-sys | 0.59.0 | MIT OR Apache-2.0 |
| cargo | windows-sys | 0.60.2 | MIT OR Apache-2.0 |
| cargo | windows-sys | 0.61.2 | MIT OR Apache-2.0 |
| cargo | windows-targets | 0.42.2 | MIT OR Apache-2.0 |
| cargo | windows-targets | 0.48.5 | MIT OR Apache-2.0 |
| cargo | windows-targets | 0.52.6 | MIT OR Apache-2.0 |
| cargo | windows-targets | 0.53.5 | MIT OR Apache-2.0 |
| cargo | windows-threading | 0.1.0 | MIT OR Apache-2.0 |
| cargo | windows-version | 0.1.7 | MIT OR Apache-2.0 |
| cargo | windows_aarch64_gnullvm | 0.42.2 | MIT OR Apache-2.0 |
| cargo | windows_aarch64_gnullvm | 0.48.5 | MIT OR Apache-2.0 |
| cargo | windows_aarch64_gnullvm | 0.52.6 | MIT OR Apache-2.0 |
| cargo | windows_aarch64_gnullvm | 0.53.1 | MIT OR Apache-2.0 |
| cargo | windows_aarch64_msvc | 0.42.2 | MIT OR Apache-2.0 |
| cargo | windows_aarch64_msvc | 0.48.5 | MIT OR Apache-2.0 |
| cargo | windows_aarch64_msvc | 0.52.6 | MIT OR Apache-2.0 |
| cargo | windows_aarch64_msvc | 0.53.1 | MIT OR Apache-2.0 |
| cargo | windows_i686_gnu | 0.42.2 | MIT OR Apache-2.0 |
| cargo | windows_i686_gnu | 0.48.5 | MIT OR Apache-2.0 |
| cargo | windows_i686_gnu | 0.52.6 | MIT OR Apache-2.0 |
| cargo | windows_i686_gnu | 0.53.1 | MIT OR Apache-2.0 |
| cargo | windows_i686_gnullvm | 0.52.6 | MIT OR Apache-2.0 |
| cargo | windows_i686_gnullvm | 0.53.1 | MIT OR Apache-2.0 |
| cargo | windows_i686_msvc | 0.42.2 | MIT OR Apache-2.0 |
| cargo | windows_i686_msvc | 0.48.5 | MIT OR Apache-2.0 |
| cargo | windows_i686_msvc | 0.52.6 | MIT OR Apache-2.0 |
| cargo | windows_i686_msvc | 0.53.1 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_gnu | 0.42.2 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_gnu | 0.48.5 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_gnu | 0.52.6 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_gnu | 0.53.1 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_gnullvm | 0.42.2 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_gnullvm | 0.48.5 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_gnullvm | 0.52.6 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_gnullvm | 0.53.1 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_msvc | 0.42.2 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_msvc | 0.48.5 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_msvc | 0.52.6 | MIT OR Apache-2.0 |
| cargo | windows_x86_64_msvc | 0.53.1 | MIT OR Apache-2.0 |
| cargo | winnow | 0.5.40 | MIT |
| cargo | winnow | 0.7.15 | MIT |
| cargo | winnow | 1.0.3 | MIT |
| cargo | winreg | 0.55.0 | MIT |
| cargo | wit-bindgen | 0.51.0 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wit-bindgen | 0.57.1 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wit-bindgen-core | 0.51.0 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wit-bindgen-rust | 0.51.0 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wit-bindgen-rust-macro | 0.51.0 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wit-component | 0.244.0 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wit-parser | 0.244.0 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |
| cargo | wl-clipboard-rs | 0.9.3 | MIT/Apache-2.0 |
| cargo | writeable | 0.6.3 | Unicode-3.0 |
| cargo | wry | 0.55.1 | Apache-2.0 OR MIT |
| cargo | wyz | 0.5.1 | MIT |
| cargo | x11 | 2.21.0 | MIT |
| cargo | x11-dl | 2.21.0 | MIT |
| cargo | x11rb | 0.13.2 | MIT OR Apache-2.0 |
| cargo | x11rb-protocol | 0.13.2 | MIT OR Apache-2.0 |
| cargo | x509-cert | 0.2.5 | Apache-2.0 OR MIT |
| cargo | xattr | 1.6.1 | MIT OR Apache-2.0 |
| cargo | xkeysym | 0.2.1 | MIT OR Apache-2.0 OR Zlib |
| cargo | xz2 | 0.1.7 | MIT/Apache-2.0 |
| cargo | yoke | 0.8.2 | Unicode-3.0 |
| cargo | yoke-derive | 0.8.2 | Unicode-3.0 |
| cargo | zbus | 5.15.0 | MIT |
| cargo | zbus_macros | 5.15.0 | MIT |
| cargo | zbus_names | 4.3.2 | MIT |
| cargo | zerocopy | 0.8.48 | BSD-2-Clause OR Apache-2.0 OR MIT |
| cargo | zerocopy-derive | 0.8.48 | BSD-2-Clause OR Apache-2.0 OR MIT |
| cargo | zerofrom | 0.1.8 | Unicode-3.0 |
| cargo | zerofrom-derive | 0.1.7 | Unicode-3.0 |
| cargo | zeroize | 1.8.2 | Apache-2.0 OR MIT |
| cargo | zeroize_derive | 1.4.3 | Apache-2.0 OR MIT |
| cargo | zerotrie | 0.2.4 | Unicode-3.0 |
| cargo | zerovec | 0.11.6 | Unicode-3.0 |
| cargo | zerovec-derive | 0.11.3 | Unicode-3.0 |
| cargo | zip | 2.4.2 | MIT |
| cargo | zip | 4.6.1 | MIT |
| cargo | zip | 8.6.0 | MIT |
| cargo | zlib-rs | 0.6.7 | Zlib |
| cargo | zmij | 1.0.21 | MIT |
| cargo | zopfli | 0.8.3 | Apache-2.0 |
| cargo | zstd | 0.13.3 | MIT |
| cargo | zstd-safe | 7.2.4 | MIT OR Apache-2.0 |
| cargo | zstd-sys | 2.0.16+zstd.1.5.7 | MIT/Apache-2.0 |
| cargo | zune-core | 0.5.1 | MIT OR Apache-2.0 OR Zlib |
| cargo | zune-jpeg | 0.5.15 | MIT OR Apache-2.0 OR Zlib |
| cargo | zvariant | 5.11.0 | MIT |
| cargo | zvariant_derive | 5.11.0 | MIT |
| cargo | zvariant_utils | 3.3.1 | MIT |
| npm | @babel/runtime | 7.28.6 | MIT |
| npm | @crabnebula/tauri-plugin-drag | 2.1.0 | UNKNOWN |
| npm | @napi-rs/canvas | 1.0.9 | MIT |
| npm | @napi-rs/canvas-android-arm64 | 1.0.9 | MIT |
| npm | @napi-rs/canvas-darwin-arm64 | 1.0.9 | MIT |
| npm | @napi-rs/canvas-darwin-x64 | 1.0.9 | MIT |
| npm | @napi-rs/canvas-linux-arm-gnueabihf | 1.0.9 | MIT |
| npm | @napi-rs/canvas-linux-arm64-gnu | 1.0.9 | MIT |
| npm | @napi-rs/canvas-linux-arm64-musl | 1.0.9 | MIT |
| npm | @napi-rs/canvas-linux-riscv64-gnu | 1.0.9 | MIT |
| npm | @napi-rs/canvas-linux-x64-gnu | 1.0.9 | MIT |
| npm | @napi-rs/canvas-linux-x64-musl | 1.0.9 | MIT |
| npm | @napi-rs/canvas-win32-arm64-msvc | 1.0.9 | MIT |
| npm | @napi-rs/canvas-win32-x64-msvc | 1.0.9 | MIT |
| npm | @pdf-lib/fontkit | 1.1.1 | MIT |
| npm | @pdf-lib/standard-fonts | 1.0.0 | MIT |
| npm | @pdf-lib/upng | 1.0.1 | MIT |
| npm | @tauri-apps/api | 2.11.0 | Apache-2.0 OR MIT |
| npm | @tauri-apps/plugin-dialog | 2.7.1 | MIT OR Apache-2.0 |
| npm | @tauri-apps/plugin-fs | 2.5.1 | MIT OR Apache-2.0 |
| npm | @tauri-apps/plugin-os | 2.3.2 | MIT OR Apache-2.0 |
| npm | @tauri-apps/plugin-process | 2.3.1 | MIT OR Apache-2.0 |
| npm | @tauri-apps/plugin-shell | 2.3.5 | MIT OR Apache-2.0 |
| npm | @tauri-apps/plugin-updater | 2.10.0 | MIT OR Apache-2.0 |
| npm | csstype | 3.2.3 | MIT |
| npm | i18next | 25.8.13 | MIT |
| npm | i18next-browser-languagedetector | 8.2.1 | MIT |
| npm | pako | 1.0.11 | (MIT AND Zlib) |
| npm | pdf-lib | 1.17.1 | MIT |
| npm | pdfjs-dist | 6.3.289 | Apache-2.0 |
| npm | seroval | 1.5.0 | MIT |
| npm | seroval-plugins | 1.5.0 | MIT |
| npm | solid-js | 1.9.11 | MIT |
| npm | tslib | 1.14.1 | 0BSD |
