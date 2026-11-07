/* Physics USTHB LaTeX Studio — local-first editor with verified persistence and browser-local PDF compilation. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const DB = 'physics-usthb-latex-v1', STORE = 'projects', ACTIVE = 'physics-usthb-latex-active';
const FALLBACK_KEY = 'physics-usthb-latex-fallback-v2';
const TEXT = /\.(tex|bib|sty|cls|bst|txt|md|cfg|def|bbx|cbx|lua|csv|json|xml|eps)$/i;
const LIMIT = 50 * 1024 * 1024;
const templates = {
article: String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{amsmath,amssymb,graphicx}
\title{An Introduction to Scientific Writing}
\author{Your Name}
\date{\today}
\begin{document}
\maketitle
\begin{abstract}
Write a concise summary of the aim, methods and results.
\end{abstract}
\section{Introduction}
A measured quantity can be expressed with its uncertainty.
\section{Method}
Describe the experimental or theoretical approach.
\section{Results}
\[
R=\frac{U}{I}.
\]
\section{Conclusion}
Summarise the main result and its limitations.
\end{document}
`,
lab: String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{amsmath,amssymb}
\title{Physics Laboratory Report}
\author{Student: Your Name \\ Group: Your Group}
\date{\today}
\begin{document}
\maketitle
\section{Objectives}
State the aim of the practical.
\section{Apparatus and method}
List the apparatus, circuit configuration, measurement ranges and procedure.
\section{Measurements}
\begin{center}
\begin{tabular}{ccc}
\hline
Voltage (V) & Current (A) & Resistance ($\Omega$)\\
\hline
2.0 & 0.10 & 20.0\\
4.0 & 0.20 & 20.0\\
\hline
\end{tabular}
\end{center}
\section{Analysis and uncertainties}
\[
R=\frac{U}{I},
\qquad
\frac{\Delta R}{R}\approx\frac{\Delta U}{U}+\frac{\Delta I}{I}.
\]
Discuss instrument limits and compare with theory.
\section{Conclusion}
Explain what the results demonstrate.
\end{document}
`,
report: String.raw`\documentclass[11pt,a4paper]{report}
\usepackage{amsmath,amssymb,graphicx}
\title{Scientific Report}
\author{Your Name}
\date{\today}
\begin{document}
\maketitle
\chapter{Introduction}
State the problem and objectives.
\chapter{Method}
Describe the method and apparatus.
\chapter{Results}
\[
E = mc^2
\]
\chapter{Conclusion}
Summarise the findings and limitations.
\end{document}
`,
blank: String.raw`\documentclass{article}
\begin{document}
Hello, LaTeX!
\end{document}
`
};

let db = null, storageMode = 'memory', projects = [], current = null, activeFile = 'main.tex';
let dirty = false, saveTimer = null, previewTimer = null, pendingAction = null;
let compiledPdf = null, pdfUrl = null, compiling = false;
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('physics-usthb-latex-v2') : null;

const stamp = () => new Date().toISOString();
const uid = () => globalThis.crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2);
const cleanName = s => s.replace(/[^a-zA-Z0-9._ -]/g,'_').replace(/^\.+/,'').slice(0,90) || 'project';
const safePath = s => {
  if (!s || s.includes('\\') || s.startsWith('/') || s.length > 220) return null;
  const a = s.split('/');
  if (a.some(p=> p === '..' || p === '' || ['__proto__','prototype','constructor'].includes(p))) return null;
  return a.filter(p=>p!=='.').join('/');
};
const inform = s => { $('status').textContent = s; };
const fail = e => { console.error(e); inform('Error: '+(e?.message || e)); };
const fileNames = () => Object.keys(current?.files || {}).sort((a,b)=>a.localeCompare(b));

function u8ToB64(bytes) {
  let out = '';
  const chunk = 0x8000;
  for (let i=0;i<bytes.length;i+=chunk) out += String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(out);
}
function b64ToU8(value) {
  const binary = atob(value), bytes = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function encodeProject(p) {
  const files = {};
  for (const [name,value] of Object.entries(p.files || {})) files[name] =
    typeof value === 'string' ? {kind:'text',value} : {kind:'binary',value:u8ToB64(value)};
  return {id:p.id,name:p.name,files,main:p.main,updated:p.updated};
}
function decodeProject(p) {
  const files = {};
  for (const [name,item] of Object.entries(p.files || {})) files[name] =
    item?.kind === 'binary' ? b64ToU8(item.value) : (item?.value ?? '');
  return {id:p.id,name:p.name,files,main:p.main,updated:p.updated};
}
function fallbackRead() {
  try { return JSON.parse(localStorage.getItem(FALLBACK_KEY)||'[]').map(decodeProject); }
  catch (_) { return []; }
}
function fallbackWrite(list) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(list.map(encodeProject)));
}
function openDb() {
 return new Promise((res,rej) => {
   const r = indexedDB.open(DB,1);
   r.onupgradeneeded = () => r.result.createObjectStore(STORE,{keyPath:'id'});
   r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
   r.onblocked = () => rej(new Error('Browser database is blocked by another tab.'));
 });
}
function idbOperation(mode, method, value) {
 return new Promise((res,rej) => {
   const tx = db.transaction(STORE,mode), s = tx.objectStore(STORE);
   const r = method==='getAll' ? s.getAll() :
     method==='delete' ? s.delete(value) :
     method==='clear' ? s.clear() : s.put(value);
   r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); tx.onerror=()=>rej(tx.error);
 });
}
async function store(mode, method, value) {
  if (storageMode === 'indexeddb') return idbOperation(mode,method,value);
  if (storageMode === 'localStorage') {
    let list = fallbackRead();
    if (method === 'getAll') return list;
    if (method === 'put') {
      const i = list.findIndex(x=>x.id===value.id);
      if (i>=0) list[i]=value; else list.push(value);
      fallbackWrite(list); return value;
    }
    if (method === 'delete') { list=list.filter(x=>x.id!==value); fallbackWrite(list); return; }
    if (method === 'clear') { localStorage.removeItem(FALLBACK_KEY); return; }
  }
  if (method === 'getAll') return projects;
  return value;
}
function copy(p){ return {id:p.id,name:p.name,files:{...p.files},main:p.main,updated:p.updated}; }
function makeProject(name,type='article'){
 return {id:uid(),name:name.trim().slice(0,80)||'Untitled document',files:{'main.tex':templates[type]||templates.article},main:'main.tex',updated:stamp()};
}
async function initialiseStorage() {
  try {
    db = await openDb();
    storageMode = 'indexeddb';
    return await store('readonly','getAll');
  } catch (idbError) {
    console.warn('IndexedDB unavailable, using localStorage fallback', idbError);
    try {
      localStorage.setItem('__latex_storage_test__','1'); localStorage.removeItem('__latex_storage_test__');
      storageMode = 'localStorage';
      return await store('readonly','getAll');
    } catch (localError) {
      console.warn('Persistent browser storage unavailable', localError);
      storageMode = 'memory';
      return [];
    }
  }
}
async function updateStorageDetails() {
  const modeText = storageMode === 'indexeddb' ? 'IndexedDB' : storageMode === 'localStorage' ? 'localStorage fallback' : 'memory only';
  let extra = '';
  try {
    if (navigator.storage?.estimate) {
      const {usage=0,quota=0} = await navigator.storage.estimate();
      extra = ' · '+(usage/1048576).toFixed(1)+' MB used of '+(quota/1048576).toFixed(0)+' MB available';
    }
    if (navigator.storage?.persisted) extra += (await navigator.storage.persisted()) ? ' · persistent storage granted' : ' · storage may be evicted by the browser';
  } catch (_) {}
  $('storage-details').textContent = 'Storage: '+modeText+extra+'.';
}
function markDirty(){
 dirty=true; $('dirty-indicator').textContent='Unsaved'; $('dirty-indicator').style.color='#f6bc83';
 clearTimeout(saveTimer); saveTimer=setTimeout(()=>save().catch(fail),500);
}
async function save(){
 if(!current)return;
 clearTimeout(saveTimer);
 current.updated=stamp();
 if (storageMode !== 'memory') await store('readwrite','put',copy(current));
 dirty=false;$('dirty-indicator').textContent=storageMode==='memory'?'Not persisted':'Saved locally';$('dirty-indicator').style.color=storageMode==='memory'?'#f6bc83':'';
 inform(storageMode==='memory'?'Browser storage is unavailable. Export a ZIP to keep your work.':'Saved locally · '+new Date().toLocaleTimeString());
 channel?.postMessage({type:'saved',id:current.id,updated:current.updated});
 updateStorageDetails();
}
function renderProjects(){
 const s=$('project-select');s.replaceChildren();
 projects.sort((a,b)=>b.updated.localeCompare(a.updated));
 for(const p of projects){const o=document.createElement('option');o.value=p.id;o.textContent=p.name;s.append(o);}
 if(current)s.value=current.id;
}
function renderFiles(){
 const l=$('file-list');l.replaceChildren();
 for(const n of fileNames()){
   const li=document.createElement('li');if(n===activeFile)li.className='selected';
   const button=document.createElement('button');button.type='button';button.className='file-select';
   button.textContent=(typeof current.files[n]==='string'?'◇  ':'▣  ')+n;button.title=n;
   button.onclick=()=>selectFile(n);li.append(button);
   if(/\.tex$/i.test(n)){
     const b=document.createElement('button');b.type='button';
     b.className='main-toggle'+(n===current.main?' active':'');
     b.title=n===current.main?'Main file':'Set as main .tex file';
     b.setAttribute('aria-label',b.title);b.textContent=n===current.main?'★':'☆';
     b.onclick=()=>{current.main=n;markDirty();renderFiles();inform('Main document: '+n);};
     li.append(b);
   }
   l.append(li);
 }
}
function updateMetrics(){
 const t=$('source').value, lines=t.split('\n').length;
 $('line-numbers').textContent=Array.from({length:lines},(_,i)=>i+1).join('\n');
 $('line-numbers').scrollTop=$('source').scrollTop;
 $('editor-count').textContent=lines+' lines · '+t.length+' characters';
}
function mathPreview(){
 const t=$('source').value, m=t.match(/\\\[([\s\S]*?)\\\]/) || t.match(/\$\$([\s\S]*?)\$\$/) ||
   t.match(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/);
 const target=$('math-preview');target.replaceChildren();
 if(!m){ const s=document.createElement('span');s.className='muted';s.textContent='Add an equation using \\[ ... \\]';target.append(s);return; }
 if(window.katex){try{window.katex.render(m[1],target,{displayMode:true,throwOnError:false,trust:false});return;}catch(e){console.warn(e);}}
 target.textContent=m[1].trim();
}
function selectFile(n){
 if(!current || !Object.hasOwn(current.files,n))return;
 activeFile=n;const value=current.files[n],binary=typeof value!=='string';
 $('source').hidden=binary;$('binary-message').hidden=!binary;$('line-numbers').hidden=binary;
 $('source').value=binary?'':value;$('active-file-label').textContent=n;
 $('editor-mode').textContent=binary?'Binary asset':/\.bib$/i.test(n)?'BibTeX source':'Text source';
 renderFiles();updateMetrics();mathPreview();
}
async function activate(id){
 if(current && dirty)await save();
 current=projects.find(p=>p.id===id);
 if(!current)return;
 try{localStorage.setItem(ACTIVE,id);}catch(_){}
 activeFile=Object.hasOwn(current.files,current.main)?current.main:fileNames()[0];
 renderProjects();selectFile(activeFile);inform('Editing '+current.name+' · '+(storageMode==='memory'?'temporary session':'local browser storage'));
}
async function addProject(p){
 projects.push(p);
 if(storageMode!=='memory')await store('readwrite','put',copy(p));
 await activate(p.id);
}
function insert(text,offset=0){
 if(!current || typeof current.files[activeFile]!=='string')return;
 const el=$('source');el.focus();const begin=el.selectionStart;
 el.setRangeText(text,begin,el.selectionEnd,'end');
 el.selectionStart=el.selectionEnd=begin+text.length+offset;
 el.dispatchEvent(new Event('input'));
}
function ask(title,message,action){
 pendingAction=action;$('confirm-title').textContent=title;
 $('confirm-text').textContent=message;$('confirm-dialog').showModal();
}
function zipLib(){if(!window.JSZip)throw new Error('ZIP library unavailable. Check your connection and reload.');return new JSZip();}
function download(name,content){
 const url=URL.createObjectURL(content),a=document.createElement('a');
 a.href=url;a.download=cleanName(name);document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function exportZip(){
 if(!current)return;await save();
 const z=zipLib();
 for(const n of fileNames())z.file(n,current.files[n]);
 z.file('PHYSICS-USTHB-README.txt','LaTeX Studio export\nProject: '+current.name+'\nMain: '+current.main+'\nDate: '+stamp()+'\n');
 const blob=await z.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
 download(cleanName(current.name)+'.zip',blob);inform('Project ZIP exported. Keep a backup outside this browser.');
}
async function importZip(file){
 if(file.size>LIMIT)throw new Error('ZIP exceeds the 50 MB safety limit.');
 const z=await zipLib().loadAsync(file);
 const entries=Object.values(z.files).filter(e=>!e.dir && !e.name.startsWith('__MACOSX/'));
 if(!entries.length || entries.length>300)throw new Error('ZIP must contain between 1 and 300 files.');
 const first=entries[0].name.split('/')[0];
 const prefix=entries.every(e=>e.name.startsWith(first+'/'))?first+'/':'';
 const files={};let total=0;
 for(const e of entries){
   if(e._data?.uncompressedSize > LIMIT || total + (e._data?.uncompressedSize || 0) > LIMIT)
     throw new Error('Uncompressed ZIP content exceeds the 50 MB safety limit.');
   const n=safePath(e.name.slice(prefix.length));
   if(!n || n==='PHYSICS-USTHB-README.txt')continue;
   const value=await e.async(TEXT.test(n)?'string':'uint8array');
   total+=typeof value==='string'?new TextEncoder().encode(value).length:value.byteLength;
   if(total>LIMIT)throw new Error('Uncompressed contents exceed the 50 MB safety limit.');
   files[n]=value;
 }
 const names=Object.keys(files);
 if(!names.length)throw new Error('ZIP has no importable files.');
 const main=names.find(n=>/(^|\/)main\.tex$/i.test(n))||names.find(n=>/\.tex$/i.test(n))||names[0];
 await addProject({id:uid(),name:file.name.replace(/\.zip$/i,'').slice(0,80),files,main,updated:stamp()});
 inform('ZIP imported locally. Confirm the ★ main file and compile.');
}
async function importFiles(input){
 for(const file of [...input]){
   if(/\.zip$/i.test(file.name)){await importZip(file);continue;}
   if(file.size>LIMIT)throw new Error(file.name+' exceeds 50 MB.');
   const n=safePath(file.name);if(!n)continue;
   const value=TEXT.test(n)?await file.text():new Uint8Array(await file.arrayBuffer());
   if(Object.hasOwn(current.files,n) && !confirm('Replace '+n+'?'))continue;
   current.files[n]=value;
   if(/\.tex$/i.test(n) && !/\.tex$/i.test(current.main))current.main=n;
   activeFile=n;markDirty();
 }
 await save();selectFile(activeFile);inform('Files imported locally.');
}
function setCompileBusy(value) {
  compiling=value;
  for(const id of ['compile','compile-side']) { const b=$(id); if(b){b.disabled=value;b.textContent=value?'Compiling…':(id==='compile'?'Compile PDF':'Compile locally');} }
}
function setPdf(pdfBytes, log='') {
  if(pdfUrl) URL.revokeObjectURL(pdfUrl);
  compiledPdf = new Blob([pdfBytes],{type:'application/pdf'});
  pdfUrl = URL.createObjectURL(compiledPdf);
  $('pdf-frame').src=pdfUrl;$('pdf-frame').hidden=false;$('pdf-empty').hidden=true;
  $('download-pdf').disabled=false;$('compile-log').textContent=log||'Compilation succeeded.';
}
async function compile(){
 if(!current || compiling)return;
 if(typeof current.files[current.main]!=='string' || !/\.tex$/i.test(current.main)){inform('Choose a text .tex file as the ★ main document.');return;}
 setCompileBusy(true);$('compile-log').textContent='Starting browser-local compiler…';
 try{
   await save();
   const module=await import('./compiler.js');
   const result=await module.compileProject({engine:$('engine').value,main:current.main,files:current.files,onStatus:inform});
   setPdf(result.pdf,result.log);
   inform('PDF compiled locally in this browser. Document source was not uploaded.');
 }catch(e){
   console.error(e);
   $('compile-log').textContent=(e.log?e.log+'\n\n':'')+(e.stack||e.message||String(e));
   inform('Compilation failed — open the compilation log for details.');
 }finally{setCompileBusy(false);}
}
async function requestPersistentStorage() {
  if(!navigator.storage?.persist){inform('This browser does not provide the persistent-storage API. Use ZIP exports for durable backups.');return;}
  try{
    const granted=await navigator.storage.persist();
    inform(granted?'Browser granted persistent local storage.':'Browser did not grant persistent storage; ZIP backups remain recommended.');
    await updateStorageDetails();
  }catch(e){fail(e);}
}
async function clearLocalProjects() {
  await store('readwrite','clear');
  try{localStorage.removeItem(ACTIVE);}catch(_){}
  projects=[];current=null;dirty=false;
  await addProject(makeProject('My first scientific article'));
  renderProjects();inform('Local projects cleared. A new blank workspace was created.');
}
function wire(){
 $('source').oninput=()=>{
   if(!current)return;current.files[activeFile]=$('source').value;markDirty();updateMetrics();
   clearTimeout(previewTimer);previewTimer=setTimeout(mathPreview,200);
 };
 $('source').onscroll=()=>$('line-numbers').scrollTop=$('source').scrollTop;
 $('source').onkeydown=e=>{
   if(e.key==='Tab'){e.preventDefault();insert('  ');}
   if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();compile();}
 };
 document.addEventListener('keydown',e=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save().catch(fail);}
 });
 $('project-select').onchange=e=>activate(e.target.value).catch(fail);
 $('new-project').onclick=()=>{$('project-name').value='Untitled document';$('new-dialog').showModal();$('project-name').select();};
 $('cancel-create').onclick=()=>$('new-dialog').close();
 $('create-form').onsubmit=e=>{e.preventDefault();$('new-dialog').close();
   addProject(makeProject($('project-name').value,$('template-select').value)).catch(fail);};
 $('rename-project').onclick=()=>{
   const n=prompt('Rename project',current.name);if(!n?.trim())return;
   current.name=n.trim().slice(0,80);markDirty();renderProjects();
 };
 $('duplicate-project').onclick=()=>addProject({...copy(current),id:uid(),name:current.name+' (copy)',updated:stamp()}).catch(fail);
 $('delete-project').onclick=()=>{
   if(projects.length<=1){inform('Create a second project before deleting this one.');return;}
   const id=current.id;
   ask('Delete project permanently?','This removes "'+current.name+'" from this browser. Export a ZIP first.',()=>{
     (async()=>{clearTimeout(saveTimer);dirty=false;if(storageMode!=='memory')await store('readwrite','delete',id);
       projects=projects.filter(p=>p.id!==id);current=null;await activate(projects[0].id);inform('Project deleted locally.');})().catch(fail);
   });
 };
 $('new-file').onclick=()=>{
   const r=prompt('New file path (e.g. sections/results.tex)','notes.tex');
   if(!r)return;const n=safePath(r.trim());
   if(!n||Object.hasOwn(current.files,n)){inform('Invalid or duplicate path.');return;}
   current.files[n]='';markDirty();selectFile(n);
 };
 $('rename-file').onclick=()=>{
   const r=prompt('Rename file',activeFile);if(!r||r===activeFile)return;
   const n=safePath(r.trim());
   if(!n||Object.hasOwn(current.files,n)){inform('Invalid or duplicate path.');return;}
   current.files[n]=current.files[activeFile];delete current.files[activeFile];
   if(current.main===activeFile)current.main=n;
   markDirty();selectFile(n);
 };
 $('delete-file').onclick=()=>{
   if(fileNames().length<=1){inform('Keep at least one file in the project.');return;}
   const n=activeFile;
   ask('Delete file?','Remove "'+n+'" from this project?',()=>{
     delete current.files[n];
     if(current.main===n)current.main=fileNames().find(x=>/\.tex$/i.test(x))||fileNames()[0];
     markDirty();selectFile(current.main);
   });
 };
 $('import-project').onclick=()=>$('import-input').click();
 $('import-input').onchange=e=>importFiles(e.target.files).catch(fail).finally(()=>{e.target.value='';});
 $('export-project').onclick=()=>exportZip().catch(fail);
 $('download-file').onclick=()=>{
   const data=current.files[activeFile];
   download(activeFile,new Blob([data],{type:typeof data==='string'?'text/plain;charset=utf-8':'application/octet-stream'}));
 };
 $('save-project').onclick=()=>save().catch(fail);
 $('insert-equation').onclick=()=>insert('\n\\[\n  E = mc^2\n\\]\n',-4);
 $('insert-section').onclick=()=>insert('\n\\section{New section}\n');
 $('compile').onclick=compile;$('compile-side').onclick=compile;
 $('download-pdf').onclick=()=>{if(compiledPdf)download(cleanName(current.name)+'.pdf',compiledPdf);};
 $('persist-storage').onclick=requestPersistentStorage;
 $('clear-local-data').onclick=()=>ask('Clear all local LaTeX projects?','This deletes every LaTeX Studio project saved by this browser. Export important projects first.',()=>clearLocalProjects().catch(fail));
 $('confirm-cancel').onclick=()=>{pendingAction=null;$('confirm-dialog').close();};
 $('confirm-form').onsubmit=e=>{e.preventDefault();$('confirm-dialog').close();const fn=pendingAction;pendingAction=null;if(fn)fn();};
 $('confirm-dialog').addEventListener('close',()=>{pendingAction=null;});
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty)save().catch(()=>{});});
 channel?.addEventListener('message', async event=>{
   const msg=event.data;
   if(msg?.type!=='saved'||!current||msg.id!==current.id)return;
   if(dirty){inform('This project changed in another tab. Save/export before refreshing to avoid overwriting it.');return;}
   try{
     const all=await store('readonly','getAll');
     const newer=all.find(p=>p.id===current.id);
     if(newer&&newer.updated>current.updated){
       const index=projects.findIndex(p=>p.id===newer.id);if(index>=0)projects[index]=newer;
       current=newer;selectFile(Object.hasOwn(newer.files,activeFile)?activeFile:newer.main);
       inform('Updated from another browser tab.');
     }
   }catch(e){console.warn(e);}
 });
}
async function boot(){
 wire();
 projects=await initialiseStorage();
 if(!projects.length)await addProject(makeProject('My first scientific article'));
 else {
   let active=null;try{active=localStorage.getItem(ACTIVE);}catch(_){}
   await activate(projects.find(p=>p.id===active)?.id||projects[0].id);
 }
 await updateStorageDetails();
 inform(storageMode==='memory'?'Ready, but persistent storage is unavailable — export ZIP backups.':'Ready — autosave is active in this browser.');
}
boot().catch(e=>{fail(e);alert('LaTeX Studio could not start: '+(e?.message||e));});
})();