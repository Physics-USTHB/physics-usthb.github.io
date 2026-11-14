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
const cssCode=read("tutorials/geometrical-optics/td.css");
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
  assert((svgRoot.children||[]).some(x=>x.tagName==="title"&&String(x.textContent||"").trim()),"Visual "+key+" has no accessible SVG title");
  const rayTokens=new Set(["ray","incident","refracted","emergent","reflected","guided","rejected"]);
  const physical=[];
  const collectPhysical=el=>{if(el.tagName==="line"&&String(el.attrs?.class||"").split(/\s+/).some(t=>rayTokens.has(t)))physical.push(el);for(const child of el.children||[])collectPhysical(child)};
  collectPhysical(svgRoot);
  assert(physical.every(x=>String(x.attrs?.["marker-end"]||"").startsWith("url(#ray-arrow-")),"Visual "+key+" contains a physical ray without a direction marker");
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

const hostForTest=key=>{const host=new Host();visualSandbox.window.OPTICS_VISUALS.mount(key,host);return host};
const mountForTest=key=>hostForTest(key).parts[".visual-canvas"].children[0];
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
assert(appCode.includes("visuals.mount(visualKey,host,(audit.visualPresets||{})[q.id])"),"Question-specific visual presets are not passed to the visual engine");
assert(Object.keys(audit.visualPresets||{}).length>=50,"Too few question-specific visual presets");
const presetHost=(qid)=>{const host=new Host();visualSandbox.window.OPTICS_VISUALS.mount(audit.visuals[qid],host,audit.visualPresets[qid]);return host};
const presetValue=(qid,label)=>{const h=presetHost(qid),wrap=h.parts[".visual-controls"].children.find(w=>w.children?.[0]?.textContent===label);return wrap?.children?.find(x=>x.tagName==="input"||x.tagName==="select")?.value};
assert(String(presetValue("s4q7","incidence i"))==="0","Normal-incidence prism preset not applied");
assert(String(presetValue("s2q18","object distance"))==="500","Metre-scale mirror preset not applied");
assert(String(presetValue("s5q25","object"))==="virtual","Virtual-object lens preset not applied");
assert(String(presetValue("s1q34","cladding nᵍ"))==="1.08","Fibre limiting-condition preset not applied");
assert(Object.values(audit.visuals||{}).filter(x=>x==="diopter-live").length===16,"All generic spherical-diopter exercises should use the live diopter model");
assert(String(presetValue("s3q24","object"))==="virtual","Virtual-object diopter preset not applied");
const diopterVirtual=presetHost("s3q24").parts[".visual-readout"].innerHTML;
assert(diopterVirtual.includes("8.00 cm")&&diopterVirtual.includes("3.000"),"Virtual-object diopter conjugation/magnification regression");
const diopterReal=presetHost("s3q19").parts[".visual-readout"].innerHTML;
assert(diopterReal.includes("-66.30 cm"),"Concave-diopter image-position regression");
assert(audit.visuals.s6q7==="magnifier-live"&&audit.visuals.s6q8==="magnifier-live"&&audit.visuals.s6q15==="magnifier-live","Magnifier theory/numeric exercises should use the dedicated magnifier model");
assert(["s6q30","s6q31","s6q32","s6q33","s6q34"].every(id=>audit.visuals[id]==="angular-resolution-live"),"Moon angular-size/resolution exercises must use the angular-resolution model");
const loupe=presetHost("s6q45").parts[".visual-readout"].innerHTML;
assert(loupe.includes("5.00×")&&loupe.includes("0.020 mm"),"Magnifier resolution regression");
const naked=presetHost("s6q53").parts[".visual-readout"].innerHTML;
assert(naked.includes("0.008000 rad")&&naked.includes("0.100 mm"),"Naked-eye angular-size/resolution regression");
const moon=presetHost("s6q31").parts[".visual-readout"].innerHTML;
assert(moon.includes("0.906250 rad")&&moon.includes("outside the strict small-angle/paraxial regime"),"Moon magnification warning regression");
const moonLimit=presetHost("s6q32").parts[".visual-readout"].innerHTML;
assert(moonLimit.includes("1.152 km")&&moonLimit.includes(">resolved<"),"Moon resolution-limit boundary regression");
const station=presetHost("s6q34").parts[".visual-readout"].innerHTML;
assert(station.includes("1.152 km")&&station.includes("not resolved"),"Moon station-resolution regression");
assert(audit.visuals.s1q13==="plane-diopter-live"&&audit.visuals.s3q8==="plane-diopter-live"&&audit.visuals.s3q9==="plane-diopter-live","Apparent-depth/plane-diopter exercises should use the plane-diopter model");
assert(audit.visuals.s2q3==="mirror-translation-live","Moving-plane-mirror exercise needs its dedicated model");
assert(["s5q12","s5q13","s5q14","s5q17"].every(id=>audit.visuals[id]==="lens-combination-live"),"Lens-combination exercises should use the equivalent-power model");
assert(audit.visuals.s6q2==="accommodation-live","Accommodation exercise needs the accommodation model");
const apparent=presetHost("s1q13").parts[".visual-readout"].innerHTML;
assert(apparent.includes("-225.06 cm"),"Water apparent-depth regression");
const planeDiopter=presetHost("s3q8").parts[".visual-readout"].innerHTML;
assert(planeDiopter.includes("-66.67 cm"),"Plane-diopter conjugation regression");
const movingMirror=presetHost("s2q3").parts[".visual-readout"].innerHTML;
assert(movingMirror.includes("6.00 cm"),"Plane-mirror translation regression");
const contactPair=presetHost("s5q12").parts[".visual-readout"].innerHTML;
assert(contactPair.includes("33.33 cm"),"Contact-lens equivalent focal length regression");
const separatedPair=presetHost("s5q13").parts[".visual-readout"].innerHTML;
assert(separatedPair.includes("15.00 cm"),"Separated-lens equivalent focal length regression");
const afocalPair=presetHost("s5q14").parts[".visual-readout"].innerHTML;
assert(afocalPair.includes(">afocal<")&&afocalPair.includes(">∞<"),"Afocal two-lens regression");
const accommodation=presetHost("s6q2").parts[".visual-readout"].innerHTML;
assert(accommodation.includes("4.00 D"),"Eye accommodation regression");
const fibreDelay=presetHost("s1q39").parts[".visual-readout"].innerHTML;
assert(fibreDelay.includes("4.933 µs")&&fibreDelay.includes("5.001 µs")&&fibreDelay.includes("67.58 ns"),"Fibre axial/limiting transit-time regression");
const fibreLimit=presetHost("s1q38").parts[".visual-readout"].innerHTML;
assert(fibreLimit.includes("80.57°")&&fibreLimit.includes("9.43°"),"Fibre critical/wall-angle regression");
const offAxisHost=new Host();
visualSandbox.window.OPTICS_VISUALS.mount("telescope-live",offAxisHost,{controls:{"objective f":1000,"eyepiece f":20,"field angle α":0.2}});
const offAxisReadout=offAxisHost.parts[".visual-readout"].innerHTML;
assert(offAxisReadout.includes("-50.0")&&offAxisReadout.includes("-10.00°"),"Off-axis telescope angular-magnification regression");
const offAxisSvg=offAxisHost.parts[".visual-canvas"].children[0],offAxisOut=classEls(offAxisSvg,"emergent");
const outSlopes=offAxisOut.map(l=>(Number(l.attrs.y2)-Number(l.attrs.y1))/(Number(l.attrs.x2)-Number(l.attrs.x1)));
assert(outSlopes.length>=2&&Math.max(...outSlopes)-Math.min(...outSlopes)<1e-9&&Math.abs(outSlopes[0])>1e-4,"Off-axis afocal telescope must produce parallel but tilted output rays");
assert(["s4q12","s4q13","s4q14"].every(id=>audit.visuals[id]==="goniometer-live"),"Goniometer source exercises should use the live measurement model");
const gonio=presetHost("s4q13").parts[".visual-readout"].innerHTML;
assert(gonio.includes("59°57′")&&gonio.includes("41°10′")&&gonio.includes("1.5457"),"Goniometer A/Dmin/index regression");
const gonioUnc=presetHost("s4q14").parts[".visual-readout"].innerHTML;
assert(gonioUnc.includes("0.000780")&&gonioUnc.includes("0.050%"),"Goniometer uncertainty regression");
assert(["s6q9","s6q10","s6q11","s6q12","s6q16","s6q17","s6q24","s6q38","s6q39","s6q40","s6q41","s6q42","s6q43"].every(id=>audit.visuals[id]==="microscope-live"),"Microscope exercise family should use the live microscope model");
const micro125=presetHost("s6q11").parts[".visual-readout"].innerHTML;
assert(micro125.includes("-125.00×")&&micro125.includes("500.00 m⁻¹"),"Microscope design/intrinsic-power regression");
const micro25=presetHost("s6q24").parts[".visual-readout"].innerHTML;
assert(micro25.includes("-2.5000 cm")&&micro25.includes("-25.00×"),"14 cm microscope geometry regression");
const micro320=presetHost("s6q38").parts[".visual-readout"].innerHTML;
assert(micro320.includes("-0.5156 cm")&&micro320.includes("-320.00×")&&micro320.includes("-0.0781 cm"),"Touat optical-interval microscope regression");
const microAngle=presetHost("s6q43").parts[".visual-readout"].innerHTML;
assert(microAngle.includes("0.000200 rad")&&microAngle.includes("0.005000 rad"),"Microscope naked/image angular-size regression");
assert(["s6q22","s6q23","s6q35","s6q36","s6q37","s6q46","s6q47","s6q48","s6q49","s6q50","s6q51","s6q52"].every(id=>audit.visuals[id]==="newtonian-live"),"Newtonian telescope family should use the live model");
const newton60=presetHost("s6q23").parts[".visual-readout"].innerHTML;
assert(newton60.includes("60.00×"),"Newtonian 1200/20 mm magnification regression");
const newtonTube=presetHost("s6q36").parts[".visual-readout"].innerHTML;
assert(newtonTube.includes("45.00 cm")&&newtonTube.includes("50.00 cm")&&newtonTube.includes("10.00 cm"),"Newtonian amateur-tube geometry regression");
const newtonTouat=presetHost("s6q46").parts[".visual-readout"].innerHTML;
assert(newtonTouat.includes("5.00×")&&newtonTouat.includes("0.0800 rad")&&newtonTouat.includes("0.4000 rad")&&newtonTouat.includes("0.800 cm"),"Touat Newtonian 1:1 layout regression");
const clipHost=new Host();
visualSandbox.window.OPTICS_VISUALS.mount("newtonian-live",clipHost,{controls:{"primary f₁′":10,"primary diameter":4,"secondary before F₁":2,"eyepiece f₂′":2,"A₁B₁":8,"secondary projected aperture":0.5}});
assert(clipHost.parts[".visual-readout"].innerHTML.includes(">clipped<"),"Newtonian secondary-aperture clipping regression");







