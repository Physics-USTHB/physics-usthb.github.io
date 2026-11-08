// ALAE v0.2 — deterministic, privacy-preserving assessment helpers.
// Development only. "Mastery" is deliberately NOT inferred from draft questions.
export const REVIEW_DAYS = Object.freeze([1,3,7,14,30,60]);
export const ITEM_TYPES = Object.freeze(["single_choice","short_answer"]);
export const SKILLS = Object.freeze(["grammar","vocabulary","reading","mathematical-english","scientific-discourse","writing","listening","speaking","pronunciation","mediation"]);

export function normalizeAnswer(value) {
  return String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019]/g,"'").replace(/\s+/g," ").replace(/[.!?]+$/,"");
}

export function normalizeCaseSensitive(value){
  return String(value ?? "").normalize("NFKC").trim()
    .replace(/[\u2018\u2019]/g,"'").replace(/\s+/g," ").replace(/[.!?]+$/,"");
}

export function validateUnit(unit) {
  const errors=[];
  if(!unit || unit.schemaVersion!==1 || !/^A2\.\d{2}$/.test(unit.id||"")) return ["Invalid unit identity or schemaVersion"];
  if(!Array.isArray(unit.sources) || !Array.isArray(unit.items)) return ["Sources and items must be arrays"];
  const sources=new Set(),ids=new Set();
  for(const s of unit.sources) {
    if(!s || !/^[A-Z]\d+$/.test(s.id||"") || typeof s.title!=="string" ||
      !Array.isArray(s.paragraphs)||s.paragraphs.some(p=>typeof p!=="string")) errors.push("Invalid source");
    else if(sources.has(s.id)) errors.push("Duplicate source "+s.id);
    else sources.add(s.id);
  }
  for(const item of unit.items) {
    const at=item?.id||"unknown";
    if(!item || typeof at!=="string" || !at.startsWith(unit.id+".") || ids.has(at)) {errors.push("Missing/duplicate/foreign item "+at);continue;}
    ids.add(at);
    if(!ITEM_TYPES.includes(item.type)) errors.push(at+" unsupported type");
    if(!SKILLS.includes(item.skill)) errors.push(at+" unknown skill");
    if(typeof item.family!=="string" || !item.family.startsWith(unit.id+".")) errors.push(at+" invalid family");
    if(!["draft","reviewed"].includes(item.status)) errors.push(at+" missing review status");
    if(typeof item.prompt!=="string" || item.prompt.trim().length<8) errors.push(at+" invalid prompt");
    if(item.sourceId && !sources.has(item.sourceId)) errors.push(at+" source not found");
    if(item.media!=="text") errors.push(at+" blocked media (audio not produced)");
    if(!Array.isArray(item.accepted)||!item.accepted.length||item.accepted.some(a=>typeof a!=="string"||!a.trim()))errors.push(at+" invalid answers");
    if(typeof item.feedback!=="string"||item.feedback.trim().length<12) errors.push(at+" missing feedback");
    if(item.type==="single_choice") {
      const norm=item.caseSensitive===true?normalizeCaseSensitive:normalizeAnswer;
      if(!Array.isArray(item.options)||item.options.length<2||new Set(item.options.map(norm)).size!==item.options.length)errors.push(at+" invalid choices");
      else if(item.accepted.some(a=>!item.options.some(o=>norm(o)===norm(a))))errors.push(at+" answer absent from choices");
    }
  }
  return errors;
}

export function gradeItem(item, answer, ctx={}) {
  if(!item || !ITEM_TYPES.includes(item.type) || !Array.isArray(item.accepted)) throw Error("Unscoreable item");
  const norm=item.caseSensitive===true?normalizeCaseSensitive:normalizeAnswer;
  const normalized=norm(answer);
  const correct=item.accepted.some(a=>norm(a)===normalized);
  const independent=(ctx.firstAttempt===true && ctx.hintsUsed===0 && ctx.solutionShown!==true);
  const qualityEligible=independent && item.status==="reviewed" && item.media==="text";
  return {correct,independent,qualityEligible,skill:item.skill,family:item.family,reviewStatus:item.status};
}

export function nextReview(previous, correct, nowIso) {
  const now=new Date(nowIso);
  if(!Number.isFinite(now.getTime()))throw Error("Invalid clock");
  const prior=previous && Number.isInteger(previous.step) ? previous.step : -1;
  const step=correct?Math.min(prior+1,REVIEW_DAYS.length-1):0;
  const lapses=(previous?.lapses||0)+(correct?0:1);
  const due=new Date(now.getTime()+REVIEW_DAYS[step]*86400000).toISOString();
  return {step,lapses,dueAt:due,reviewedAt:now.toISOString()};
}

export function summarizeEvidence(attempts,items) {
  const byId=new Map(items.map(i=>[i.id,i])),result={};
  for(const item of items){if(!(item.skill in result))result[item.skill]={practised:0,correctFirst:0,eligibleFamilies:new Set(),independentErrors:new Set(),unassessed:true};}
  for(const a of attempts) {
    const item=byId.get(a.id);if(!item||a.first!==true)continue;
    const s=result[item.skill];s.practised++;s.unassessed=false;
    if(a.correct===true)s.correctFirst++;
    if(item.status==="reviewed" && a.independent===true && a.hintsUsed===0) {
      if(a.correct===true)s.eligibleFamilies.add(item.family);
      else s.independentErrors.add(item.family);
    }
  }
  for(const s of Object.values(result)) {
    s.eligibleFamilies=s.eligibleFamilies.size;
    s.independentErrorFamilies=s.independentErrors.size;
    delete s.independentErrors;
    s.state=s.unassessed?"unassessed":"formative_evidence_only";
  }
  return result;
}

export function weaknessHypothesis(attempts, items, skill) {
  const byId=new Map(items.map(i=>[i.id,i]));
  const records=attempts.filter(a=>{
    const i=byId.get(a.id);
    return i?.skill===skill && i.status==="reviewed" && a.first===true &&
      a.independent===true && a.hintsUsed===0;
  });
  const families=new Set(records.map(a=>byId.get(a.id).family));
  const errorFamilies=new Set(records.filter(a=>a.correct===false).map(a=>byId.get(a.id).family));
  const sessionDates=new Set(records.filter(a=>a.correct===false).map(a=>String(a.at).slice(0,10)));
  // A hypothesis is not a diagnosis. Require independent evidence diversity and spaced errors.
  const candidate=families.size>=4 && errorFamilies.size>=3 && sessionDates.size>=2;
  return {status:candidate?"review_suggested":"insufficient_evidence",
    observedFamilies:families.size,errorFamilies:errorFamilies.size,errorDates:sessionDates.size,
    diagnosis:"none",certified:false};
}
