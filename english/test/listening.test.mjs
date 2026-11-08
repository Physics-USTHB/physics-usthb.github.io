import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {validateListeningCatalog,listeningQuestionIds} from "../listening.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const data=JSON.parse(readFileSync(resolve(root,"data/listening.json"),"utf8"));
const scenes=Object.values(data.units).flat();
const questions=scenes.flatMap(scene=>scene.questions);

test("all A2 modules have two original dialogues with two formative checks each",()=>{
 assert.deepEqual(validateListeningCatalog(data),[]);
 assert.equal(Object.keys(data.units).length,12);
 assert.equal(scenes.length,24);
 assert.equal(questions.length,48);
 assert.equal(listeningQuestionIds(data).size,48);
 for(const unit of Object.values(data.units)){
  assert.equal(unit.length,2);
 }
});

test("pronunciation excerpts occur verbatim in their original dialogue",()=>{
 for(const scene of scenes){
  const spoken=scene.turns.map(t=>t.text).join(" ");
  assert.ok(spoken.includes(scene.pronunciation.phrase),scene.id);
  assert.equal(scene.pronunciation.assessment,"self_review_only");
 }
});

test("all questions remain optional synthetic/transcript comprehension only",()=>{
 for(const q of questions){
  assert.equal(q.media,"synthetic_speech_or_transcript");
  assert.equal(q.status,"draft");
  assert.equal(q.diagnosticEligible,false);
  assert.equal(q.options.length,3);
  assert.equal(new Set(q.options).size,3);
  assert.deepEqual(q.accepted,[q.options[0]]);
 }
 assert.equal(data.audioStatus,"synthetic_browser_voice_only");
 assert.equal(data.assessmentStatus,"formative_not_CEFR");
});

test("validators block unsupported audio claims and mismatched answers",()=>{
 const modified=structuredClone(data);
 modified.audioStatus="original_certified_audio";
 assert.ok(validateListeningCatalog(modified).length);
 const broken=structuredClone(data);
 broken.units["A2.06"][0].questions[0].accepted=["not an option"];
 assert.ok(validateListeningCatalog(broken).length);
});

test("validators block missing scenes, duplicate ids and ungrounded pronunciation",()=>{
 const removed=structuredClone(data);
 removed.units["A2.07"].pop();
 assert.ok(validateListeningCatalog(removed).length);
 const duplicate=structuredClone(data);
 duplicate.units["A2.03"][1].questions[0].id=duplicate.units["A2.03"][0].questions[0].id;
 assert.ok(validateListeningCatalog(duplicate).length);
 const badPron=structuredClone(data);
 badPron.units["A2.02"][0].pronunciation.phrase="An unrelated example that was not spoken at all.";
 assert.ok(validateListeningCatalog(badPron).length);
});

test("static listening lesson code never claims an audio grade or sends transcripts to APIs",()=>{
 const module=readFileSync(resolve(root,"listening.mjs"),"utf8");
 assert.doesNotMatch(module,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b/);
 assert.match(module,/independent:false/);
 assert.match(module,/hintsUsed:/);
 assert.match(module,/transcript\.open/);
 assert.match(module,/SpeechSynthesisUtterance/);
 assert.match(module,/not a certified listening test/i);
});