const controlByLabel=(key,label)=>{const h=hostForTest(key);const wrap=h.parts[".visual-controls"].children.find(w=>w.children?.[0]?.textContent===label);return wrap?.children?.find(x=>x.tagName==="input"||x.tagName==="select")};
assert(Number(controlByLabel("prism-live","incidence i")?.min)===0,"Prism visual must support normal incidence");
assert(Number(controlByLabel("refraction-live","incidence i")?.max)>=89,"Refraction visual must support the grazing-incidence limit");
assert(Number(controlByLabel("fibre-live","launch angle")?.max)>=89,"Fibre visual must support the all-launch-angle limiting case");
assert(Number(controlByLabel("mirror-live","|f|")?.max)>=150&&Number(controlByLabel("mirror-live","object distance")?.max)>=500,"Mirror visual ranges do not cover mapped metre-scale USTHB exercises");

const exact=new Set(Object.keys(audit.exactQuestionSources||{}));
for(const s of data.series){
  const pool=data.questions.filter(q=>q.series===s.id&&exact.has(q.id)&&(q.kind==="numeric"||q.kind==="mcq")&&!q.sourceWarning);
  assert(pool.length>=2,"Not enough clean recovered-source auto-gradable questions in "+s.id);
}
assert(appCode.includes("optics-tutorials.v4"),"Missing v4 progress key");
assert(appCode.includes("optics-tutorials.v3"),"Missing v3 progress migration");
assert(appCode.includes("function checkMulti"),"Missing multi-select grader");
assert(visualCode.includes("installViewControl"),"Missing enlarged-view control for diagrams");
assert(cssCode.includes(".visual-expanded")&&cssCode.includes("min-width:620px"),"Missing enlarged/mobile visual readability styles");
assert(visualCode.includes("solid arrow = real light path")&&visualCode.includes("construction / backward extension"),"Missing ray/construction legend");

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
