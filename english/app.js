import {validateUnit, gradeItem, nextReview, summarizeEvidence, weaknessHypothesis, shuffledOptions} from "./assessment.mjs";
import {mountSpeaking} from "./speaking.mjs";
import {mountWriting, validateWritingCatalog, validateWritingRecords} from "./writing.mjs";
import {createReadingAloud} from "./read-aloud.mjs";
import {validateRemediationCatalog,buildFocusedPractice} from "./remediation.mjs";
import {validateListeningCatalog,mountListeningPractice} from "./listening.mjs";
import {validateContextualPack,extendUnitWithContext} from "./contextual.mjs";
// English for Physicists — local-first development preview.
// All sample exercises are formative and NOT eligible for CEFR/mastery claims.
const UNITS=[
["Being a Physics Student","Present simple, introductions, questions and academic email"],
["Numbers, Quantities & SI Units","Scientific numbers, SI units, articles and plurals"],
["Laboratory Equipment & Position","Apparatus, positions, there is/are and instructions"],
["Motion & Change","Present simple/continuous and movement language"],
["Measurement & Comparison","Comparatives, quantities and measured values"],
["Laboratory Instructions & Safety","Obligations, advice, prohibition and sequencing"],
["What Happened in the Experiment?","Simple past and reporting completed experiments"],
["Processes & Troubleshooting","Past continuous, when/while and clarification"],
["Results & Experience","Present perfect and discussing recent results"],
["Cause, Effect & Conditions","Because/so and simple conditional reasoning"],
["Graphs, Predictions & Trends","Describing figures and cautious predictions"],
["A2 Integrated Physics Project","An integrated, evidence-aware laboratory communication portfolio"]
];
const QUESTIONS=[
{id:"A2.demo.read.1",type:"text",skill:"reading",prompt:"According to the virtual-cart table, what position is displayed at 2 seconds? Include a unit.",accepted:["3 m","3.0 m","3 meters","3.0 meters"],feedback:"At 2 s the model displays 3.0 m. The unit symbol m is not pluralized."},
{id:"A2.demo.gram.1",type:"text",skill:"grammar",prompt:"Complete the simple past: “Yesterday, we ___ the values.” Use record.",accepted:["recorded"],feedback:"A completed past activity uses the regular verb form recorded."},
{id:"A2.demo.disc.1",type:"choice",skill:"scientific discourse",prompt:"Which statement is supported by the data?",options:["The model displays 4.5 m at 3 s.","A real cart was measured at 6.0 m at 4 s."],accepted:["The model displays 4.5 m at 3 s."],feedback:"This source is a simulation and ends at 3 s. Do not invent a real measurement or later observation."},
{id:"A2.demo.math.1",type:"choice",skill:"mathematical English",prompt:"Which label correctly describes the horizontal axis?",options:["Time (s)","Position (s)"],accepted:["Time (s)"],feedback:"Time is on the horizontal axis; seconds (s) is its unit."}
];
const $=id=>document.getElementById(id), allowed=new Set(QUESTIONS.map(q=>q.id));
const authoredUnits=new Map();
let lessonNotes={};
let remediationNotes=null;
let contextualPack=null;
const focusedRoot=document.createElement("section");
focusedRoot.id="focused-practice";
focusedRoot.setAttribute("aria-label","Personalized formative practice suggestions");
const authoredRoot=document.createElement("section");
authoredRoot.id="authored-lesson";
authoredRoot.hidden=true;
$("lesson").after(focusedRoot,authoredRoot);
const recorderMount=document.createElement("div");
$("lesson").closest(".card").after(recorderMount);
const speaking=mountSpeaking(recorderMount,{onStartRecording:()=>{readAloud.stop();listeningWorkshop?.stop();}});
const readAloud=createReadingAloud({onStart:()=>listeningWorkshop?.stop()});
const writingMount=document.createElement("div");
recorderMount.before(writingMount);
let writingWorkshop=null;
const listeningMount=document.createElement("div");
writingMount.before(listeningMount);
let listeningWorkshop=null;
// Keep previously exported listening attempts valid even if the optional lesson data fails to load.
for(let n=1;n<=12;n++)for(let l=1;l<=2;l++)for(let q=1;q<=2;q++){
 const id="A2."+String(n).padStart(2,"0")+".L"+String(l).padStart(2,"0")+
   ".Q"+String(q).padStart(2,"0");
 allowed.add(id);
}
function renderReadingContent(container,paragraph,title){
 const lines=paragraph.split("\n").map(x=>x.trim()).filter(Boolean);
 const tableStart=lines.findIndex(x=>/^\|.*\|$/.test(x));
 if(tableStart>=0){
  if(tableStart>0){const p=document.createElement("p");p.textContent=lines.slice(0,tableStart).join(" ").replace(/\*\*/g,"");container.append(p);}
  const table=document.createElement("table");const caption=document.createElement("caption");caption.textContent="Data table — "+title;table.append(caption);
  const rows=lines.slice(tableStart).filter(x=>/^\|.*\|$/.test(x)&&!/^[\|\s:\-]+$/.test(x));
  rows.forEach((line,i)=>{
   const cells=line.split("|").slice(1,-1).map(x=>x.trim()),tr=document.createElement("tr");
   for(const cell of cells){const c=document.createElement(i===0?"th":"td");
    if(i===0)c.scope="col";c.textContent=cell.replace(/\*\*/g,"");tr.append(c);}
   table.append(tr);
  });
  container.append(table);
  const rest=lines.slice(tableStart).filter(x=>!/^\|.*\|$/.test(x));
  if(rest.length){const p=document.createElement("p");p.textContent=rest.join(" ").replace(/\*\*/g,"");container.append(p);}
 }else{const p=document.createElement("p");p.textContent=paragraph.replace(/\*\*/g,"");p.style.whiteSpace="pre-line";container.append(p);}
}

