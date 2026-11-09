// English A2 beta — accessible, browser-local question-at-a-time practice.
// No diagnosis or CEFR certification. Does not create new answers or assessment keys.
export const PRACTICE_MODES=Object.freeze(["new","due","revisit","all"]);
export const PRACTICE_MODE_LABELS=Object.freeze({
  new:"New questions",
  due:"Scheduled reviews due",
  revisit:"Revisit first-attempt errors",
  all:"All questions"
});

export function buildPracticeQueue(items,attempts,reviews,mode="new",nowIso=new Date().toISOString()){
 if(!PRACTICE_MODES.includes(mode)||!Array.isArray(items)||!Array.isArray(attempts)||
    !reviews || typeof reviews!=="object" || Array.isArray(reviews))throw Error("Invalid practice queue inputs");
 const now=Date.parse(nowIso);
 if(!Number.isFinite(now))throw Error("Invalid practice time");
 const attemptsById=new Map();
 for(const a of attempts){
  if(!a||typeof a.id!=="string"||typeof a.correct!=="boolean")continue;
  const list=attemptsById.get(a.id)||[];
  list.push(a);attemptsById.set(a.id,list);
 }
 const itemsSelected=[],seen=new Set();
 for(const item of items){
  if(!item||typeof item.id!=="string"||seen.has(item.id))throw Error("Duplicate/invalid item in practice queue");
  seen.add(item.id);
  if(!["single_choice","short_answer"].includes(item.type)||item.status!=="draft"||item.media!=="text")continue;
  const history=attemptsById.get(item.id)||[],first=history.find(x=>x.first===true)||history[0];
  const wasAttempted=history.length>0;
  const needsRevisit=Boolean(first?.correct===false && !history.some(x=>x.correct===true));
  const review=reviews[item.id];
  const isDue=Boolean(wasAttempted && review && typeof review.dueAt==="string" &&
    Number.isFinite(Date.parse(review.dueAt)) && Date.parse(review.dueAt)<=now);
  if(mode==="new" && wasAttempted)continue;
  if(mode==="due" && !isDue)continue;
  if(mode==="revisit" && !needsRevisit)continue;
  itemsSelected.push(item);
 }
 return itemsSelected;
}

export function practiceModeCounts(items,attempts,reviews,nowIso=new Date().toISOString()){
 const result={};
 for(const mode of PRACTICE_MODES)result[mode]=buildPracticeQueue(items,attempts,reviews,mode,nowIso).length;
 return result;
}

