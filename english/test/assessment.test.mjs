// Run: node --test english/test/assessment.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {normalizeAnswer,validateUnit,gradeItem,nextReview,summarizeEvidence,weaknessHypothesis} from "../assessment.mjs";
const dir=dirname(fileURLToPath(import.meta.url));
const unit=JSON.parse(readFileSync(resolve(dir,"../data/a2-01.json"),"utf8"));
const unit2=JSON.parse(readFileSync(resolve(dir,"../data/a2-02.json"),"utf8"));

test("authored unit validates; IDs are unique, references and answers exist",()=>{
 assert.deepEqual(validateUnit(unit),[]);
 assert.deepEqual(validateUnit(unit2),[]);
 assert.equal(unit.items.length,34);
 assert.equal(unit2.items.length,34);
 assert.equal(new Set(unit.items.map(i=>i.id)).size,unit.items.length);
 assert.ok(unit.items.every(i=>i.status==="draft"));
 assert.ok(unit2.items.every(i=>i.status==="draft"));
 assert.equal(new Set([...unit.items,...unit2.items].map(i=>i.id)).size,68);
});

test("normalization accepts case, terminal punctuation, Unicode quote variants",()=>{
 assert.equal(normalizeAnswer("  DO.  "),"do");
 assert.equal(normalizeAnswer(" Maya’s sister. "),"maya's sister");
});

test("first attempt and hint independence cannot inflate quality evidence",()=>{
 const item={...unit.items[0],status:"reviewed"};
 assert.equal(gradeItem(item,"am",{firstAttempt:true,hintsUsed:0}).qualityEligible,true);
 assert.equal(gradeItem(item,"am",{firstAttempt:false,hintsUsed:0}).qualityEligible,false);
 assert.equal(gradeItem(item,"am",{firstAttempt:true,hintsUsed:1}).qualityEligible,false);
 assert.equal(gradeItem(item,"am",{firstAttempt:true,hintsUsed:0,solutionShown:true}).qualityEligible,false);
 assert.equal(gradeItem(unit.items[0],"am",{firstAttempt:true,hintsUsed:0}).qualityEligible,false);
});

test("responses are correctly graded only for exact accepted alternatives",()=>{
 const item=unit.items.find(i=>i.id==="A2.01.READ.004");
 assert.equal(gradeItem(item,"10:00 a.m.",{firstAttempt:true,hintsUsed:0}).correct,true);
 assert.equal(gradeItem(item,"11:00",{firstAttempt:true,hintsUsed:0}).correct,false);
});

test("review intervals expand and a lapse restarts spacing",()=>{
 const start="2026-11-08T12:00:00.000Z";
 const a=nextReview(null,true,start);
 assert.equal(a.step,0);
 assert.equal(a.dueAt,"2026-11-09T12:00:00.000Z");
 const b=nextReview(a,true,a.dueAt);
 assert.equal(b.step,1);
 assert.equal(b.dueAt,"2026-11-12T12:00:00.000Z");
 const c=nextReview(b,false,b.dueAt);
 assert.equal(c.step,0);assert.equal(c.lapses,1);
 assert.throws(()=>nextReview(null,true,"invalid"),/Invalid clock/);
});

test("draft work is formative only; no CEFR mastery or diagnostic claim",()=>{
 const a=unit.items.find(i=>i.id==="A2.01.BE.001");
 const event={id:a.id,at:"2026-11-08T12:00:00.000Z",answer:"is",correct:false,first:true,independent:true,hintsUsed:0};
 const s=summarizeEvidence([event],unit.items);
 assert.equal(s.grammar.state,"formative_evidence_only");
 assert.equal(s.grammar.independentErrorFamilies,0);
 assert.equal(weaknessHypothesis([event],unit.items,"grammar").status,"insufficient_evidence");
 assert.equal(weaknessHypothesis([event],unit.items,"grammar").certified,false);
});

