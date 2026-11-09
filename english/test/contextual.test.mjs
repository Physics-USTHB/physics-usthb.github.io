import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {validateContextualPack,extendUnitWithContext,CONTEXTUAL_ITEM_COUNT} from "../contextual.mjs";
import {validateUnit,gradeItem} from "../assessment.mjs";
import {validateRemediationCatalog} from "../remediation.mjs";
const dir=dirname(fileURLToPath(import.meta.url));
const load=path=>JSON.parse(readFileSync(resolve(dir,path),"utf8"));
const pack=load("../data/contextual-practice.json");
const old=Array.from({length:12},(_,i)=>load("../data/a2-"+String(i+1).padStart(2,"0")+".json"));
const guides=load("../data/remediation.json");
const combined=old.map(u=>extendUnitWithContext(u,pack));

test("twelve contextual sources and 72 original formative items validate without ID collisions",()=>{
 assert.equal(CONTEXTUAL_ITEM_COUNT,72);
 assert.deepEqual(validateContextualPack(pack,old),[]);
 assert.equal(Object.keys(pack.units).length,12);
 assert.equal(Object.values(pack.units).flatMap(u=>u.items).length,72);
 assert.equal(Object.values(pack.units).flatMap(u=>u.sources).length,12);
});

test("every merged unit keeps original IDs and reading sources exactly intact",()=>{
 const ids=new Set();
 for(let n=0;n<12;n++){
  const unit=combined[n],original=old[n];
  assert.equal(unit.sources.length,original.sources.length+1);
  assert.equal(unit.items.length,original.items.length+6);
  assert.deepEqual(unit.items.slice(0,original.items.length),original.items);
  assert.deepEqual(unit.sources.slice(0,original.sources.length),original.sources);
  assert.deepEqual(validateUnit(unit),[]);
  for(const item of unit.items){
   assert.ok(!ids.has(item.id),"Duplicate item ID across units "+item.id);
   ids.add(item.id);
  }
 }
 assert.equal(ids.size,555);
 assert.equal(combined.reduce((n,u)=>n+u.sources.length,0),60);
});

test("contextual exercises support all six designated practice slots per unit",()=>{
 for(const unit of combined){
  const extra=unit.items.filter(i=>i.importStatus==="new_original_contextual_practice");
  assert.deepEqual(extra.map(x=>x.skill),["reading","reading","grammar","vocabulary","mathematical-english","scientific-discourse"]);
  for(const item of extra){
   assert.equal(item.status,"draft");
   assert.equal(item.media,"text");
   assert.equal(item.sourceId,"R5");
   assert.equal(gradeItem(item,item.accepted[0],{firstAttempt:true,hintsUsed:0}).qualityEligible,false);
  }
 }
});

test("new skill-level remediation coverage includes evidence statements and numeracy",()=>{
 assert.deepEqual(validateRemediationCatalog(guides,combined),[]);
 for(const unit of combined){
  assert.ok(guides.units[unit.id]["scientific-discourse"]);
  assert.ok(guides.units[unit.id]["mathematical-english"]);
 }
 assert.equal(Object.values(guides.units).reduce((n,u)=>n+Object.keys(u).length,0),60);
});

test("manual numerical source-to-answer audit covers each new mini-source",()=>{
 const expected={
  "A2.01":"14:00",
  "A2.02":"0.25 kg",
  "A2.03":"3",
  "A2.04":"2 m",
  "A2.05":"2 cm",
  "A2.06":"3",
  "A2.07":"1.5 s",
  "A2.08":"0.5 °C",
  "A2.09":"1.0 m",
  "A2.10":"8 m",
  "A2.11":"4 °C",
  "A2.12":"3.0 m"
 };
 for(const [id,answer] of Object.entries(expected)){
  const question=pack.units[id].items[4];
  assert.equal(question.skill,"mathematical-english");
  assert.deepEqual(question.accepted,[answer],"Incorrect numerical answer in "+id);
  assert.equal(gradeItem(question,answer,{firstAttempt:true,hintsUsed:0}).correct,true);
  for(const alt of question.options.filter(x=>x!==answer))
   assert.equal(gradeItem(question,alt,{firstAttempt:true,hintsUsed:0}).correct,false);
 }
});

test("bad source IDs, duplicated prompts and non-formative flags are rejected",()=>{
 const mislinked=structuredClone(pack);
 mislinked.units["A2.04"].items[0].sourceId="R9";
 assert.ok(validateContextualPack(mislinked).length>0);
 const dup=structuredClone(pack);
 dup.units["A2.02"].items[1].prompt=dup.units["A2.01"].items[1].prompt;
 assert.ok(validateContextualPack(dup).some(x=>x.includes("duplicated prompt")));
 const master=structuredClone(pack);
 master.units["A2.08"].items[0].status="reviewed";
 assert.ok(validateContextualPack(master).length>0);
});

test("attempt histories for existing exercise IDs remain meaningful after extension",()=>{
 const id="A2.01.BE.001",base=old[0].items.find(i=>i.id===id),extended=combined[0].items.find(i=>i.id===id);
 assert.deepEqual(base,extended);
 const oldAttempt={id,answer:"am",first:true,correct:true};
 assert.equal(gradeItem(extended,oldAttempt.answer).correct,true);
});
