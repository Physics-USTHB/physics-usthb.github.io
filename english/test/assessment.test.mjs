// Run: node --test english/test/assessment.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {normalizeAnswer,validateUnit,gradeItem,nextReview,summarizeEvidence,weaknessHypothesis} from "../assessment.mjs";
const dir=dirname(fileURLToPath(import.meta.url));
const unit=JSON.parse(readFileSync(resolve(dir,"../data/a2-01.json"),"utf8"));

test("authored unit validates; IDs are unique, references and answers exist",()=>{
 assert.deepEqual(validateUnit(unit),[]);
 assert.equal(unit.items.length,34);
 assert.equal(new Set(unit.items.map(i=>i.id)).size,unit.items.length);
 assert.ok(unit.items.every(i=>i.status==="draft"));
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
