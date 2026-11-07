// Browser-local pdfLaTeX compilation using a pinned SwiftLaTeX WebAssembly worker.
// Project source remains in the browser. Engine/package assets are fetched as static files only.
const UPSTREAM_COMMIT = 'f80f84659c9476e41ef7212f6d753e10f6bd4af5';
const TEXLIVE_ENDPOINT =
  'https://raw.githubusercontent.com/sean-reid/latex-preview/' +
  UPSTREAM_COMMIT + '/public/texlive/';
const WORKER_URL = new URL('./vendor/swiftlatexpdftex.js', import.meta.url);

const RERUN = /Label\(s\) may have changed|Rerun to get |Table widths have changed\. Rerun|There were undefined references|Citation .* undefined/;
let enginePromise;
let queue = Promise.resolve();

class PdfTeXEngine {
  constructor() { this.worker = null; this.ready = false; }

  async load() {
    if (this.worker) return;
    const worker = new Worker(WORKER_URL);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('pdfLaTeX engine startup timed out.')), 60000);
      worker.onmessage = event => {
        if (event.data?.result === 'ok' && !event.data?.cmd) {
          clearTimeout(timeout);
          this.ready = true;
          resolve();
        }
      };
      worker.onerror = event => {
        clearTimeout(timeout);
        reject(new Error(event.message || 'Could not load the local pdfLaTeX engine.'));
      };
    }).catch(error => { worker.terminate(); throw error; });
    worker.onmessage = null;
    worker.onerror = null;
    this.worker = worker;
    this.worker.postMessage({cmd:'settexliveurl', url:TEXLIVE_ENDPOINT});
  }

  ensureReady() {
    if (!this.worker || !this.ready) throw new Error('pdfLaTeX engine is not ready.');
  }
  resetProject() { this.ensureReady(); this.worker.postMessage({cmd:'flushcache'}); }
  mkdir(path) { this.ensureReady(); this.worker.postMessage({cmd:'mkdir', url:path}); }
  write(path, content) { this.ensureReady(); this.worker.postMessage({cmd:'writefile', url:path, src:content}); }
  setMain(path) { this.ensureReady(); this.worker.postMessage({cmd:'setmainfile', url:path}); }

  compileOnce() {
    this.ensureReady();
    return new Promise(resolve => {
      const worker = this.worker;
      worker.onmessage = event => {
        const data = event.data || {};
        if (data.cmd !== 'compile') return;
        worker.onmessage = null;
        resolve({
          success: data.result === 'ok' && data.status === 0 && !!data.pdf,
          status: data.status ?? -254,
          log: data.log || 'No compiler log.',
          pdf: data.pdf ? new Uint8Array(data.pdf) : null
        });
      };
      worker.postMessage({cmd:'compilelatex'});
    });
  }
}

function getEngine(onStatus) {
  if (!enginePromise) {
    enginePromise = (async () => {
      onStatus?.('Loading the local pdfLaTeX engine…');
      const engine = new PdfTeXEngine();
      await engine.load();
      return engine;
    })().catch(error => { enginePromise = null; throw error; });
  }
  return enginePromise;
}

function projectFolders(files) {
  const folders = new Set();
  for (const name of Object.keys(files)) {
    const parts = name.split('/');
    parts.pop();
    let current = '';
    for (const part of parts) {
      current = current ? current + '/' + part : part;
      folders.add(current);
    }
  }
  return [...folders].sort((a,b) => a.split('/').length - b.split('/').length);
}

function serializeCompile(task) {
  const run = queue.then(task, task);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

export function compileProject({engine='pdflatex', main, files, onStatus=()=>{}}) {
  return serializeCompile(async () => {
    if (engine !== 'pdflatex') throw new Error('This release currently supports pdfLaTeX only.');
    if (!globalThis.WebAssembly || !globalThis.Worker) throw new Error('This browser lacks WebAssembly or Web Worker support.');
    if (!main || typeof files?.[main] !== 'string') throw new Error('Choose a text .tex file as the main document.');

    const tex = await getEngine(onStatus);
    tex.resetProject();
    for (const folder of projectFolders(files)) tex.mkdir(folder);
    for (const [path, content] of Object.entries(files)) tex.write(path, content);
    tex.setMain(main);

    const source = files[main];
    const bibliography = /\\bibliography\s*\{|\\bibliographystyle\s*\{/.test(source) &&
      Object.keys(files).some(name => /\.bib$/i.test(name));
    let result;
    for (let pass=0; pass<3; pass++) {
      onStatus('Compiling locally in this browser… pass ' + (pass+1));
      result = await tex.compileOnce();
      if (!result.success) break;
      if (!bibliography && !RERUN.test(result.log)) break;
    }
    if (!result?.success || !result.pdf) {
      const error = new Error('LaTeX compilation failed.');
      error.log = result?.log || 'No compiler log.';
      throw error;
    }
    return {pdf:result.pdf, log:result.log};
  });
}

export function compilerPrivacySummary() {
  return {
    sourceUpload:false,
    compileLocation:'browser',
    engine:'SwiftLaTeX pdfTeX WebAssembly',
    pinnedUpstreamCommit:UPSTREAM_COMMIT,
    dependencyHost:'raw.githubusercontent.com',
    note:'The dependency host receives normal asset requests/network metadata. Project source is written only into the browser WebAssembly filesystem.'
  };
}