export function mountQuickPractice(container,{unit,getAttempts,getReviews,onAnswer}){
 if(!container||!unit||!Array.isArray(unit.items)||typeof getAttempts!=="function"||
    typeof getReviews!=="function"||typeof onAnswer!=="function")throw Error("Invalid quick practice dependencies");
 const root=document.createElement("section");
 root.id="quick-practice";root.className="quick-practice";
 root.setAttribute("aria-label","Question-at-a-time formative practice");
 const heading=document.createElement("h3");heading.textContent="Quick practice — one question at a time";
 const expl=document.createElement("p");expl.className="muted minor";
 expl.textContent="Choose unattempted questions, scheduled reviews, or questions you missed on your first attempt. Feedback is for learning only; no CEFR mastery or weakness diagnosis is awarded.";
 const modeLabel=document.createElement("label");modeLabel.htmlFor="quick-mode";modeLabel.textContent="Choose practice mode";
 const modeSelect=document.createElement("select");modeSelect.id="quick-mode";
 for(const mode of PRACTICE_MODES){
  const option=document.createElement("option");option.value=mode;option.textContent=PRACTICE_MODE_LABELS[mode];modeSelect.append(option);
 }
 const count=document.createElement("p");count.className="muted minor";count.id="quick-count";count.setAttribute("role","status");
 const stage=document.createElement("div");stage.id="quick-question";
 root.append(heading,expl,modeLabel,modeSelect,count,stage);
 container.append(root);
 let mode="new",current=null,visited=new Set(),feedbackMessage="",feedbackCorrect=false,answerShown=false;
 const build=()=>buildPracticeQueue(unit.items,getAttempts(),getReviews(),mode);
 function renderCounts(){
  const sizes=practiceModeCounts(unit.items,getAttempts(),getReviews());
  count.textContent=PRACTICE_MODE_LABELS[mode]+": "+sizes[mode]+" eligible question(s). "+
    sizes.new+" unattempted; "+sizes.due+" reviews due; "+sizes.revisit+" still unanswered correctly after a wrong first attempt.";
 }
 function pickNext(){
  current=build().find(item=>!visited.has(item.id))||null;
  feedbackMessage="";answerShown=false;
  draw();
 }
 function draw(){
  stage.replaceChildren();renderCounts();
  if(!current){
   const message=document.createElement("p");message.className="muted";
   message.textContent=mode==="new"?"No unattempted text questions remain in this unit.":
    mode==="due"?"No scheduled reviews are due in this unit.":
    mode==="revisit"?"No unresolved first-attempt errors remain in this unit.":
    "You have reached the end of this quick-practice session.";
   const other=document.createElement("p");other.className="muted minor";
   other.textContent="You can change the mode or use the complete exercise list below. This message is not a proficiency judgment.";
   stage.append(message,other);
   if(build().length>0){
    const reset=document.createElement("button");reset.type="button";reset.className="btn light";
    reset.textContent="Start this mode again";
    reset.onclick=()=>{visited.clear();pickNext();};
    stage.append(reset);
   }
   return;
  }
  const form=document.createElement("form");
  form.id="quick-"+current.id;
  const fieldset=document.createElement("fieldset"),legend=document.createElement("legend");
  legend.textContent=current.prompt;fieldset.append(legend);
  if(current.sourceId){
   const p=document.createElement("p");p.className="muted minor";
   p.textContent="Source: "+current.sourceId+" in the reading library above.";
   fieldset.append(p);
   const ref=document.getElementById("reading-"+unit.id+"-"+current.sourceId);
   if(ref){
    const openSource=document.createElement("button");openSource.type="button";
    openSource.className="btn light";openSource.textContent="Open source "+current.sourceId;
    openSource.onclick=()=>{ref.open=true;ref.scrollIntoView({behavior:"smooth",block:"start"});ref.querySelector("summary")?.focus();};
    fieldset.append(openSource);
   }
  }
  let input=null;
  if(current.type==="short_answer"){
   input=document.createElement("input");input.type="text";input.required=true;input.maxLength=300;
   input.setAttribute("aria-label",current.prompt);fieldset.append(input);
  }else{
   // Stable order inside a question; do not reshuffle on feedback or count refresh.
   for(const choice of current.options){
    const label=document.createElement("label");label.className="option";
    const radio=document.createElement("input");radio.type="radio";
    radio.name="quick-"+current.id;radio.value=choice;radio.required=true;
    label.append(radio,document.createTextNode(" "+choice));fieldset.append(label);
   }
  }
  const check=document.createElement("button");check.className="btn";check.type="submit";
  check.textContent="Check answer";
  const next=document.createElement("button");next.className="btn light";next.type="button";next.textContent="Next question";
  const result=document.createElement("p");result.className="feedback";result.setAttribute("role","status");
  if(answerShown){result.textContent=feedbackMessage;result.className="feedback "+(feedbackCorrect?"good":"bad");}
  form.onsubmit=async event=>{
   event.preventDefault();
   const answer=current.type==="short_answer"?input.value:(form.querySelector("input:checked")?.value||"");
   if(!answer)return;
   check.disabled=true;
   try{
    const outcome=await onAnswer(current,answer);
    feedbackCorrect=Boolean(outcome.correct);
    feedbackMessage=(outcome.correct?"Correct. ":"Not accepted. ")+current.feedback+
      " This is formative practice, not verified proficiency."+
      (outcome.saved===false?" Local saving failed: please export your progress.":"");
    answerShown=true;
    result.className="feedback "+(feedbackCorrect?"good":"bad");
    result.textContent=feedbackMessage;renderCounts();
   }catch(_){
    result.className="feedback bad";
    result.textContent="Could not check this answer. Your response was not recorded.";
   }finally{check.disabled=false;}
  };
  next.onclick=()=>{visited.add(current.id);pickNext();};
  form.append(fieldset,check,next,result);stage.append(form);
 }
 modeSelect.onchange=()=>{mode=modeSelect.value;visited.clear();pickNext();};
 pickNext();
 return {refreshCounts:renderCounts,dispose:()=>{visited.clear();stage.replaceChildren();root.remove();}};
}
