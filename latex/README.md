# Physics USTHB — LaTeX Studio

A privacy-oriented, local-first scientific writing workspace at `/latex/`.

> Independent educational resource. Not affiliated with or endorsed by USTHB. This release is intended for individual scientific writing; real-time shared editing is a separate future feature.

## Current capabilities

- Multiple LaTeX projects: create, rename, switch, duplicate and delete.
- Article, physics laboratory report, Beamer and minimal templates.
- Multi-file projects with text sources, bibliography files and binary assets.
- Project ZIP import/export, including the source files from Prism ZIP exports.
- Browser-local autosave, explicit Save, storage diagnostics and a request for persistent browser storage.
- IndexedDB primary storage with a localStorage fallback when IndexedDB is unavailable.
- Cross-tab notifications to reduce accidental overwrites when the same project is open twice in one browser profile.
- Local PDF preview and PDF download.
- **Browser-local WebAssembly compilation** using TeXlyre BusyTeX 1.4.1 / TeX Live 2026:
  - pdfLaTeX
  - XeLaTeX
  - LuaLaTeX
  - multi-file input
  - BibTeX when detected
  - multiple passes for references
- KaTeX quick preview for the first display equation.

## Compilation and privacy

Compilation occurs on the visitor's device. LaTeX project source is not intentionally sent to a remote compilation API.

The TeX engine is large, so the browser downloads pinned engine/package assets from TeXlyre/GitHub release infrastructure and the JavaScript integration package from jsDelivr. Those hosts receive normal web-request metadata (for example IP address, user agent and requested asset), but `compiler.js` does not send them the project source.

The first compile can therefore be a large download. TeXlyre documents roughly 32 MB of WASM plus TeX Live data packages ranging from about 90 MB upward depending on package set. Subsequent loads can benefit from normal browser/IndexedDB caches.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for compiler and UI dependency licenses.

## Saving model

Projects are stored by the browser, not by a Physics USTHB account:

1. IndexedDB is preferred.
2. If IndexedDB is unavailable, the editor falls back to localStorage.
3. If neither persistent storage mechanism is available, the UI clearly reports memory-only mode and ZIP export is required to preserve the work.

The editor keeps the existing database name from the previous release so previously saved IndexedDB projects remain discoverable after this upgrade.

The **Protect local storage** button calls the browser's Storage Persistence API when supported. This can reduce automatic browser eviction, but it is not a substitute for backups. Use **Export project ZIP** for portable copies.

## Multiple users

Many people can use the published website at the same time. GitHub Pages serves static application files, and every visitor runs an independent editor in their own browser. One visitor's local projects are not loaded into another visitor's browser.

This is different from **real-time co-editing of the same project**. Shared editing is not enabled in this release. A future collaboration mode should be explicitly opt-in and should use an architecture such as encrypted/peer-to-peer or carefully scoped collaborative documents rather than making all local projects centrally visible.

On a shared computer, two people using the same browser profile are **not isolated from one another**. Use separate browser/OS profiles or clear local projects after exporting them.

## Prism migration

1. Export Prism projects before its shutdown on **January 1, 2027**.
2. Select **Import ZIP / files**.
3. Verify the imported file list and mark the correct main `.tex` file with ★.
4. Compile in the browser.
5. Export a fresh ZIP backup.

Source files and assets can be imported; Prism-specific history, comments, permissions, collaborators and connected accounts are not recreated.

## Files

- `index.html` — editor, PDF viewer, storage/privacy controls.
- `styles.css` — responsive workspace design.
- `app.js` — project model, persistence, ZIP operations, compile UI.
- `compiler.js` — pinned browser-local BusyTeX integration.
- `test.mjs` — structural and privacy/persistence smoke checks.
- `THIRD_PARTY_NOTICES.md` — dependency notices.

## Remaining work

- Browser end-to-end testing across Chrome, Firefox and Safari, especially the large WASM compiler download and engine initialization.
- Better syntax highlighting/autocomplete and line-aware compilation diagnostics.
- SyncTeX editor ↔ PDF navigation.
- Optional real-time collaboration with an explicit privacy model.
- Optional account/cloud synchronization only if there is a clear need and a defined access/retention policy.

The root [privacy page](../privacy.html) describes the data model for both LaTeX Studio and the physics practicums.
