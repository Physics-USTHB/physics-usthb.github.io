# Third-party notices — LaTeX Studio

## SwiftLaTeX pdfTeX WebAssembly engine

The browser compiler is derived from SwiftLaTeX and a small static-host compatibility patch maintained in `sean-reid/latex-preview`.

- SwiftLaTeX source: https://github.com/SwiftLaTeX/SwiftLaTeX
- Pinned integration source revision: https://github.com/sean-reid/latex-preview/commit/f80f84659c9476e41ef7212f6d753e10f6bd4af5
- Worker used here: `latex/vendor/swiftlatexpdftex.js`
- Upstream engine license: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
- Local license notice: `latex/vendor/swiftlatex.LICENSE.txt`

The worker is served by Physics USTHB. Its pinned WebAssembly binary and the curated TeX Live subset are fetched as static assets from the pinned upstream revision on `raw.githubusercontent.com`. LaTeX compilation itself occurs in the browser.

## TeX Live subset

The runtime package/font subset comes from the pinned `sean-reid/latex-preview` revision and contains TeX Live files under their respective upstream licenses, chiefly the LaTeX Project Public License and Knuth-family licenses. See that upstream repository for the harvested manifest and per-file provenance.

## JSZip

- Version 3.10.1
- Project: https://stuk.github.io/jszip/
- Purpose: project ZIP import/export
- License: MIT

## KaTeX

- Version 0.16.11
- Project: https://katex.org/
- Purpose: lightweight equation preview
- License: MIT
