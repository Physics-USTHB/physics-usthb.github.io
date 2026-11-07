# Physics USTHB — LaTeX Studio

A privacy-oriented, local-first scientific writing workspace at `/latex/`.

> Independent educational resource. Not affiliated with or endorsed by USTHB. The current release is designed for independent scientific writing; real-time shared editing is a separate future feature.

## Current capabilities

- Multiple projects: create, rename, switch, duplicate and delete.
- Article, physics-laboratory-report, technical-report and minimal templates.
- Multi-file project storage with text sources and binary assets.
- ZIP import/export, including source files from Prism exports.
- Browser-local autosave, explicit Save, storage diagnostics and optional persistent-storage request.
- IndexedDB primary storage with localStorage fallback.
- Cross-tab warnings to reduce accidental overwrites.
- Internal PDF preview and PDF download.
- **Browser-local pdfLaTeX compilation** through a WebAssembly SwiftLaTeX engine.
- A pinned, curated TeX package/font subset suitable for common scientific and physics documents (including AMS math, geometry, booktabs, graphicx, physics, siunitx v2, hyperref, natbib and related packages).
- KaTeX quick preview for the first display equation.

## Compilation and privacy

The pdfTeX program runs on the visitor's own device. Project source is copied into the browser WebAssembly filesystem and is not intentionally uploaded to a compilation API.

The engine wrapper and TeX package subset are pinned to upstream revision `f80f84659c9476e41ef7212f6d753e10f6bd4af5`. Runtime binary/package assets are fetched from GitHub's raw static-file host. That host receives ordinary web-request metadata such as IP address, user agent and requested asset path, but the editor does not include document source in those requests.

The current verified engine is **pdfLaTeX only**. XeLaTeX, LuaLaTeX, Biber and arbitrary shell commands are not advertised in this release. The curated package tree is intentionally smaller than a full TeX Live installation; an unsupported package will produce a normal LaTeX compilation error rather than sending the document to another compiler.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licenses.

## Saving model

Projects are browser-local:

1. IndexedDB is preferred.
2. localStorage is used as a fallback when IndexedDB is unavailable.
3. If neither can persist, the UI reports memory-only mode and ZIP export is required.

The editor retains the original IndexedDB database name so projects created by the first release remain discoverable after the upgrade.

The **Protect local storage** button asks the browser for persistent-storage treatment when supported. This reduces eviction risk but does not replace backups. Use **Export project ZIP** for portable copies.

## Multiple users

Many students can use the published website simultaneously: GitHub Pages serves static files, and each visitor runs an independent editor in their own browser. One person's local project is not loaded into another person's browser.

That is different from **real-time co-editing of one project**. Same-project collaboration is not enabled yet. When added, it should be explicit/opt-in and use a privacy-preserving collaboration design rather than turning every local project into centrally stored data.

A shared browser profile is not a private boundary. On a public/shared computer, export needed work and use **Clear local projects**, or use a separate browser/OS profile.

## Prism migration

1. Export Prism projects before January 1, 2027.
2. Choose **Import ZIP / files**.
3. Verify files and mark the main `.tex` file with ★.
4. Compile locally.
5. Export a fresh ZIP backup.

Prism-specific history, comments, permissions and collaborator state are not recreated.

## Verification

`latex/test.mjs` checks application syntax, persistence/privacy wiring and TP privacy controls. `latex/browser-test.mjs` is a real Chromium test that writes a document, saves it, reloads it, compiles it in-browser and requires the PDF preview to appear before the pull request can be merged.

## Remaining work

- Verify Safari and Firefox manually in addition to Chromium CI.
- Better syntax highlighting/autocomplete and line-aware errors.
- More TeX packages and additional engines only after browser tests exist for them.
- SyncTeX source ↔ PDF navigation.
- Optional real-time collaboration with a defined privacy/signaling model.
