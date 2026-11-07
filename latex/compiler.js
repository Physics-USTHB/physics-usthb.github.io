// Browser-local LaTeX compilation. Project source stays in this browser.
// Engine wrapper is loaded lazily; TeX Live runtime assets are fetched as static files only.
const MODULE_URL = 'https://cdn.jsdelivr.net/npm/texlyre-busytex@1.4.1/+esm';
const ASSET_BASE = 'https://github.com/TeXlyre/texlyre-busytex-build/releases/download/build_wasm_46ebb6216a5c1fe63dd1dc885831d1a8cef2dc86_31802832436_1';

let apiPromise;
const runners = new Map();

async function api() {
  if (!apiPromise) apiPromise = import(MODULE_URL);
  return apiPromise;
}

function engineMode(engine) {
  return engine === 'xelatex' ? 'xetex' : engine === 'lualatex' ? 'luahbtex' : 'pdftex';
}

function needsExtra(source) {
  return /\\documentclass(?:\[[^\]]*\])?\{beamer\}|\\usepackage(?:\[[^\]]*\])?\{[^}]*(?:booktabs|tikz|pgfplots|physics|siunitx|mathtools|minted|listings|biblatex)[^}]*\}/i.test(source);
}

async function getRunner(engine, onStatus = () => {}) {
  const key = engineMode(engine);
  if (runners.has(key)) return runners.get(key);
  onStatus('Loading browser LaTeX engine… first use downloads the WebAssembly runtime.');
  const { BusyTexRunner } = await api();
  const runner = new BusyTexRunner({
    busytexBasePath: ASSET_BASE,
    engineMode: key,
    preloadDataPackages: [
      ASSET_BASE + '/texlive-basic.js',
      ASSET_BASE + '/texlive-recommended.js'
    ],
    catalogDataPackages: [
      ASSET_BASE + '/texlive-extra.js'
    ],
    verbose: false
  });
  // Main-thread initialization avoids cross-origin Worker restrictions on GitHub Pages.
  // Compilation is local; the tradeoff is that large builds may briefly make the UI less responsive.
  await runner.initialize(false);
  runners.set(key, runner);
  return runner;
}

export async function compileProject({ engine = 'pdflatex', main, files, onStatus = () => {} }) {
  if (!main || typeof files?.[main] !== 'string') throw new Error('Choose a text .tex file as the main document.');
  if (!globalThis.WebAssembly) throw new Error('This browser does not support WebAssembly.');

  const source = files[main];
  const runner = await getRunner(engine, onStatus);
  const { PdfLatex, XeLatex, LuaLatex } = await api();
  const Compiler = engine === 'xelatex' ? XeLatex : engine === 'lualatex' ? LuaLatex : PdfLatex;
  const latex = new Compiler(runner);

  const additionalFiles = Object.entries(files)
    .filter(([name]) => name !== main)
    .map(([path, content]) => ({ path, content }));

  const hasBib = additionalFiles.some(file => /\.bib$/i.test(file.path));
  const usesBibtex = hasBib && /\\bibliography\s*\{|\\bibliographystyle\s*\{/i.test(source);
  const options = {
    input: source,
    additionalFiles,
    bibtex: usesBibtex,
    rerun: true,
    verbose: 'silent'
  };
  if (needsExtra(source)) options.dataPackagesJs = [ASSET_BASE + '/texlive-extra.js'];

  onStatus('Compiling locally in your browser… no document source is uploaded.');
  const result = await latex.compile(options);
  if (!result.success || !result.pdf) {
    const error = new Error('LaTeX compilation failed.');
    error.log = result.log || '';
    throw error;
  }
  return { pdf: result.pdf, log: result.log || '', synctex: result.synctex || null };
}

export function compilerPrivacySummary() {
  return {
    sourceUpload: false,
    compileLocation: 'browser',
    dependencyHosts: ['cdn.jsdelivr.net', 'github.com / GitHub release assets'],
    note: 'Dependency hosts receive ordinary asset requests and IP/network metadata, but this module does not transmit LaTeX project contents.'
  };
}
