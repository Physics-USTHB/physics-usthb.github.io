import fs from "node:fs";
import vm from "node:vm";

const root=process.cwd();
const read=p=>fs.readFileSync(root+"/"+p,"utf8");
const assert=(c,m)=>{if(!c)throw new Error(m)};

function loadWindow(path,key){
  const sandbox={window:{}};
  vm.createContext(sandbox);
  new vm.Script(read(path),{filename:path}).runInContext(sandbox);
  return sandbox.window[key];
}

const data=loadWindow("tutorials/geometrical-optics/td-data.js","OPTICS_TUTORIAL_DATA");
const audit=loadWindow("tutorials/geometrical-optics/td-audit.js","OPTICS_TUTORIAL_AUDIT");
const visualCode=read("tutorials/geometrical-optics/td-visuals.js");
const appCode=read("tutorials/geometrical-optics/td.js");
new vm.Script(visualCode,{filename:"td-visuals.js"});
new vm.Script(appCode,{filename:"td.js"});

assert(data.series.length===6,"Expected six chapters");
assert(Object.keys(data.conventions||{}).length===6,"Every chapter needs an USTHB convention card");
const ids=data.questions.map(q=>q.id), qset=new Set(ids), seriesSet=new Set(data.series.map(s=>s.id));
assert(qset.size===ids.length,"Duplicate question IDs found");
for(const q of data.questions){
  assert(q.id&&q.series&&q.theory&&q.title&&q.prompt,"Missing required fields in "+(q.id||"(no id)"));
  assert(seriesSet.has(q.series),"Unknown series in "+q.id);
  assert(data.theories[q.theory],"Unknown theory block in "+q.id);
  assert(Array.isArray(q.solution)&&q.solution.length,"Missing worked solution in "+q.id);
  if(q.kind==="numeric")assert(Number.isFinite(q.answer)&&Number.isFinite(q.tol),"Invalid numeric checker "+q.id);
  else if(q.kind==="mcq")assert(Array.isArray(q.options)&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.options.length,"Invalid MCQ "+q.id);
  else if(q.kind==="multi")assert(Array.isArray(q.options)&&Array.isArray(q.correct)&&q.correct.length&&q.correct.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length),"Invalid multi-select "+q.id);
  else assert(q.kind==="manual","Unknown question kind "+q.kind+" in "+q.id);
  assert(!("hints" in q),"Legacy hint field found in "+q.id);
}

const sourceIds=new Set((audit.sources||[]).map(s=>s.id));
for(const [qid,refs] of Object.entries(audit.exactQuestionSources||{})){
  assert(qset.has(qid),"Source map references missing "+qid);
  for(const [sid] of refs)assert(sourceIds.has(sid),qid+" references missing source "+sid);
}
const openStatuses=new Set(["partial","statement-not-recovered","statement-figure-not-fully-recovered"]);
for(const sheet of audit.sheets||[]){
  assert(sourceIds.has(sheet.sourceId),"Sheet "+sheet.id+" has missing source");
  let open=0;
  for(const ex of sheet.exercises||[]){
    for(const qid of ex.q||[])assert(qset.has(qid),sheet.id+" Ex "+ex.n+" references missing "+qid);
    if(openStatuses.has(ex.status))open++;
  }
  if(open)assert(sheet.status==="partial",sheet.id+" has open exercise(s) but is not marked partial");
}

class El{
  constructor(tag="div",namespaceURI="http://www.w3.org/1999/xhtml"){this.tagName=tag;this.namespaceURI=namespaceURI;this.children=[];this.attrs={};this.listeners={};this.classList={add:(...xs)=>{this.classes=(this.classes||[]).concat(xs)}};this._html="";this.value="";this.checked=false;this.selected=false;this.textContent=""}
  setAttribute(k,v){this.attrs[k]=String(v);if(["value","min","max","step","type"].includes(k))this[k]=v;if(k==="class")this.className=String(v)}
  appendChild(x){this.children.push(x);if(this.tagName==="select"&&x&&(x.selected||this.value===""))this.value=x.value??this.value;return x}
  append(...xs){xs.forEach(x=>this.appendChild(x))}
  addEventListener(t,fn){(this.listeners[t]??=[]).push(fn)}
  fire(t){for(const fn of this.listeners[t]||[])fn({target:this})}
  querySelector(){return null}
  set innerHTML(v){this._html=String(v);if(v==="")this.children=[]}
  get innerHTML(){return this._html}
}
class Host extends El{
  constructor(){super("host");this.reset()}
  reset(){this.parts={".visual-controls":new El("div"),".visual-canvas":new El("div"),".visual-readout":new El("div")}}
  querySelector(s){return this.parts[s]||null}
  set innerHTML(v){this._html=String(v);this.reset()}
  get innerHTML(){return this._html}
}
const SVG_NS="http://www.w3.org/2000/svg";
const visualSandbox={window:{},document:{createElement:t=>new El(t),createElementNS:(ns,t)=>new El(t,ns)},console};
vm.createContext(visualSandbox);
new vm.Script(visualCode,{filename:"td-visuals.js"}).runInContext(visualSandbox);
const visualKeys=[...new Set(Object.values(audit.visuals||{}))];
for(const [qid] of Object.entries(audit.visuals||{}))assert(qset.has(qid),"Visual map references missing "+qid);
const snap=el=>JSON.stringify({a:el.attrs,t:el.textContent,c:el.children.map(snap)});
for(const key of visualKeys){
  const host=new Host();
  visualSandbox.window.OPTICS_VISUALS.mount(key,host);
  assert(host.parts[".visual-canvas"].children.length>0,"Visual "+key+" rendered no SVG");
  assert(!snap(host.parts[".visual-canvas"]).includes("Diagram for "+key),"Mapped visual "+key+" fell through to the generic placeholder");
  const svgRoot=host.parts[".visual-canvas"].children[0];
  assert(svgRoot.tagName==="svg"&&svgRoot.namespaceURI===SVG_NS,"Visual "+key+" root is not in the SVG namespace");
  const assertSvgTree=el=>{assert(el.namespaceURI===SVG_NS,"Visual "+key+" contains non-SVG element <"+el.tagName+">");for(const child of el.children||[])assertSvgTree(child)};
  assertSvgTree(svgRoot);
  if(key.endsWith("-live")){
    const before=snap(host.parts[".visual-canvas"]);
    const wrap=host.parts[".visual-controls"].children[0];
    const ctl=wrap&&wrap.children.find(x=>x.tagName==="input"||x.tagName==="select");
    assert(ctl,"Live visual "+key+" has no control");
    if(ctl.tagName==="input"){
      const min=Number(ctl.min),max=Number(ctl.max),cur=Number(ctl.value);
      ctl.value=cur<(min+max)/2?max:min;
    }else{
      const next=ctl.children.find(o=>String(o.value)!==String(ctl.value));
      if(next)ctl.value=next.value;
    }
    ctl.fire("input");ctl.fire("change");
    assert(before!==snap(host.parts[".visual-canvas"]),"Live visual "+key+" did not change SVG geometry");
  }
}

