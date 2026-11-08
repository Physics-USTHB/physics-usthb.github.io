// English for Physicists — local-only guided writing and self-review.
// No automated language scoring, CEFR judgments, third-party API calls or uploads.
const CHECKS=["task","language","physics","clarity"];
export const MAX_WRITING_CHARS=6000;

export function countWords(value){
 const text=String(value||"").trim();
 return text?text.split(/\s+/u).length:0;
}
export function validateWritingCatalog(catalog){
 const issues=[];
 if(!catalog||catalog.schemaVersion!==1||catalog.language!=="en-US"||!catalog.rubric||!catalog.units)
  return ["Invalid writing catalog header"];
 for(const key of CHECKS) if(typeof catalog.rubric[key]!=="string"||catalog.rubric[key].length<12)issues.push("Missing rubric: "+key);
 const seen=new Set();
 for(let n=1;n<=12;n++){
  const unit="A2."+String(n).padStart(2,"0"),tasks=catalog.units[unit];
  if(!Array.isArray(tasks)||tasks.length<2){issues.push("Missing tasks for "+unit);continue;}
  for(const task of tasks){
   if(!task||typeof task.id!=="string"||!task.id.startsWith(unit+".WRITE.")||seen.has(task.id))
    {issues.push("Duplicate or invalid task "+(task?.id||unit));continue;}
   seen.add(task.id);
   if(typeof task.title!=="string"||task.title.length<8||
      typeof task.prompt!=="string"||task.prompt.length<35||
      typeof task.languageReminder!=="string"||task.languageReminder.length<18||
      typeof task.physicsReminder!=="string"||task.physicsReminder.length<18)
       issues.push("Incomplete prompt "+task.id);
   if(!Array.isArray(task.targetWords)||task.targetWords.length!==2||
      !Number.isInteger(task.targetWords[0])||task.targetWords[0]<20||
      !Number.isInteger(task.targetWords[1])||task.targetWords[1]<=task.targetWords[0])
       issues.push("Invalid target range "+task.id);
   if(task.reviewStatus!=="draft"||task.automaticGrade!==false)issues.push("Invalid evaluation contract "+task.id);
  }
 }
 if(seen.size!==24)issues.push("Expected 24 guided tasks");
 return issues;
}
export function validateWritingRecords(records,allowedIds){
 if(records===undefined)return true; // older exports did not include writing
 if(!records||typeof records!=="object"||Array.isArray(records))return false;
 const entries=Object.entries(records);
 if(entries.length>48)return false;
 return entries.every(([id,record])=>{
  const known=allowedIds?.size?allowedIds.has(id):/^A2\.(0[1-9]|1[0-2])\.WRITE\.(01|02)$/.test(id);
  return known && record && typeof record==="object"&&!Array.isArray(record) &&
   typeof record.text==="string"&&record.text.length<=MAX_WRITING_CHARS &&
   typeof record.updatedAt==="string"&&record.updatedAt.length<=40 &&
   !Number.isNaN(Date.parse(record.updatedAt)) &&
   Array.isArray(record.checked)&&record.checked.length<=CHECKS.length &&
   new Set(record.checked).size===record.checked.length &&
   record.checked.every(k=>CHECKS.includes(k));
 });
}
export function mountWriting(container,{catalog,getRecord,onChange,onSave}){
 const problems=validateWritingCatalog(catalog);
 if(problems.length)throw Error("Invalid writing tasks: "+problems.slice(0,3).join("; "));
 const root=document.createElement("section");root.className="card";root.style.marginTop="20px";
 root.id="guided-writing";
 container.append(root);
 const lastTask={};
 let currentUnit=null,formStatus=null,pending=null,revision=0;
 const tasksByUnit=catalog.units;
 const clearTimer=()=>{if(pending!==null){clearTimeout(pending);pending=null;}};
 function renderTask(unitId){
  currentUnit=unitId;const tasks=tasksByUnit[unitId];
  if(!tasks){root.hidden=true;return;}
  root.hidden=false;root.replaceChildren();
  const h=document.createElement("h2");h.textContent="Writing workshop — "+unitId;
  const lead=document.createElement("p");lead.className="muted";
  lead.textContent="Draft, revise and self-check your English. No automatic writing score or CEFR level is assigned. Your text is saved only in this browser profile.";
  root.append(h,lead);
  const label=document.createElement("label");label.textContent="Writing task";
  label.style.display="block";label.style.fontWeight="650";
  const picker=document.createElement("select");picker.id="writing-task";
  picker.setAttribute("aria-label","Choose a guided writing task");
  picker.style.display="block";picker.style.width="100%";
  picker.style.padding="10px";picker.style.margin="9px 0";
  for(const t of tasks){const option=document.createElement("option");option.value=t.id;option.textContent=t.title;picker.append(option);}
  const task=tasks.find(t=>t.id===lastTask[unitId])||tasks[0];picker.value=task.id;
  picker.onchange=()=>{lastTask[unitId]=picker.value;renderTask(unitId);};
  root.append(label,picker);
  const sub=document.createElement("h3");sub.textContent=task.title;
  const prompt=document.createElement("p");prompt.textContent=task.prompt;
  const lang=document.createElement("p");lang.className="muted minor";lang.textContent="Language target: "+task.languageReminder;
  const phys=document.createElement("p");phys.className="muted minor";phys.textContent="Physics/evidence check: "+task.physicsReminder;
  root.append(sub,prompt,lang,phys);
  const saved=getRecord(task.id)||{text:"",checked:[],updatedAt:""};
  const textLabel=document.createElement("label");textLabel.textContent="Your writing draft";textLabel.htmlFor="writing-text";
  textLabel.style.display="block";textLabel.style.fontWeight="650";
  const area=document.createElement("textarea");area.id="writing-text";area.rows=8;
  area.maxLength=MAX_WRITING_CHARS;area.value=saved.text||"";
  area.style.display="block";area.style.width="100%";area.style.margin="8px 0";
  area.style.padding="12px";area.style.border="1px solid #9eb5c4";area.style.borderRadius="8px";
  area.setAttribute("spellcheck","true");
  const count=document.createElement("p");count.className="muted minor";count.setAttribute("role","status");
  const goal=()=>{const words=countWords(area.value);
   count.textContent=words+" words · suggested practice length: "+task.targetWords[0]+"–"+task.targetWords[1]+
    ". Length is guidance, not a grade."};
  goal();root.append(textLabel,area,count);
  const checklist=document.createElement("fieldset");const legend=document.createElement("legend");
  legend.textContent="Self-review before finishing";checklist.append(legend);
  const checks=new Set(saved.checked||[]);
  function updateRecord(){
   const record={text:area.value,checked:[...checks],updatedAt:new Date().toISOString()};
   onChange(task.id,record);formStatus.textContent="Unsaved changes — saving privately…";
   const thisRevision=++revision;clearTimer();
   pending=setTimeout(async()=>{
    pending=null;const ok=await onSave();
    if(thisRevision===revision&&formStatus)formStatus.textContent=ok?"Draft saved in this browser.":"Save failed. Export your progress or try again.";
   },500);
  }
  for(const key of CHECKS){
   const row=document.createElement("label");row.className="option";
   const box=document.createElement("input");box.type="checkbox";box.checked=checks.has(key);
   box.onchange=()=>{box.checked?checks.add(key):checks.delete(key);updateRecord();};
   row.append(box,document.createTextNode(" "+catalog.rubric[key]));checklist.append(row);
  }
  root.append(checklist);
  formStatus=document.createElement("p");formStatus.className="muted minor";formStatus.setAttribute("role","status");
  formStatus.textContent=saved.updatedAt?"Previously saved locally: "+new Date(saved.updatedAt).toLocaleString():"No saved draft yet.";
  const save=document.createElement("button");save.className="btn";save.type="button";save.textContent="Save draft now";
  save.onclick=async()=>{
   clearTimer();onChange(task.id,{text:area.value,checked:[...checks],updatedAt:new Date().toISOString()});
   const ok=await onSave();formStatus.textContent=ok?"Draft saved in this browser.":"Unable to save; please export your progress.";
  };
  const reset=document.createElement("button");reset.className="btn light warn";reset.type="button";
  reset.textContent="Clear this writing draft";
  reset.onclick=async()=>{
   if(!window.confirm("Delete the text and self-checks for this writing task?"))return;
   clearTimer();checks.clear();area.value="";onChange(task.id,{text:"",checked:[],updatedAt:new Date().toISOString()});
   const ok=await onSave();goal();
   formStatus.textContent=ok?"Writing draft cleared and saved.":"Draft cleared in memory; local save may have failed.";
   renderTask(unitId);
  };
  area.addEventListener("input",()=>{goal();updateRecord();});
  area.addEventListener("blur",()=>{if(pending!==null){clearTimer();void onSave();}});
  root.append(save,reset,formStatus);
  const disclaimer=document.createElement("p");disclaimer.className="muted minor";
  disclaimer.textContent="Checking boxes records your own reflection, not a verified assessment. Sharing a browser profile also shares its saved writing drafts.";
  root.append(disclaimer);
 }
 return {
  setUnit(unitId){if(unitId!==currentUnit){clearTimer();renderTask(unitId);}else if(!root.children.length)renderTask(unitId);},
  getTaskIds(){return new Set(Object.values(tasksByUnit).flat().map(t=>t.id));}
 };
}
