import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('./index.html');
const js = read('./app.js');
const compiler = read('./compiler.js');
const css = read('./styles.css');
const home = read('../index.html');
const rootCss = read('../assets/home.css');
const privacy = read('../privacy.html');

new Script(js, {filename: 'latex/app.js'});
new Script(compiler.replace(/^export /gm, ''), {filename: 'latex/compiler.js'});
assert.ok(html.startsWith('<!doctype html>'), 'LaTeX Studio must be an HTML page');
assert.ok(home.includes('href="latex/"'), 'Homepage must link LaTeX Studio');
assert.ok(html.includes('src="app.js"'), 'Studio must load application script');
assert.ok(html.includes('src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"'), 'ZIP dependency missing');
assert.ok(html.includes('src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"'), 'KaTeX dependency missing');
assert.ok(html.includes('id="pdf-frame"'), 'Internal PDF preview missing');
assert.ok(html.includes('id="storage-details"'), 'Storage diagnostics missing');
assert.ok(!html.includes('latexonline.cc'), 'External compile service must not be used');
assert.match(compiler, /texlyre-busytex@1\.4\.1/, 'Pinned browser compiler dependency missing');
assert.match(compiler, /sourceUpload:\s*false/, 'Compiler privacy declaration missing');

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const referenced = [...js.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]);
for (const id of referenced) assert.ok(ids.has(id), 'Missing HTML element ID: ' + id);

const checks = [
  [/indexedDB\.open\(DB,1\)/, 'indexedDB storage'],
  [/FALLBACK_KEY/, 'localStorage persistence fallback'],
  [/BroadcastChannel/, 'cross-tab update handling'],
  [/import\('\.\/compiler\.js'\)/, 'browser compiler module'],
  [/navigator\.storage\.persist/, 'persistent storage request'],
  [/Object\.hasOwn/, 'safe filename lookup'],
  [/async function importZip/, 'ZIP import'],
  [/async function exportZip/, 'ZIP export'],
  [/TEXT\.test\(n\)\?'string':'uint8array'/, 'binary ZIP support'],
  [/MAX_ZIP|LIMIT = 50 \* 1024 \* 1024/, 'ZIP safety limit'],
  [/localStorage\.setItem\(ACTIVE/, 'restore current project'],
  [/katex\.render/, 'math preview']
];
for (const [pattern, label] of checks) assert.match(js, pattern, label);
assert.ok(css.includes('@media(max-width:650px)'), 'Workspace must have mobile layout');
assert.ok(rootCss.includes('.path-grid'), 'Homepage needs learning pathways styling');
assert.ok(rootCss.includes('@media(max-width:560px)'), 'Homepage needs mobile layout');
assert.ok(home.includes('href="electricity/"'), 'Homepage must link physics labs');
assert.ok(home.includes('href="#english"'), 'Homepage must link Scientific English');
assert.ok(home.includes('In development'), 'English availability must be clear');
assert.ok(home.includes('Not an official USTHB website'), 'Homepage must identify independent status');
assert.equal((home.match(/class="path-card"/g) || []).length, 3, 'Homepage must have three pathways');
assert.equal((home.match(/class="tp-card"/g) || []).length, 5, 'Homepage must link exactly five practicums');
for (const n of ['e01','e02','e03','e04','e05']) {
 assert.ok(home.includes('href="electricity/' + n + '/"'), 'Missing direct TP link ' + n);
}
assert.ok(home.includes('href="assets/home.css"'), 'Homepage must use isolated stylesheet');
assert.ok(home.includes('href="privacy.html"'), 'Homepage must link privacy page');
assert.ok(privacy.includes('Many students can therefore use'), 'Privacy page must explain simultaneous independent use');
assert.ok(privacy.includes('not persisted'), 'Privacy page must explain identity persistence policy');

for (const n of ['e01','e02','e03','e04','e05']) {
  const htmlPath = new URL('../electricity/' + n + '/index.html', import.meta.url);
  assert.ok(existsSync(htmlPath), 'Existing physics practical missing: ' + n);
  const labHtml = read('../electricity/' + n + '/index.html');
  assert.ok(labHtml.includes('id="clearLocalProgress"'), n + ' must offer clear-local-data control');
  assert.ok(labHtml.includes('name and group stay only in this open page'), n + ' must disclose identity policy');
  const scriptName = n === 'e03' ? 'official.js' : 'lab.js';
  const labJs = read('../electricity/' + n + '/' + scriptName);
  new Script(labJs, {filename: n + '/' + scriptName});
  assert.doesNotMatch(labJs, /const ids=\['studentName','studentGroup','reportDate','reportDiscussion','reportConclusion'\]/, n + ' must not persist identity fields');
  assert.match(labJs, /localStorage\.removeItem\(STORAGE\)/, n + ' must clear its own local progress');
}
const e01 = read('../electricity/e01/lab.js');
assert.match(e01, /x\?\.version===2/, 'TP1 must reload the same state version it saves');
console.log('LaTeX Studio smoke checks passed: JS syntax, DOM references, resilient storage, local compiler wiring, privacy UI, homepage links, and TP persistence.');
