import {validateUnit, gradeItem, nextReview, summarizeEvidence, weaknessHypothesis} from "./assessment.mjs";
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
let a201=null;
const authoredRoot=document.createElement("section");
authoredRoot.id="authored-lesson";
authoredRoot.hidden=true;
$("lesson").after(authoredRoot);
function renderAuthored(){
 authoredRoot.replaceChildren();
 if(!a201)return;
 const label=document.createElement("h3");
 label.textContent="A2.01 — Original readings and formative practice";authoredRoot.append(label);
 const warning=document.createElement("p");warning.className="muted minor";
 warning.textContent="34 draft questions. Correct responses are recorded for practice, not counted as verified proficiency. Listening and pronunciation media are not yet available.";
 authoredRoot.append(warning);
 const sources=document.createElement("section"),sourceTitle=document.createElement("h3");
 sourceTitle.textContent="Reading library";sources.append(sourceTitle);
 for(const source of a201.sources){
  const details=document.createElement("details");
  details.open=source.id==="R1";
  const summary=document.createElement("summary");
  summary.textContent=source.id+" — "+source.title;details.append(summary);
  for(const paragraph of source.paragraphs){const p=document.createElement("p");p.textContent=paragraph;details.append(p);}
  sources.append(details);
 }
 authoredRoot.append(sources);
 let lastSkill="";
 for(const item of a201.items){
  if(item.skill!==lastSkill){
   const group=document.createElement("h3");group.textContent=item.skill[0].toUpperCase()+item.skill.slice(1)+" practice";
   authoredRoot.append(group);lastSkill=item.skill;
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
   for(const answer of item.options){
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
  authoredRoot.append(form);
 }
}
async function loadAuthoredUnit(){
 try{
  const response=await fetch("./data/a2-01.json",{cache:"no-cache"});
  if(!response.ok)throw Error("Could not load A2.01 data");
  const unit=await response.json(),issues=validateUnit(unit);
  if(issues.length)throw Error("A2.01 data validation failed: "+issues.slice(0,3).join("; "));
  a201=unit;
  for(const item of a201.items)allowed.add(item.id);
 }catch(error){
  a201=null;const note=$("notice");note.textContent="A2.01 draft material could not load: "+error.message;
 }
}

const normalize=s=>String(s).trim().toLowerCase().replace(/\s+/g," ").replace(/[.!?]+$/,"");
let selected=0, db=null, store="memory", state={schema:1,attempts:[],reviews:{}};

function validHistory(h){
 if(!h || h.schema!==1 || !Array.isArray(h.attempts) || h.attempts.length>50000)return false;
 if(!h.attempts.every(a=>a && allowed.has(a.id) && typeof a.at==="string" && a.at.length<=40 &&
  typeof a.answer==="string" && a.answer.length<=300 && typeof a.first==="boolean" && typeof a.correct==="boolean"))return false;
 if(h.reviews===undefined)return true; // historical exports before review scheduling
 return h.reviews && typeof h.reviews==="object" && !Array.isArray(h.reviews) &&
  Object.keys(h.reviews).length<=500 &&
  Object.entries(h.reviews).every(([id,r])=>allowed.has(id) && r && Number.isInteger(r.step) &&
   r.step>=0 && r.step<6 && Number.isInteger(r.lapses) && r.lapses>=0 &&
   typeof r.dueAt==="string" && !Number.isNaN(Date.parse(r.dueAt)) &&
   typeof r.reviewedAt==="string" && !Number.isNaN(Date.parse(r.reviewedAt)));
}
function withReviews(h){return {schema:1,attempts:h.attempts,reviews:h.reviews||{}};}
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
   const isAuthored=id.startsWith("A2.01.");
   link.href=isAuthored?"#practice-"+id:"#lesson";
   link.textContent="Review "+id;
   if((isAuthored&&selected!==0)||(!isAuthored&&selected!==11)){
    link.addEventListener("click",()=>{selected=isAuthored?0:11;render();});
   }
   li.append(link);list.append(li);
  }
  adaptivePanel.append(list);
 }
 const note=document.createElement("p");note.className="muted minor";
 note.textContent="These are formative practice reminders, not CEFR mastery or certified weakness diagnoses.";
 adaptivePanel.append(note);
 if(a201){
  const summary=summarizeEvidence(state.attempts,a201.items);
  const evidenceTitle=document.createElement("h3");evidenceTitle.textContent="A2.01 first-attempt practice evidence";
  adaptivePanel.append(evidenceTitle);
  const list=document.createElement("ul");
  for(const [skill,e] of Object.entries(summary)){
   const li=document.createElement("li");
   li.textContent=skill+": "+(e.unassessed?"not yet practised":e.correctFirst+" correct first attempts out of "+e.practised);
   list.append(li);
  }
  adaptivePanel.append(list);
  const signal=weaknessHypothesis(state.attempts,a201.items,"grammar");
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
  if(store==="indexeddb")await saveDB(state);
  if(store==="localStorage")localStorage.setItem("physics-usthb-english-preview-v1",JSON.stringify(state));
 }catch(_){store="memory";$("storage-status").textContent="Local save failed. Progress is temporary; export now.";}
}
function renderUnits(){
 const target=$("units");target.replaceChildren();
 UNITS.forEach(([title],i)=>{
  const b=document.createElement("button");b.type="button";b.setAttribute("aria-current",String(i===selected));
  b.textContent="A2."+String(i+1).padStart(2,"0")+" — "+title;
  const meta=document.createElement("small");
  meta.textContent=i===11?"Development sample":"Draft awaiting review";b.append(meta);
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
   for(const option of q.options){
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
}
function render(){
 const [title,description]=UNITS[selected];
 $("unit-title").textContent="A2."+String(selected+1).padStart(2,"0")+" — "+title;
 $("unit-description").textContent=description;
 $("unit-status").textContent=selected===0?(a201?"Draft authoring preview: 34 text questions. All competence claims disabled.":"A2.01 draft material is temporarily unavailable."):
 selected===11?"Limited demo: four text exercises, no automatic CEFR mastery.":
 "This unit has draft authoring material but is not approved or activated in the application.";
 $("lesson").hidden=selected!==11;
 authoredRoot.hidden=selected!==0 || !a201;
 renderUnits();if(selected===11)renderQuestions();if(selected===0 && a201)renderAuthored();renderStats();
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
  state=withReviews(h);await save();render();
  $("notice").textContent="Progress imported; previous preview history replaced.";
 }catch(err){$("notice").textContent="Import failed: "+err.message;}
 e.target.value="";
};
$("clear").onclick=async()=>{
 if(!confirm("Clear all English preview progress stored in this browser profile?"))return;
 state={schema:1,attempts:[],reviews:{}};await save();render();
 $("notice").textContent="Local preview progress cleared.";
};
async function boot(){await loadAuthoredUnit();await load();}
boot();