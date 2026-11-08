import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {countWords,validateWritingCatalog,validateWritingRecords,MAX_WRITING_CHARS} from "../writing.mjs";

const dir=dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(readFileSync(resolve(dir,"../data/writing.json"),"utf8"));
const taskIds=new Set(Object.values(catalog.units).flat().map(task=>task.id));

test("all twelve A2 units have two original guided-writing tasks",()=>{
 assert.deepEqual(validateWritingCatalog(catalog),[]);
 assert.equal(taskIds.size,24);
 assert.equal(Object.keys(catalog.units).length,12);
 for(const unit of Object.values(catalog.units))
  for(const task of unit){
   assert.equal(task.automaticGrade,false);
   assert.equal(task.reviewStatus,"draft");
   assert.ok(task.physicsReminder.length>18);
  }
});

test("writing word count is descriptive, never a proficiency grade",()=>{
 assert.equal(countWords(""),0);
 assert.equal(countWords("  The cart moved 2 m. "),5);
 assert.equal(countWords("The\ncart  stopped."),3);
});

test("old progress without writing is accepted",()=>{
 assert.equal(validateWritingRecords(undefined,taskIds),true);
 assert.equal(validateWritingRecords({},taskIds),true);
});

test("valid local writing and self-checks can be restored",()=>{
 const sample={"A2.01.WRITE.01":{text:"I study physics and I like laboratory work.",checked:["task","clarity"],updatedAt:"2026-11-09T00:00:00.000Z"}};
 assert.equal(validateWritingRecords(sample,taskIds),true);
});

test("writing import rejects unknown IDs, oversized responses, and forged checklist keys",()=>{
 const original={text:"Hi",checked:["task"],updatedAt:"2026-11-09T00:00:00.000Z"};
 assert.equal(validateWritingRecords({"A2.99.WRITE.01":original},taskIds),false);
 assert.equal(validateWritingRecords({"A2.01.WRITE.01":{...original,text:"x".repeat(MAX_WRITING_CHARS+1)}},taskIds),false);
 assert.equal(validateWritingRecords({"A2.01.WRITE.01":{...original,checked:["mastery"]}},taskIds),false);
 assert.equal(validateWritingRecords({"A2.01.WRITE.01":{...original,checked:["task","task"]}},taskIds),false);
 assert.equal(validateWritingRecords({"A2.01.WRITE.01":{...original,updatedAt:"bad"}},taskIds),false);
});

test("invalid or autograded writing catalog must never be mounted",()=>{
 const changed=structuredClone(catalog);changed.units["A2.01"][0].automaticGrade=true;
 assert.ok(validateWritingCatalog(changed).some(s=>s.includes("evaluation contract")));
});
