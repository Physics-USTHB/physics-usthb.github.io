// English for Physicists — formative study suggestions from local first attempts.
// Suggestions are NOT a diagnosis, independent assessment or CEFR mastery.
export function validateRemediationCatalog(catalog, units = []) {
  const errors=[];
  if (!catalog || catalog.schemaVersion !== 1 || catalog.reviewStatus !== "draft" || !catalog.units)
    return ["Invalid remediation catalog"];
  for(let n=1;n<=12;n++){
    const id="A2."+String(n).padStart(2,"0");
    const guide=catalog.units[id];
    if(!guide || typeof guide !== "object"){errors.push(id+": missing guide");continue;}
    for(const [skill,entry] of Object.entries(guide)){
      if(!/^[a-z]+(?:-[a-z]+)*$/.test(skill) || !entry ||
         typeof entry.title!=="string" || entry.title.length<10 ||
         !Array.isArray(entry.steps) || entry.steps.length!==2 ||
         entry.steps.some(s=>typeof s!=="string"||s.length<25) ||
         typeof entry.example!=="string" || entry.example.length<15)
        errors.push(id+"."+skill+": invalid guidance");
    }
  }
  for(const unit of units){
    const guide=catalog.units?.[unit.id];
    if(!guide){errors.push(unit.id+": no guide");continue;}
    for(const skill of new Set((unit.items||[]).map(i=>i.skill))){
      if(!guide[skill])errors.push(unit.id+"."+skill+": skill not covered");
    }
  }
  return errors;
}

export function buildFocusedPractice(unit,attempts,remediationCatalog,{limit=3}={}){
  if(!unit || !Array.isArray(unit.items) || !Array.isArray(attempts) || !Number.isInteger(limit)||limit<1||limit>12)
    throw Error("Invalid formative practice inputs");
  const items=new Map(unit.items.map(i=>[i.id,i]));
  const first=new Map();
  for(const attempt of attempts){
    if(!attempt || attempt.first!==true || typeof attempt.id!=="string" ||
       !items.has(attempt.id) || first.has(attempt.id))continue;
    if(typeof attempt.correct !== "boolean")continue;
    first.set(attempt.id,attempt);
  }
  const bySkill=new Map();
  for(const item of unit.items){
    if(!bySkill.has(item.skill))bySkill.set(item.skill,[]);
    bySkill.get(item.skill).push(item);
  }
  const suggestions=[];
  for(const [skill,candidates] of bySkill){
    const studied=candidates.filter(i=>first.has(i.id));
    const missed=studied.filter(i=>first.get(i.id).correct===false);
    if(!missed.length)continue;
    const familyCounts=new Map();
    for(const item of missed)familyCounts.set(item.family,(familyCounts.get(item.family)||0)+1);
    const primaryFamily=[...familyCounts].sort((a,b)=>b[1]-a[1])[0][0];
    const familyMiss=missed.find(i=>i.family===primaryFamily);
    // Prefer an unattempted question in exactly the same target family.
    // Do not show the correct answer or use a retry as independent evidence.
    let target=candidates.find(i=>i.family===primaryFamily && !first.has(i.id));
    let nextMode="new_item";
    if(!target)target=candidates.find(i=>!first.has(i.id));
    if(!target){target=familyMiss;nextMode="retry";}
    const guide=remediationCatalog?.units?.[unit.id]?.[skill]||null;
    const label=guide?.title||("Review "+skill.replace(/-/g," "));
    const sourceId=target.sourceId || familyMiss.sourceId || null;
    suggestions.push({
      unitId:unit.id,skill,kind:"formative_practice_suggestion",
      title:label,
      attemptedFirst:studied.length,
      missedFirst:missed.length,
      targetFamily:primaryFamily,
      itemId:target.id,
      nextMode,sourceId,
      steps:guide?.steps||["Reread the relevant lesson notes and locate an example in the source.",
        "Try the next practice question, and compare the result with the explanation."],
      example:guide?.example||null
    });
  }
  suggestions.sort((a,b)=>b.missedFirst-a.missedFirst ||
    (b.missedFirst/b.attemptedFirst)-(a.missedFirst/a.attemptedFirst) ||
    a.skill.localeCompare(b.skill));
  const total=[...first.values()];
  return {
    unitId:unit.id,
    status:"formative_only",
    firstAttempted:total.length,
    firstCorrect:total.filter(a=>a.correct===true).length,
    recommendations:suggestions.slice(0,limit),
    isDiagnosis:false,certified:false
  };
}
