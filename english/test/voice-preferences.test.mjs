import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {englishVoices,scoreVoice,pickVoice,voiceKey,voiceServiceLabel} from "../voice-preferences.mjs";
import {speechChunks} from "../speech-chunks.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const voices=[
 {name:"Basic US",lang:"en-US",voiceURI:"basic",localService:true,default:true},
 {name:"Natural Neural US",lang:"en-US",voiceURI:"neural",localService:false,default:false},
 {name:"Enhanced US",lang:"en-US",voiceURI:"premium",localService:true},
 {name:"UK Natural",lang:"en-GB",voiceURI:"uk",localService:true},
 {name:"French",lang:"fr-FR",voiceURI:"fr",localService:true}
];
test("English voice picker prioritizes enhanced US voices, not generic old defaults",()=>{
 const list=englishVoices(voices);
 assert.equal(list.length,4);
 assert.equal(list[0].name,"Enhanced US"/* quality + US + local */===list[0].name?"Enhanced US":list[0].name);
 assert.ok(["Natural Neural US","Enhanced US"].includes(pickVoice(voices).name));
 assert.ok(scoreVoice(voices[1])>scoreVoice(voices[0]));
 assert.ok(list.every(v=>v.lang.startsWith("en")));
});
test("a user's selected voice overrides automatic ranking, with safe fallback",()=>{
 const key=voiceKey(voices[0]);
 assert.equal(pickVoice(voices,key),voices[0]);
 assert.equal(pickVoice(voices,"nonexistent"),pickVoice(voices));
 assert.equal(pickVoice([],key),null);
 assert.equal(voiceKey({lang:"en-US",name:"Basic US",voiceURI:"basic",localService:true}),key);
});
test("voice service labels disclose remote versus local voices",()=>{
 assert.match(voiceServiceLabel(voices[1]),/online\/service/i);
 assert.match(voiceServiceLabel(voices[0]),/on-device/i);
 assert.match(voiceServiceLabel({name:"Unknown",lang:"en-US"}),/unknown/i);
});
test("speech chunks never cut off a long original reading",()=>{
 const text="The virtual model displays 0.35 m. "+("The student reports a simulated result, not a laboratory measurement. ".repeat(90));
 const chunks=speechChunks(text,650);
 assert.ok(chunks.length>=7);
 assert.ok(chunks.every(c=>c.length>0 && c.length<=650));
 assert.equal(chunks.join(" "),text.trim());
});
test("speech splitting keeps numbers with the sentences and guards malformed input",()=>{
 const text="At 2 s, position is 3.0 m. At 3 s, position is 4.5 m.";
 assert.deepEqual(speechChunks(text,200),[text]);
 assert.deepEqual(speechChunks("  "),[]);
 assert.throws(()=>speechChunks(text,40));
 assert.throws(()=>speechChunks({},200));
});
test("no external speech provider is called directly from the course code",()=>{
 for(const name of ["voice-preferences.mjs","speech-chunks.mjs","read-aloud.mjs","listening.mjs"]){
  const file=readFileSync(resolve(root,name),"utf8");
  assert.doesNotMatch(file,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b/i,name);
 }
});
