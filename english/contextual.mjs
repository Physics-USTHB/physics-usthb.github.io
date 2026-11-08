// Original A2 contextual practice bundle integration.
// Maintains stable older item IDs and browser-local first-attempt history.
import {validateUnit,normalizeAnswer} from "./assessment.mjs";

const REQUIRED_SKILLS=Object.freeze(["reading","reading","grammar","vocabulary","mathematical-english","scientific-discourse"]);
export const CONTEXTUAL_ITEM_COUNT=72;

export function validateContextualPack(pack,originalUnits=[]){
 const errors=[];
 if(!pack||pack.schemaVersion!==1||pack.contentStatus!=="draft"||
    pack.educationalUse!=="formative_practice_only"||pack.media!=="text"||
    !pack.units||typeof pack.units!=="object"||Array.isArray(pack.units))
   return ["Invalid contextual learning package header"];
 if(Object.keys(pack.units).length!==12)errors.push("Expected exactly 12 contextual units");
 const globalIds=new Set(),allPrompts=new Set();
 let total=0;
 for(let n=1;n<=12;n++){
  const id="A2."+String(n).padStart(2,"0");
  const unit=pack.units[id];
  if(!unit||!Array.isArray(unit.sources)||unit.sources.length!==1||
      !Array.isArray(unit.items)||unit.items.length!==6) {
   errors.push(id+": expected one source and six items");continue;
  }
  const src=unit.sources[0];
  if(src?.id!=="R5"||typeof src.title!=="string"||src.title.length<16||
     !Array.isArray(src.paragraphs)||src.paragraphs.length!==2||
     src.paragraphs.some(x=>typeof x!=="string"||x.length<90))
    errors.push(id+": incomplete unique source");
  for(let i=0;i<unit.items.length;i++){
   const item=unit.items[i],exactId=id+".CTX."+String(i+1).padStart(3,"0");
   if(!item||item.id!==exactId||globalIds.has(exactId)){
    errors.push(exactId+": duplicate/incorrect ID");continue;
   }
   globalIds.add(exactId);total++;
   if(item.skill!==REQUIRED_SKILLS[i]||item.type!=="single_choice"||
      !item.family?.startsWith(id+".CTX.") ||
      item.status!=="draft"||item.media!=="text"||item.sourceId!=="R5"||
      item.importStatus!=="new_original_contextual_practice"||
      typeof item.prompt!=="string"||item.prompt.length<25||
      typeof item.feedback!=="string"||item.feedback.length<25||
      !Array.isArray(item.options)||item.options.length!==3||
      new Set(item.options.map(normalizeAnswer)).size!==3 ||
      !Array.isArray(item.accepted)||item.accepted.length!==1||
      !item.options.some(x=>normalizeAnswer(x)===normalizeAnswer(item.accepted[0])))
    errors.push(exactId+": invalid or unreviewed rubric contract");
   if(typeof item.prompt==="string"){
    const key=normalizeAnswer(item.prompt);
    if(allPrompts.has(key))errors.push(exactId+": duplicated prompt");
    allPrompts.add(key);
   }
  }
 }
 if(total!==CONTEXTUAL_ITEM_COUNT)errors.push("Expected "+CONTEXTUAL_ITEM_COUNT+" new items");
 for(const original of originalUnits){
  const extra=pack.units[original?.id];
  if(!extra){errors.push("No contextual material for "+original?.id);continue;}
  const oldIds=new Set((original.items||[]).map(x=>x.id));
  const oldSources=new Set((original.sources||[]).map(x=>x.id));
  if(extra.items.some(x=>oldIds.has(x.id)))errors.push(original.id+": duplicated earlier exercise IDs");
  if(extra.sources.some(x=>oldSources.has(x.id)))errors.push(original.id+": duplicated earlier source IDs");
 }
 return errors;
}

export function extendUnitWithContext(unit,pack){
 const extra=pack?.units?.[unit?.id];
 if(!extra)return unit;
 if(!Array.isArray(unit.sources)||!Array.isArray(unit.items))throw Error("Invalid base course unit");
 const result={...unit,
  sources:[...unit.sources,...extra.sources],
  items:[...unit.items,...extra.items]
 };
 const issues=validateUnit(result);
 if(issues.length)throw Error("Contextual integration failed for "+unit.id+": "+issues.slice(0,4).join("; "));
 return result;
}
