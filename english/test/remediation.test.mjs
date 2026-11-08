import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {validateRemediationCatalog,buildFocusedPractice} from "../remediation.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const load=n=>JSON.parse(readFileSync(resolve(root,"data/a2-"+String(n).padStart(2,"0")+".json"),"utf8"));
const guides=JSON.parse(readFileSync(resolve(root,"data/remediation.json"),"utf8"));
const units=Array.from({length:12},(_,i)=>load(i+1));
const attempt=(id,correct,first=true)=>({id,at:"2026-11-09T10:00:00.000Z",first,correct,answer:"sample"});

test("every active A2 skill has a concrete short remedial lesson",()=>{
 assert.deepEqual(validateRemediationCatalog(guides,units),[]);
 assert.equal(Object.keys(guides.units).length,12);
 assert.ok(Object.values(guides.units).reduce((n,u)=>n+Object.keys(u).length,0)>=39);
});

test("no wrong first attempts means no targeted claim or diagnosis",()=>{
 const unit=load(1);
 const none=buildFocusedPractice(unit,[],guides);
 assert.equal(none.firstAttempted,0);
 assert.equal(none.recommendations.length,0);
 assert.equal(none.certified,false);
 assert.equal(none.isDiagnosis,false);
 const correct=buildFocusedPractice(unit,[attempt("A2.01.BE.001",true)],guides);
 assert.equal(correct.recommendations.length,0);
});

test("incorrect first grammar response selects an unseen member of the same family",()=>{
 const unit=load(1);
 const plan=buildFocusedPractice(unit,[attempt("A2.01.BE.001",false)],guides);
 assert.equal(plan.status,"formative_only");
 assert.equal(plan.firstAttempted,1);
 assert.equal(plan.firstCorrect,0);
 assert.equal(plan.recommendations.length,1);
 const rec=plan.recommendations[0];
 assert.equal(rec.skill,"grammar");
 assert.equal(rec.targetFamily,"A2.01.BE.agreement");
 assert.equal(rec.itemId,"A2.01.BE.002");
 assert.equal(rec.nextMode,"new_item");
 assert.equal(rec.missedFirst,1);
 assert.ok(rec.steps.some(s=>s.includes("am")));
 assert.ok(!("accepted" in rec));
});

test("retries and duplicate first flags never become new independent evidence",()=>{
 const unit=load(1);
 const entries=[
   attempt("A2.01.BE.001",false,true),
   attempt("A2.01.BE.001",true,false),
   attempt("A2.01.BE.001",true,true),
   attempt("A2.01.BE.002",true,true)
 ];
 const plan=buildFocusedPractice(unit,entries,guides);
 assert.equal(plan.firstAttempted,2);
 assert.equal(plan.firstCorrect,1);
 assert.equal(plan.recommendations[0].missedFirst,1);
 assert.equal(plan.recommendations[0].itemId,"A2.01.BE.003");
});

test("cross-unit mistakes and unsupported imported IDs are ignored",()=>{
 const plan=buildFocusedPractice(load(2),[
  attempt("A2.01.BE.001",false),
  attempt("INVALID.FORGED",false)
 ],guides);
 assert.equal(plan.firstAttempted,0);
 assert.equal(plan.recommendations.length,0);
});

test("reading feedback retains a real source reference",()=>{
 const unit=load(1),target=unit.items.find(x=>x.skill==="reading"&&x.sourceId);
 const plan=buildFocusedPractice(unit,[attempt(target.id,false)],guides);
 const rec=plan.recommendations.find(x=>x.skill==="reading");
 assert.ok(rec);
 assert.match(rec.sourceId||"",/^R[1-4]$/);
 assert.ok(unit.sources.some(x=>x.id===rec.sourceId));
});

test("when no unseen practice exists, recommend a retry, never a fake new item",()=>{
 const unit={id:"A2.01",items:[
  {id:"A2.01.TEST.001",skill:"grammar",family:"A2.01.TEST.a"},
  {id:"A2.01.TEST.002",skill:"grammar",family:"A2.01.TEST.a"}
 ]};
 const plan=buildFocusedPractice(unit,[attempt("A2.01.TEST.001",false),attempt("A2.01.TEST.002",false)],guides);
 assert.equal(plan.recommendations[0].nextMode,"retry");
 assert.equal(plan.recommendations[0].itemId,"A2.01.TEST.001");
});

test("rank repeated correction needs first; clamp recommendation count",()=>{
 const unit={id:"A2.01",items:[
  {id:"A2.01.G1",skill:"grammar",family:"f1"},
  {id:"A2.01.G2",skill:"grammar",family:"f1"},
  {id:"A2.01.R1",skill:"reading",family:"f2"},
  {id:"A2.01.V1",skill:"vocabulary",family:"f3"}
 ]};
 const responses=[attempt("A2.01.G1",false),attempt("A2.01.G2",false),
  attempt("A2.01.R1",false),attempt("A2.01.V1",false)];
 const result=buildFocusedPractice(unit,responses,guides,{limit:2});
 assert.equal(result.recommendations.length,2);
 assert.equal(result.recommendations[0].skill,"grammar");
 assert.equal(result.recommendations[0].missedFirst,2);
 assert.throws(()=>buildFocusedPractice(unit,responses,guides,{limit:0}));
});

test("missing or malformed guided material never passes validation",()=>{
 const broken=structuredClone(guides);
 broken.units["A2.06"].grammar.steps=["unsafe"];
 assert.ok(validateRemediationCatalog(broken,units).length>0);
 const missing=structuredClone(guides);
 delete missing.units["A2.11"]["mathematical-english"];
 assert.ok(validateRemediationCatalog(missing,units).some(e=>e.includes("A2.11.mathematical-english")));
});