function renderVirtualGraph(container,unitId){
 const samples=unitId==="A2.11"?[[0,0],[1,2],[2,4],[3,6],[4,8]]:unitId==="A2.12"?[[0,0],[1,1.5],[2,3],[3,4.5]]:null;
 if(!samples)return;
 const section=document.createElement("section");
 const h=document.createElement("h3");h.textContent="Visual language practice: virtual position–time graph";
 const p=document.createElement("p");p.className="muted minor";
 p.textContent="These are illustrative computer-model values, not physical laboratory measurements. Describe the axes, trend and displayed interval. The table below supplies the same values without relying on the visual.";
 section.append(h,p);
 const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
 svg.setAttribute("viewBox","0 0 600 300");svg.setAttribute("role","img");
 svg.setAttribute("aria-label","Simulated position increases linearly with time. All points are listed in the table below.");
 svg.style.width="100%";svg.style.maxWidth="600px";svg.style.height="auto";
 const add=(tag,attrs,text)=>{
  const e=document.createElementNS(ns,tag);
  for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
  if(text!==undefined)e.textContent=text;
  svg.append(e);return e;
 };
 add("title",{},"Virtual cart: Position (m) versus Time (s)");
 const x0=75,x1=540,y0=238,y1=30;
 add("line",{x1:x0,y1:y0,x2:x1,y2:y0,stroke:"#173c57","stroke-width":2});
 add("line",{x1:x0,y1:y0,x2:x0,y2:y1,stroke:"#173c57","stroke-width":2});
 const xmax=samples.at(-1)[0],ymax=samples.at(-1)[1];
 const X=x=>x0+(x/xmax)*(x1-x0),Y=y=>y0-(y/ymax)*(y0-y1);
 for(const [x,y] of samples){
  add("line",{x1:X(x),y1:y0,x2:X(x),y2:Y(y),stroke:"#c8dbe5","stroke-dasharray":"4 4"});
  add("line",{x1:x0,y1:Y(y),x2:X(x),y2:Y(y),stroke:"#e0e9ee","stroke-dasharray":"4 4"});
  add("text",{x:X(x),y:y0+20,"text-anchor":"middle","font-size":14,fill:"#18334a"},x);
  add("text",{x:x0-12,y:Y(y)+5,"text-anchor":"end","font-size":13,fill:"#18334a"},y.toFixed(y%1?1:0));
 }
 add("polyline",{points:samples.map(([x,y])=>X(x)+","+Y(y)).join(" "),fill:"none",stroke:"#0d7189","stroke-width":3});
 for(const [x,y] of samples)add("circle",{cx:X(x),cy:Y(y),r:5,fill:"#0d7189"});
 add("text",{x:(x0+x1)/2,y:288,"text-anchor":"middle","font-size":16,fill:"#18334a"},"Time (s)");
 add("text",{x:25,y:145,"text-anchor":"middle","font-size":16,fill:"#18334a",transform:"rotate(-90 25 145)"},"Position (m)");
 section.append(svg);
 const table=document.createElement("table"),caption=document.createElement("caption");
 caption.textContent="Accessible table of simulated cart data";table.append(caption);
 const head=document.createElement("tr");
 for(const label of ["Time (s)","Position (m)"]){const th=document.createElement("th");th.scope="col";th.textContent=label;head.append(th);}
 table.append(head);
 for(const [time,position] of samples){const tr=document.createElement("tr");
  for(const n of [time,position]){const td=document.createElement("td");td.textContent=String(n);tr.append(td);}
  table.append(tr);}
 section.append(table);container.append(section);
}

