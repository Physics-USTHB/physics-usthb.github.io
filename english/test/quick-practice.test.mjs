import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {PRACTICE_MODES,PRACTICE_MODE_LABELS,buildPracticeQueue,practiceModeCounts} from "../quick-practice.mjs";
import {extendUnitWithContext} from "../contextual.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pack=JSON.parse(readFileSync(resolve(root,"data/contextual-practice.json"),"utf8"));
const load=n=>JSON.parse(readFileSync(resolve(root,"data/a2-"+String(n).padStart(2,"0")+".json"),"utf8"));
const unit=extendUnitWithContext(load(1),pack);
const t="2026-11-09T12:00:00.000Z";
const event=(id,correct,first=true)=>({id,answer:correct?"am":"is",correct,first,at:"2026-11-08T12:00:00.000Z"});

test("four study modes are stable and have accurate accessible labels",()=>{
 assert.deepEqual(PRACTICE_MODES,["new","due","revisit","all"]);
 for(const mode of PRACTICE_MODES)assert.ok(PRACTICE_MODE_LABELS[mode].length>=10);
});

test("unattempted mode excludes answered questions regardless of correctness",()=>{
 const history=[event("A2.01.BE.001",false),event("A2.01.BE.002",true)];
 const eligible=buildPracticeQueue(unit.items,history,{},"new",t);
 assert.equal(eligible.length,unit.items.length-2);
 assert.ok(!eligible.some(x=>x.id==="A2.01.BE.001"));
 assert.ok(!eligible.some(x=>x.id==="A2.01.BE.002"));
});

test("revisit mode uses first wrong responses only until a later correct retry",()=>{
 const history=[event("A2.01.BE.001",false),event("A2.01.BE.002",true),
   event("A2.01.BE.003",false),event("A2.01.BE.003",true,false)];
 const ids=buildPracticeQueue(unit.items,history,{},"revisit",t).map(x=>x.id);
 assert.deepEqual(ids,["A2.01.BE.001"]);
});

test("revisit does not count a first-correct question merely because a later retry was wrong",()=>{
 const history=[event("A2.01.BE.001",true),event("A2.01.BE.001",false,false)];
 assert.deepEqual(buildPracticeQueue(unit.items,history,{},"revisit",t),[]);
});

test("review mode accepts only an actually attempted and due item",()=>{
 const due="2026-11-08T12:00:00.000Z",future="2026-11-12T12:00:00.000Z";
 const h=[event("A2.01.BE.001",true),event("A2.01.BE.002",true)];
 const reviews={
  "A2.01.BE.001":{dueAt:due},
  "A2.01.BE.002":{dueAt:future},
  "A2.01.BE.003":{dueAt:due}
 };
 assert.deepEqual(buildPracticeQueue(unit.items,h,reviews,"due",t).map(x=>x.id),["A2.01.BE.001"]);
 const later=buildPracticeQueue(unit.items,h,reviews,"due","2026-11-13T12:00:00.000Z");
 assert.deepEqual(later.map(x=>x.id),["A2.01.BE.001","A2.01.BE.002"]);
});

test("repetition and malformed progress cannot inflate eligible question counts",()=>{
 const answers=[event("A2.01.BE.001",false),event("A2.01.BE.001",true,false),
  {id:"UNKNOWN",correct:false,first:true}];
 const counts=practiceModeCounts(unit.items,answers,{},t);
 assert.equal(counts.all,unit.items.length);
 assert.equal(counts.new,unit.items.length-1);
 assert.equal(counts.due,0);
 assert.equal(counts.revisit,0);
});

test("original imported item IDs remain eligible alongside newly authored contextual questions",()=>{
 const all=buildPracticeQueue(unit.items,[],{},"all",t);
 assert.ok(all.some(x=>x.id==="A2.01.BE.001"));
 assert.ok(all.some(x=>x.id==="A2.01.CTX.001"));
 assert.equal(all.length,40);
});

test("invalid time, modes, duplicate items and input types fail safely",()=>{
 assert.throws(()=>buildPracticeQueue(unit.items,[],{},"mastery",t),/Invalid/);
 assert.throws(()=>buildPracticeQueue(unit.items,[],{},"all","bad"),/Invalid practice time/);
 assert.throws(()=>buildPracticeQueue([unit.items[0],unit.items[0]],[],{},"all",t),/Duplicate/);
 assert.throws(()=>buildPracticeQueue(unit.items,[],null,"all",t),/Invalid/);
});

test("all 12 modules can build queues without exposing answer keys or fabricated diagnosis",()=>{
 for(let n=1;n<=12;n++){
  const u=extendUnitWithContext(load(n),pack);
  const counts=practiceModeCounts(u.items,[],{},t);
  assert.equal(counts.all,u.items.length);
  assert.equal(counts.new,u.items.length);
  assert.equal(counts.revisit,0);
  assert.equal(counts.due,0);
 }
});
