# Physics USTHB — LaTeX Studio (first release)

A local-first scientific writing workspace at `/latex/` within the existing GitHub Pages repository.

> **Independent educational resource.** Not affiliated with or endorsed by USTHB. **Not yet a complete Prism replacement.** First release awaiting review and merge.

## Working capabilities

- Create, rename, switch, duplicate and delete LaTeX projects.
- Scientific-article, physics-laboratory-report, Beamer and minimal LaTeX templates.
- Edit and download `.tex`, `.bib`, `.sty` and other text files; select the main `.tex` with ★.
- Local project autosaving in browser **IndexedDB**; also an explicit Save button.
- Import project ZIPs (source, bibliography, images and other assets) and individual files.
- Export portable project ZIP backups or download one source file.
- Line-numbered editor, Tab indentation, equation/section insertion, keyboard shortcuts.
- Optional KaTeX math preview (shows first display equation, **not a compiled PDF**).
- Opt-in short **single-file remote PDF compilation** via [LaTeX.Online](https://latexonline.cc/).
- Link to [TeXlyre](https://texlyre.github.io/texlyre/) for advanced multi-file compilation and collaboration on an **external** site.

## Privacy and limitations

- Projects stay in this browser/device: **there is no cloud account or GitHub save yet**. Clearing site data, private browsing, or changing device may lose them. Export ZIP backups often.
- **Compile PDF sends your LaTeX source to a third-party provider in a URL**, only after explicit confirmation. Contents may appear in browser/server URL logs. Never send confidential or unpublished research using that option. Local editing, saving and ZIP import/export do not send source to a compile provider.
- The online compilation integration only supports short stand-alone documents. Includes, bibliography files, image assets and long source files are not supported in this compilation path. Use a TeX Live installation or TeXlyre for those.
- Math preview is not a typeset full document and shows just one display equation. It falls back to raw text when KaTeX is unavailable.
- Prism ZIP migration preserves underlying source and assets, **not** project history, comments, permissions, collaborators or connected accounts. Exports containing multiple separate projects may need to be split into project ZIPs.
- JSZip and KaTeX load from an external CDN and need an initial network connection.
- No API keys or GitHub personal access tokens are requested or stored.

## Migrating from Prism

1. Export projects from Prism Data Controls before its shutdown on **January 1, 2027** ([OpenAI migration guide](https://help.openai.com/en/articles/20001615-prism-to-codex-migration-guide)).
2. Choose **Import ZIP / files** from the studio sidebar.
3. Verify the file tree and ★ main TeX document.
4. Export another project ZIP and store it outside your browser.
5. Compile larger projects via TeXlyre or a local TeX distribution.

## Files and tests

- `index.html` — interface and navigation.
- `styles.css` — responsive design.
- `app.js` — local-first application logic.
- `test.mjs` — no-dependency static smoke checks.

From repository root run `node latex/test.mjs`. Then perform browser manual checks for project persistence, editing, ZIP round-trip, PDF-compilation consent, mobile layout, and all existing electricity modules.

No existing practical (E01–E05) is changed in this pull request.

## Planned next iterations

1. Integrate a **browser-based WebAssembly TeX engine** and real PDF pane with pinned dependencies and package-size testing; this is *not* available in v1.
2. Improve syntax highlighting, autocomplete, diagnostics and recursive folder navigation.
3. Add optional private GitHub-backed storage using a secure OAuth approach without exposing tokens in GitHub Pages.
4. Add optional AI and collaboration services only after privacy, costs and access controls are designed.

## Third-party acknowledgements

[JSZip](https://stuk.github.io/jszip/) v3.10.1 (MIT), [KaTeX](https://katex.org/) (MIT), [LaTeX.Online](https://github.com/aslushnikov/latex-online) remote compile service; [TeXlyre](https://github.com/TeXlyre/texlyre) AGPL-3.0, linked externally and not bundled.