function renderAuthored(){
 readAloud.stop();
 authoredRoot.replaceChildren();
 const current=authoredUnits.get(selected);if(!current)return;
 const label=document.createElement("h3");
 label.textContent=current.id+" — Original readings and formative practice";authoredRoot.append(label);
 const warning=document.createElement("p");warning.className="muted minor";
 warning.textContent=current.items.length+" text practice questions. Answers are formative, not externally validated CEFR proficiency evidence. Original listening media is still in production.";
 authoredRoot.append(warning);
 const notes=lessonNotes[current.id];
 if(notes){
  const section=document.createElement("section"),h=document.createElement("h3");
  h.textContent="Learn the language";section.append(h);
  const goal=document.createElement("p");goal.textContent=notes.goal;section.append(goal);
  for(const [label,explanation] of notes.notes){
   const sub=document.createElement("h4");sub.textContent=label;
   const p=document.createElement("p");p.textContent=explanation;section.append(sub,p);
  }
  const hint=document.createElement("p");hint.className="muted minor";
  hint.textContent="Pronunciation focus (text guide; recorded model audio is not yet available): "+notes.pronunciation;
  section.append(hint);authoredRoot.append(section);
 }
 renderVirtualGraph(authoredRoot,current.id);
 const sources=document.createElement("section"),sourceTitle=document.createElement("h3");
 sourceTitle.textContent="Reading library";sources.append(sourceTitle);
 for(const source of current.sources){
  const details=document.createElement("details");
  details.id="reading-"+current.id+"-"+source.id;
  details.open=source.id==="R1";
  const summary=document.createElement("summary");
  summary.textContent=source.id+" — "+source.title;details.append(summary);
  for(const paragraph of source.paragraphs){renderReadingContent(details,paragraph,source.title);}
  readAloud.attach(details,source.paragraphs,source.title);
  sources.append(details);
 }
 authoredRoot.append(sources);
 let lastSkill="",practiceGroup=null;
 for(const item of [...current.items].sort((a,b)=>a.skill.localeCompare(b.skill))){
  if(item.skill!==lastSkill){
   practiceGroup=document.createElement("details");practiceGroup.open=lastSkill==="";
   const summary=document.createElement("summary");
   const count=current.items.filter(x=>x.skill===item.skill).length;
   summary.textContent=item.skill[0].toUpperCase()+item.skill.slice(1)+" practice — "+count+" questions";
   practiceGroup.append(summary);authoredRoot.append(practiceGroup);
   lastSkill=item.skill;
  }
  const form=document.createElement("form");
  form.id="practice-"+item.id;
  const fieldset=document.createElement("fieldset");
  const legend=document.createElement("legend");
  legend.textContent=item.prompt;fieldset.append(legend);
  if(item.sourceId){
   const source=document.createElement("p");source.className="muted minor";
   source.textContent="Use source "+item.sourceId+" in the reading library above.";
   fieldset.append(source);
  }
  let input;
  if(item.type==="short_answer"){
   input=document.createElement("input");input.type="text";input.maxLength=300;input.required=true;
   input.setAttribute("aria-label",item.prompt);fieldset.append(input);
  }else{
   for(const answer of shuffledOptions(item.options)){
    const label=document.createElement("label");label.className="option";
    const radio=document.createElement("input");radio.type="radio";radio.name=item.id;
    radio.value=answer;radio.required=true;
    label.append(radio,document.createTextNode(" "+answer));fieldset.append(label);
   }
  }
  const button=document.createElement("button");button.type="submit";button.className="btn";
  button.textContent="Check answer";
  const feedback=document.createElement("p");feedback.className="feedback";
  feedback.setAttribute("role","status");
  form.append(fieldset,button,feedback);
  form.onsubmit=async e=>{
   e.preventDefault();
   const answer=item.type==="short_answer"?input.value:(form.querySelector("input:checked")?.value||"");
   if(!answer)return;
   const first=!state.attempts.some(a=>a.id===item.id);
   const result=gradeItem(item,answer,{firstAttempt:first,hintsUsed:0,solutionShown:false});
   const at=new Date().toISOString();
   state.attempts.push({id:item.id,at,answer:String(answer).slice(0,300),
      first,correct:result.correct,independent:result.independent,hintsUsed:0});
   updatePracticeReview(item.id,result.correct,first,at);
   await save();
   feedback.textContent=(result.correct?"Correct. ":"Not yet. ")+item.feedback+
      " Practice feedback only; no CEFR mastery is awarded.";
   feedback.className="feedback "+(result.correct?"good":"bad");
   renderStats();
  };
  practiceGroup.append(form);
 }
}
async function loadAuthoredUnits(){
 for(let n=1;n<=12;n++){
  const id="A2."+String(n).padStart(2,"0");
  try{
   const response=await fetch("./data/a2-"+String(n).padStart(2,"0")+".json",{cache:"no-cache"});
   if(!response.ok)throw Error("Could not load "+id+" data");
   const original=await response.json();
   const unit=contextualPack?extendUnitWithContext(original,contextualPack):original;
   const issues=validateUnit(unit);
   if(issues.length)throw Error(id+" data validation failed: "+issues.slice(0,3).join("; "));
   authoredUnits.set(n-1,unit);
   for(const item of unit.items)allowed.add(item.id);
  }catch(error){
   const note=$("notice");
   note.textContent=(note.textContent?note.textContent+" ":"")+id+" draft unavailable: "+error.message;
  }
 }
}