test("review suggestion requires errors across distinct families and days",()=>{
 const subset=unit.items.filter(x=>x.skill==="grammar").slice(0,18).map(x=>({...x,status:"reviewed"}));
 const unique=[];
 for(const x of subset)if(!unique.some(y=>y.family===x.family))unique.push(x);
 const events=unique.slice(0,4).map((x,i)=>({id:x.id,first:true,independent:true,hintsUsed:0,
  at:i%2?"2026-11-09T10:00:00Z":"2026-11-08T10:00:00Z",correct:i===3}));
 const d=weaknessHypothesis(events,subset,"grammar");
 assert.equal(d.observedFamilies,4);
 assert.equal(d.errorFamilies,3);
 assert.equal(d.errorDates,2);
 assert.equal(d.status,"review_suggested");
 assert.equal(d.diagnosis,"none");
});


test("static course entry point references available scripts and has no missing DOM IDs",()=>{
 const html=readFileSync(resolve(dir,"../index.html"),"utf8");
 const app=readFileSync(resolve(dir,"../app.js"),"utf8");
 const ids=[...app.matchAll(/\$\("([^"]+)"\)/g)].map(m=>m[1]);
 for(const id of new Set(ids)) assert.ok(html.includes('id="'+id+'"'),"missing DOM id: "+id);
 assert.match(app,/loadAuthoredUnits\(\)/);
 assert.match(app,/state\.reviews/);
 assert.match(html,/Draft only/);
});


test("SI symbols retain case-sensitive meanings while ordinary English is case-insensitive",()=>{
 const kelvin=unit2.items.find(i=>i.id==="A2.02.UNITS.004");
 assert.equal(kelvin.caseSensitive,true);
 assert.equal(gradeItem(kelvin,"K",{firstAttempt:true,hintsUsed:0}).correct,true);
 assert.equal(gradeItem(kelvin,"k",{firstAttempt:true,hintsUsed:0}).correct,false);
 const length=unit2.items.find(i=>i.id==="A2.02.READ.001");
 assert.equal(gradeItem(length,"0.35 m",{firstAttempt:true,hintsUsed:0}).correct,true);
 assert.equal(gradeItem(length,"0.35 M",{firstAttempt:true,hintsUsed:0}).correct,false);
 const plain=unit.items.find(i=>i.id==="A2.01.BE.001");
 assert.equal(gradeItem(plain,"AM",{firstAttempt:true,hintsUsed:0}).correct,true);
});


test("every A2 unit contains valid original draft practice and no reserved checkpoint prompts",()=>{
 const dirRoot=resolve(dir,"../data");
 const files=readdirSync(dirRoot).filter(x=>/^a2-\d{2}\.json$/.test(x)).sort();
 assert.equal(files.length,12);
 const globalIds=new Set(),total=[];
 for(const [i,name] of files.entries()){
  assert.equal(name,"a2-"+String(i+1).padStart(2,"0")+".json");
  const course=JSON.parse(readFileSync(resolve(dirRoot,name),"utf8"));
  assert.equal(course.id,"A2."+String(i+1).padStart(2,"0"));
  assert.deepEqual(validateUnit(course),[],name+" invalid");
  assert.ok(course.items.length>=20,"not enough practice in "+name);
  for(const item of course.items){
   assert.ok(!globalIds.has(item.id),"duplicate item "+item.id);
   globalIds.add(item.id);total.push(item);
   assert.equal(item.status,"draft");
   assert.doesNotMatch(item.prompt,/CHECKPOINT|DELAYED|HOLDOUT|RESERVED/i);
   assert.equal(item.media,"text");
   if(item.caseSensitive)assert.equal(item.type,"single_choice");
  }
 }
 assert.ok(total.length>=350,"too few imported draft items");
});

test("teaching notes exist for all A2 units without proficiency promises",()=>{
 const notes=JSON.parse(readFileSync(resolve(dir,"../data/concepts.json"),"utf8"));
 assert.equal(notes.schemaVersion,1);
 assert.equal(Object.keys(notes.units).length,12);
 for(let i=1;i<=12;i++){
  const entry=notes.units["A2."+String(i).padStart(2,"0")];
  assert.ok(entry?.goal.length>=20);
  assert.ok(entry?.pronunciation.length>=20);
  assert.ok(entry?.notes.length>=3);
 }
});
