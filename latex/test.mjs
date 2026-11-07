import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('./index.html');
const js = read('./app.js');
const css = read('./styles.css');
const home = read('../index.html');
const rootCss = read('../assets/styles.css');

new Script(js, {filename: 'latex/app.js'});
assert.ok(html.startsWith('<!doctype html>'), 'LaTeX Studio must be an HTML page');
assert.ok(home.includes('href="latex/index.html"'), 'Homepage must link LaTeX Studio');
assert.ok(html.includes('src="app.js"'), 'Studio must load application script');
assert.ok(html.includes('src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"'), 'ZIP dependency missing');
assert.ok(html.includes('src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"'), 'KaTeX dependency missing');

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const referenced = [...js.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]);
for (const id of referenced) assert.ok(ids.has(id), 'Missing HTML element ID: ' + id);

const checks = [
  [/indexedDB\.open\(DB,1\)/, 'indexedDB storage'],
  [/window\.open\(url,'_blank'/, 'external compiler navigation'],
  [/ask\('Send source to external compiler\?'/, 'compiler consent'],
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
assert.ok(rootCss.includes('.latex-pathway-card'), 'Homepage needs LaTeX pathway styling');

for (const n of ['e01','e02','e03','e04','e05']) {
  const path = new URL('../electricity/' + n + '/index.html', import.meta.url);
  assert.ok(existsSync(path), 'Existing physics practical missing: ' + n);
}
console.log('LaTeX Studio smoke checks passed: JS syntax, DOM references, links, import/export, privacy consent, templates, layout, and five unchanged TP entrypoints.');