const normalize=s=>String(s).trim().toLowerCase().replace(/\s+/g," ").replace(/[.!?]+$/,"");
let selected=0, db=null, store="memory", state={schema:1,attempts:[],reviews:{},writing:{}};

function validHistory(h){
 if(!h || h.schema!==1 || !Array.isArray(h.attempts) || h.attempts.length>50000)return false;
 if(!h.attempts.every(a=>a && allowed.has(a.id) && typeof a.at==="string" && a.at.length<=40 &&
  typeof a.answer==="string" && a.answer.length<=300 && typeof a.first==="boolean" && typeof a.correct==="boolean"))return false;
 if(!validateWritingRecords(h.writing,writingWorkshop?.getTaskIds()))return false;
 if(h.reviews===undefined)return true; // historical exports before review scheduling
 return h.reviews && typeof h.reviews==="object" && !Array.isArray(h.reviews) &&
  Object.keys(h.reviews).length<=500 &&
  Object.entries(h.reviews).every(([id,r])=>allowed.has(id) && r && Number.isInteger(r.step) &&
   r.step>=0 && r.step<6 && Number.isInteger(r.lapses) && r.lapses>=0 &&
   typeof r.dueAt==="string" && !Number.isNaN(Date.parse(r.dueAt)) &&
   typeof r.reviewedAt==="string" && !Number.isNaN(Date.parse(r.reviewedAt)));
}
function withReviews(h){return {schema:1,attempts:h.attempts,reviews:h.reviews||{},writing:h.writing||{}};}
function updatePracticeReview(id,correct,first,at){
 const prior=state.reviews?.[id];
 // Reattempting the same item on the same day never advances spacing.
 if(!first && prior && prior.reviewedAt.slice(0,10)===at.slice(0,10))return;
 // Early extra practice does not postpone a review that has not yet become due.
 if(!first && prior && new Date(prior.dueAt).getTime()>new Date(at).getTime())return;
 state.reviews??={};
 state.reviews[id]=nextReview(prior,correct,at);
}
const adaptivePanel=document.createElement("section");
adaptivePanel.setAttribute("aria-label","Formative review and practice evidence");
$("notice").after(adaptivePanel);
function renderFocusedPractice(){
 focusedRoot.replaceChildren();
 const unit=authoredUnits.get(selected);
 if(!unit){focusedRoot.hidden=true;return;}
 focusedRoot.hidden=false;
 const title=document.createElement("h3");
 title.textContent="What to practise next";
 focusedRoot.append(title);
 const plan=buildFocusedPractice(unit,state.attempts,remediationNotes,{limit:3});
 const context=document.createElement("p");context.className="muted minor";
 context.textContent="Based on first attempts in this unit only. Recommendations are formative study prompts, not a weakness diagnosis, CEFR score or evidence of mastery.";
 focusedRoot.append(context);
 if(!plan.firstAttempted){
  const p=document.createElement("p");p.textContent="Answer a few questions in this unit. If an answer is not accepted, you will see the relevant study guidance here.";
  focusedRoot.append(p);return;
 }
 if(!plan.recommendations.length){
  const p=document.createElement("p");p.textContent="No specific corrections are suggested from your first attempts so far. Continue exploring the unattempted questions; this does not establish proficiency.";
  focusedRoot.append(p);return;
 }
 for(const suggestion of plan.recommendations){
  const card=document.createElement("div");card.className="focus-entry";
  const heading=document.createElement("h4");heading.textContent=suggestion.title;
  const reason=document.createElement("p");reason.className="muted minor";
  reason.textContent=suggestion.missedFirst+" of "+suggestion.attemptedFirst+
    " first attempts in "+suggestion.skill.replace(/-/g," ")+" were not accepted.";
  card.append(heading,reason);
  const steps=document.createElement("ol");
  for(const step of suggestion.steps){
   const li=document.createElement("li");li.textContent=step;steps.append(li);
  }
  card.append(steps);
  if(suggestion.example){
   const example=document.createElement("p");example.className="muted minor";
   example.textContent="Language example: "+suggestion.example;card.append(example);
  }
  if(suggestion.sourceId){
   const source=document.getElementById("reading-"+suggestion.unitId+"-"+suggestion.sourceId);
   if(source){
    const showSource=document.createElement("button");showSource.type="button";
    showSource.className="btn light";showSource.textContent="Revisit reading "+suggestion.sourceId;
    showSource.onclick=()=>{source.open=true;source.scrollIntoView({behavior:"smooth",block:"start"});source.querySelector("summary")?.focus();};
    card.append(showSource);
   }
  }
  const target=document.getElementById("practice-"+suggestion.itemId);
  if(target){
   const button=document.createElement("button");button.type="button";button.className="btn";
   button.textContent=suggestion.nextMode==="retry"?"Retry a question":"Try a new related question";
   button.onclick=()=>{
    const group=target.closest("details");if(group)group.open=true;
    target.scrollIntoView({behavior:"smooth",block:"center"});
    target.querySelector("input:not([type=hidden])")?.focus({preventScroll:true});
   };
   card.append(button);
  }
  focusedRoot.append(card);
 }
}