const mountForTest=key=>{const host=new Host();visualSandbox.window.OPTICS_VISUALS.mount(key,host);return host.parts[".visual-canvas"].children[0]};
const classEls=(el,token,out=[])=>{if(String(el.attrs?.class||"").split(/\s+/).includes(token))out.push(el);for(const child of el.children||[])classEls(child,token,out);return out};
const telescopeSvg=mountForTest("telescope-live");
const telescopeOut=classEls(telescopeSvg,"emergent");
assert(telescopeOut.length>=2&&telescopeOut.every(l=>Number(l.attrs.y1)===Number(l.attrs.y2)),"Afocal telescope output rays must be parallel to the optical axis for the on-axis bundle");
const planeMirrorSvg=mountForTest("plane-mirror");
const pmInc=classEls(planeMirrorSvg,"incident")[0],pmRef=classEls(planeMirrorSvg,"reflected")[0];
const slopeToNormal=l=>Math.abs((Number(l.attrs.y2)-Number(l.attrs.y1))/(Number(l.attrs.x2)-Number(l.attrs.x1)));
assert(pmInc&&pmRef&&Math.abs(slopeToNormal(pmInc)-slopeToNormal(pmRef))<1e-9,"Plane-mirror schematic violates i=r");
assert(audit.visuals.s1q23==="curved-fibre","Curved-fibre exercise must not use the straight-fibre visual");
assert(audit.visuals.s1q26==="optical-wedge","Optical-wedge exercise must not use the parallel-plate visual");
assert(audit.visuals.s2q16==="two-mirrors","Two-plane-mirror exercise mapped to the wrong mirror family");
assert(audit.visuals.s6q4==="myopia-correction"&&audit.visuals.s6q5==="near-correction","Spectacle-correction exercises need correction-lens schematics");

const exact=new Set(Object.keys(audit.exactQuestionSources||{}));
for(const s of data.series){
  const pool=data.questions.filter(q=>q.series===s.id&&exact.has(q.id)&&(q.kind==="numeric"||q.kind==="mcq")&&!q.sourceWarning);
  assert(pool.length>=2,"Not enough clean recovered-source auto-gradable questions in "+s.id);
}
assert(appCode.includes("optics-tutorials.v4"),"Missing v4 progress key");
assert(appCode.includes("optics-tutorials.v3"),"Missing v3 progress migration");
assert(appCode.includes("function checkMulti"),"Missing multi-select grader");
assert(appCode.includes("Make a genuine attempt first"),"Missing attempt-before-solution gate");
assert(appCode.includes("function sourceSheetsPanel"),"Missing source-sheet ledger");
assert(appCode.includes("!q.sourceWarning"),"Assessment does not exclude source-warning questions");

const tutorialIndex=read("tutorials/geometrical-optics/index.html");
for(const x of ["td-data.js","td-audit.js","td-visuals.js","td.js"])assert(tutorialIndex.includes(x),"Tutorial page missing "+x);
assert(tutorialIndex.includes('id="sourceSheetsButton"'),"Missing source-sheet button");
assert(tutorialIndex.includes('id="assessmentButton"'),"Missing assessment button");
assert(!/complete question-family coverage/i.test(tutorialIndex),"False completeness metadata returned");

const home=read("index.html"),catalog=read("tutorials/index.html");
assert((home.match(/class="path-card"/g)||[]).length===4,"Homepage must keep four primary cards");
assert((catalog.match(/class="course-card/g)||[]).length===9,"Tutorial catalogue must keep nine module cards");

console.log(JSON.stringify({
  ok:true,
  exercises:data.questions.length,
  exactSourceMappings:Object.keys(audit.exactQuestionSources||{}).length,
  visualMappings:Object.keys(audit.visuals||{}).length,
  visualTypes:visualKeys.length,
  unresolved:(audit.unresolved||[]).map(x=>x.label)
},null,2));