function renderAdaptivePanels(){
 adaptivePanel.replaceChildren();
 const heading=document.createElement("h3");heading.textContent="Practice review";adaptivePanel.append(heading);
 const reviews=state.reviews||{},now=Date.now();
 const due=Object.entries(reviews).filter(([id,r])=>allowed.has(id)&&Date.parse(r.dueAt)<=now);
 const p=document.createElement("p");
 p.textContent=due.length?"Practice due on "+due.length+" previously attempted question(s).":
 "No scheduled practice is due today. Reviews become due after your first attempt.";
 adaptivePanel.append(p);
 if(due.length){
  const list=document.createElement("ul");
  for(const [id] of due.slice(0,8)){
   const li=document.createElement("li"),link=document.createElement("a");
   const matched=id.match(/^A2\.(\d{2})\./);
   const targetIndex=matched?Number(matched[1])-1:11;
   const isAuthored=matched && authoredUnits.has(targetIndex);
   link.href=isAuthored?"#practice-"+id:"#lesson";
   link.textContent="Review "+id;
   link.addEventListener("click",()=>{
    if(selected!==targetIndex){selected=targetIndex;render();}
    const target=document.getElementById("practice-"+id);
    if(target){const details=target.closest("details");if(details)details.open=true;}
   });
   li.append(link);list.append(li);
  }
  adaptivePanel.append(list);
 }
 const note=document.createElement("p");note.className="muted minor";
 note.textContent="These are formative practice reminders, not CEFR mastery or certified weakness diagnoses.";
 adaptivePanel.append(note);
 const current=authoredUnits.get(selected);
 if(current){
  const summary=summarizeEvidence(state.attempts,current.items);
  const evidenceTitle=document.createElement("h3");evidenceTitle.textContent=current.id+" first-attempt practice evidence";
  adaptivePanel.append(evidenceTitle);
  const list=document.createElement("ul");
  for(const [skill,e] of Object.entries(summary)){
   const li=document.createElement("li");
   li.textContent=skill+": "+(e.unassessed?"not yet practised":e.correctFirst+" correct first attempts out of "+e.practised);
   list.append(li);
  }
  adaptivePanel.append(list);
  const signal=weaknessHypothesis(state.attempts,current.items,"grammar");
  const guard=document.createElement("p");guard.className="muted minor";
  guard.textContent="Verified weakness detection is inactive while all source questions are drafts (diagnostic status: "+signal.status+").";
  adaptivePanel.append(guard);
 }
}
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!("indexedDB" in window)){reject(Error("Unsupported"));return;}
  const r=indexedDB.open("physics-usthb-english-v1",1);
  r.onupgradeneeded=()=>r.result.createObjectStore("records");
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error||Error("Storage failure"));
 });
}
function readDB(){
 return new Promise((resolve,reject)=>{
  const r=db.transaction("records","readonly").objectStore("records").get("attempts");
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error);
 });
}
function saveDB(value){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("records","readwrite");
  tx.objectStore("records").put(value,"attempts");
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error);
 });
}
async function load(){
 try{
  db=await openDB();store="indexeddb";
  const obj=await readDB();if(validHistory(obj))state=withReviews(obj);
 }catch(_){
  try{
   const raw=localStorage.getItem("physics-usthb-english-preview-v1");
   if(raw){const h=JSON.parse(raw);if(validHistory(h))state=withReviews(h);}
   localStorage.setItem("physics-usthb-english-health","ok");
   localStorage.removeItem("physics-usthb-english-health");
   store="localStorage";
  }catch(_){store="memory";}
 }
 $("storage-status").textContent=store==="indexeddb"?"Progress saved privately in this browser (IndexedDB).":
 store==="localStorage"?"Using browser localStorage fallback; export a backup regularly.":
 "Browser storage is unavailable: progress is temporary. Export before leaving.";
 render();
}
async function save(){
 try{
  if(store==="indexeddb"){await saveDB(state);return true;}
  if(store==="localStorage"){localStorage.setItem("physics-usthb-english-preview-v1",JSON.stringify(state));return true;}
  return false;
 }catch(_){store="memory";$("storage-status").textContent="Local save failed. Progress is temporary; export now.";return false;}
}
function renderUnits(){
 const target=$("units");target.replaceChildren();
 UNITS.forEach(([title],i)=>{
  const b=document.createElement("button");b.type="button";b.setAttribute("aria-current",String(i===selected));
  b.textContent="A2."+String(i+1).padStart(2,"0")+" — "+title;
  const meta=document.createElement("small");
  meta.textContent=authoredUnits.has(i)?"Draft practice enabled":i===11?"Development sample":"Draft awaiting review";b.append(meta);
  b.onclick=()=>{selected=i;render();};target.append(b);
 });
}
function renderQuestions(){
 const target=$("questions");target.replaceChildren();
 for(const q of QUESTIONS){
  const form=document.createElement("form");
  const set=document.createElement("fieldset"),legend=document.createElement("legend");
  legend.textContent=q.prompt;set.append(legend);
  let input=null;
  if(q.type==="text"){
   input=document.createElement("input");input.type="text";input.maxLength=300;input.required=true;
   input.setAttribute("aria-label",q.prompt);set.append(input);
  }else{
   for(const option of shuffledOptions(q.options)){
    const label=document.createElement("label");label.className="option";
    const radio=document.createElement("input");radio.type="radio";radio.name=q.id;radio.value=option;radio.required=true;
    label.append(radio,document.createTextNode(" "+option));set.append(label);
   }
  }
  const submit=document.createElement("button");submit.type="submit";submit.className="btn";submit.textContent="Check answer";
  const feedback=document.createElement("p");feedback.className="feedback";feedback.setAttribute("role","status");
  form.append(set,submit,feedback);
  form.onsubmit=async e=>{
   e.preventDefault();
   const answer=q.type==="text"?input.value:(form.querySelector("input:checked")?.value||"");
   if(!answer)return;
   const correct=q.accepted.some(v=>normalize(v)===normalize(answer));
   const first=!state.attempts.some(a=>a.id===q.id);
   const at=new Date().toISOString();
   state.attempts.push({id:q.id,at,answer:answer.slice(0,300),first,correct});
   updatePracticeReview(q.id,correct,first,at);
   await save();
   feedback.textContent=(correct?"Correct. ":"Try again. ")+q.feedback+" This is practice, not verified mastery.";
   feedback.className="feedback "+(correct?"good":"bad");
   renderStats();
  };
  target.append(form);
 }
}
function renderStats(){
 $("total-attempts").textContent=String(state.attempts.length);
 $("first-correct").textContent=String(state.attempts.filter(a=>a.first&&a.correct).length);
 renderAdaptivePanels();
 renderFocusedPractice();
}
function render(){
 const [title,description]=UNITS[selected];
 $("unit-title").textContent="A2."+String(selected+1).padStart(2,"0")+" — "+title;
 $("unit-description").textContent=description;
 speaking.setPrompt("Speaking task for A2."+String(selected+1).padStart(2,"0")+": "+title+
 ". Explain an example or one short source in your own words. Speak clearly and check your units.");
 const unit=authoredUnits.get(selected);
 $("unit-status").textContent=unit?"Draft authoring preview: "+unit.items.length+" text questions. All proficiency claims disabled.":
 selected===11?"Limited demo: four text exercises, no automatic CEFR mastery.":
 "This unit has draft authoring material but is not approved or activated in the application.";
 $("lesson").hidden=true; // The authored A2.12 unit now replaces the four-question UI demonstration.
 authoredRoot.hidden=!unit;
 renderUnits();if(unit)renderAuthored();
 const unitId="A2."+String(selected+1).padStart(2,"0");
 writingWorkshop?.setUnit(unitId);
 listeningWorkshop?.setUnit(unitId);
 renderStats();
}
$("export").onclick=()=>{
 const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="physics-usthb-a2-preview-progress.json";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 $("notice").textContent="Export prepared. Keep the file private.";
};
$("import-button").onclick=()=>$("import-file").click();
$("import-file").onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>5_000_000)throw Error("File too large");
  const h=JSON.parse(await file.text());
  if(!validHistory(h))throw Error("Incompatible or invalid file");
  state=withReviews(h);await save();render();writingWorkshop?.refresh();
  $("notice").textContent="Progress imported; previous preview history replaced.";
 }catch(err){$("notice").textContent="Import failed: "+err.message;}
 e.target.value="";
};
$("clear").onclick=async()=>{
 if(!confirm("Clear all English preview progress stored in this browser profile?"))return;
 state={schema:1,attempts:[],reviews:{},writing:{}};await save();render();writingWorkshop?.refresh();
 $("notice").textContent="Local preview progress cleared.";
};
async function boot(){
 try{
  const response=await fetch("./data/concepts.json",{cache:"no-cache"});
  if(response.ok){const data=await response.json();if(data.schemaVersion===1&&data.units&&typeof data.units==="object")lessonNotes=data.units;}
 }catch(_){/* Always allow self-contained practice without the optional notes. */}
 try{
  const response=await fetch("./data/writing.json",{cache:"no-cache"});
  if(!response.ok)throw Error("Writing task file unavailable");
  const catalog=await response.json();
  const errors=validateWritingCatalog(catalog);
  if(errors.length)throw Error(errors.slice(0,3).join("; "));
  writingWorkshop=mountWriting(writingMount,{
   catalog,
   getRecord:id=>state.writing?.[id],
   onChange:(id,record)=>{state.writing??={};state.writing[id]=record;},
   onSave:save
  });
 }catch(err){$("notice").textContent="Writing workshop unavailable: "+err.message;}
 try{
  const response=await fetch("./data/contextual-practice.json",{cache:"no-cache"});
  if(!response.ok)throw Error("Contextual practice not available");
  const pack=await response.json(),issues=validateContextualPack(pack);
  if(issues.length)throw Error(issues.slice(0,3).join("; "));
  contextualPack=pack;
 }catch(error){
  contextualPack=null;
  $("notice").textContent=($("notice").textContent+" Contextual practice could not load: "+error.message).trim();
 }
 await loadAuthoredUnits();
 try{
  const response=await fetch("./data/remediation.json",{cache:"no-cache"});
  if(!response.ok)throw Error("Study guide unavailable");
  const data=await response.json();
  const errors=validateRemediationCatalog(data,[...authoredUnits.values()]);
  if(errors.length)throw Error(errors.slice(0,3).join("; "));
  remediationNotes=data;
 }catch(err){
  remediationNotes=null;
  $("notice").textContent=($("notice").textContent+" Optional targeted study guide unavailable: "+err.message).trim();
 }
 try{
  const response=await fetch("./data/listening.json",{cache:"no-cache"});
  if(!response.ok)throw Error("Dialogues unavailable");
  const catalog=await response.json();
  const errors=validateListeningCatalog(catalog);
  if(errors.length)throw Error(errors.slice(0,3).join("; "));
  listeningWorkshop=mountListeningPractice(listeningMount,{
   catalog,
   getAttempts:()=>state.attempts,
   onAttempt:async attempt=>{
    state.attempts.push(attempt);
    const saved=await save();
    renderStats();
    return saved;
   },
   onStartAudio:()=>readAloud.stop()
  });
 }catch(error){
  $("notice").textContent=($("notice").textContent+" Optional listening workshop unavailable: "+error.message).trim();
 }
 await load();
}
boot();