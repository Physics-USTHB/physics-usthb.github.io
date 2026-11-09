import {chromium} from "playwright";
import assert from "node:assert/strict";

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({acceptDownloads:true});
const page=await context.newPage();
const outbound=[];
page.on("request",r=>{if(!r.url().startsWith("http://127.0.0.1:8080/"))outbound.push(r.url());});
page.on("pageerror",err=>{throw err;});

try{
 await page.goto("http://127.0.0.1:8080/english/",{waitUntil:"domcontentloaded",timeout:30_000});
 await page.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("40 text questions"),null,{timeout:25_000});
 assert.equal(await page.locator("#units button").count(),12,"All twelve units must be navigable");
 assert.equal(await page.locator('#authored-lesson form[id^="practice-"]').count(),40,"First unit library practice missing");
 assert.equal(await page.locator("#authored-lesson button").filter({hasText:"Hear reading"}).count(),5,"Five reading sources including original contextual mini-source should be available");
 assert.equal(await page.locator("#writing-task option").count(),2,"Each unit should offer two writing assignments");
 assert.match(await page.locator("body").innerText(),/A2 beta — formative learning only/);
 const first=page.locator("#practice-A2\\.01\\.BE\\.001");
 await first.locator('input[value="am"]').check();
 await first.locator("button[type=submit]").click();
 await page.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="1");
 assert.match(await first.locator(".feedback").innerText(),/Correct/);
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="1",{timeout:20000});
 assert.equal(await page.locator("#first-correct").innerText(),"1","First attempt did not survive reload");

 // First-attempt errors should prompt a relevant, unattempted exercise and a short rule.
 const second=page.locator('[id="practice-A2.01.BE.002"]');
 await second.locator('input[value="are"]').check();
 await second.getByRole("button",{name:"Check answer"}).click();
 await page.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="2");
 assert.match(await page.locator("#focused-practice").innerText(),/Present simple and classroom questions/);
 assert.match(await page.locator("#focused-practice").innerText(),/1 of 2 first attempts/);
 await page.locator("#focused-practice").getByRole("button",{name:"Try a new related question"}).click();
 assert.equal(await page.evaluate(()=>document.activeElement?.closest("form")?.id),"practice-A2.01.BE.003",
  "Remediation button must reveal and focus an unattempted related question");
 // A retry may improve practice, but must not erase the original first-attempt suggestion.
 await second.locator('input[value="is"]').check();
 await second.getByRole("button",{name:"Check answer"}).click();
 await page.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="3");
 assert.match(await page.locator("#focused-practice").innerText(),/1 of 2 first attempts/);
 // Original new contextual practice in R5 appears beside the original A2.01 bank.
 const contextual=page.locator('[id="practice-A2.01.CTX.001"]');
 await contextual.evaluate(el=>{el.closest("details").open=true;});
 await contextual.locator('input[value="Room 12"]').check();
 await contextual.getByRole("button",{name:"Check answer"}).click();
 await page.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="4");
 assert.match(await contextual.locator(".feedback").innerText(),/Correct/);
 const newSource=page.locator('[id="reading-A2.01-R5"]');
 await newSource.locator("summary").click();
 assert.match(await newSource.innerText(),/fictional physics orientation timetable/i);

 const draft="My name is Nora. I study physics and I work with my classmates. I usually read notes at home. Is our class on Tuesday?";
 await page.locator("#writing-text").fill(draft);
 await page.locator("#guided-writing button").filter({hasText:"Save draft now"}).click();
 await page.waitForFunction(()=>document.querySelector("#writing-status")?.textContent.includes("Draft saved"));
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#writing-text")?.value?.includes("I study physics"),null,{timeout:20_000});
 assert.equal(await page.locator("#writing-text").inputValue(),draft,"Guided writing draft did not persist");

 const otherContext=await browser.newContext();
 try{
  const other=await otherContext.newPage();
  await other.goto("http://127.0.0.1:8080/english/",{waitUntil:"domcontentloaded"});
  await other.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("40 text questions"));
  assert.equal(await other.locator("#total-attempts").innerText(),"0","Progress leaked into another browser profile");
  assert.equal(await other.locator("#writing-text").inputValue(),"","Writing draft leaked into another browser profile");
 }finally{await otherContext.close();}

 await page.locator("#units button").nth(10).click();
 await page.waitForFunction(()=>document.querySelector("#unit-title")?.textContent.includes("A2.11"));
 assert.equal(await page.locator("#authored-lesson svg[role=img]").count(),1,"A2.11 graph is missing");
 assert.ok(await page.locator("#authored-lesson table").count()>=1,"Graph lacks data-table alternative");
 const notes=await page.locator("#authored-lesson").innerText();
 assert.match(notes,/Time \(s\)/);
 assert.match(notes,/Position \(m\)/);

 const downloadPromise=page.waitForEvent("download");
 await page.locator("#export").click();
 const download=await downloadPromise;
 assert.match(download.suggestedFilename(),/physics-usthb-a2-preview-progress\.json/);

 page.once("dialog",async d=>await d.accept());
 await page.locator("#clear").click();
 await page.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="0");
 await page.locator("#units button").first().click();
 assert.equal(await page.locator("#writing-text").inputValue(),"","Clearing progress did not clear the writing draft");

 const saved={schema:1,attempts:[{id:"A2.01.BE.001",at:"2026-11-08T12:00:00.000Z",answer:"am",first:true,correct:true}],reviews:{},writing:{"A2.01.WRITE.01":{text:"Imported private English draft.",checked:["task","clarity"],updatedAt:"2026-11-09T00:00:00.000Z"}}};
 await page.locator("#import-file").setInputFiles({name:"history.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(saved))});
 await page.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="1");
 assert.equal(await page.locator("#writing-text").inputValue(),"Imported private English draft.","Writing import did not restore the draft");

 // Simulate a microphone permission grant and recorder completion without real hardware.
 // Discarding while active must not resurrect a recording from onstop events.
 const audioContext=await browser.newContext();
 try{
  await audioContext.addInitScript(()=>{
   Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{
    getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})
   }});
   window.MediaRecorder=class {
    constructor(stream){this.state="inactive";this.mimeType="audio/webm";}
    start(){this.state="recording";}
    stop(){
     this.state="inactive";
     queueMicrotask(()=>{
      this.ondataavailable?.({data:new Blob(["sensitive microphone data"],{type:"audio/webm"})});
      this.onstop?.();
     });
    }
   };
  });
  const audioPage=await audioContext.newPage();
  await audioPage.goto("http://127.0.0.1:8080/english/",{waitUntil:"domcontentloaded"});
  await audioPage.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("40 text questions"));
  await audioPage.getByRole("button",{name:"Start recording"}).click();
  await audioPage.getByRole("button",{name:"Discard recording"}).click();
  await audioPage.waitForTimeout(80);
  assert.equal(await audioPage.locator('audio[aria-label="Listen to your local speaking practice recording"]').isHidden(),true);
  assert.equal(await audioPage.getByRole("button",{name:"Save recording to my device"}).isDisabled(),true);
 }finally{await audioContext.close();}


 // Original dialogue practice: mock browser speech synthesis for deterministic checks.
 const listeningContext=await browser.newContext();
 try{
  await listeningContext.addInitScript(()=>{
   window.__syntheticSpeech={played:[],cancels:0};
   Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{
    cancel(){window.__syntheticSpeech.cancels++;},
    getVoices(){return [{lang:"en-US",name:"Test synthetic English voice"}];},
    speak(utterance){window.__syntheticSpeech.played.push(utterance.text);}
   }});
   window.SpeechSynthesisUtterance=class{
    constructor(text){this.text=text;this.lang="en-US";this.rate=1;this.volume=1;this.voice=null;}
   };
  });
  const listenPage=await listeningContext.newPage();
  const listeningOutbound=[];
  listenPage.on("request",req=>{if(!req.url().startsWith("http://127.0.0.1:8080/"))listeningOutbound.push(req.url());});
  await listenPage.goto("http://127.0.0.1:8080/english/",{waitUntil:"domcontentloaded"});
  await listenPage.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("40 text questions"));
  assert.equal(await listenPage.locator(".listening-scene").count(),2,"Two dialogues should appear per A2 module");
  assert.equal(await listenPage.locator(".listening-scene form").count(),4,"Each module needs four dialogue questions");
  assert.equal(await listenPage.locator(".pronunciation-focus blockquote").count(),2,"Two pronunciation lines should appear per unit");
  await listenPage.getByRole("button",{name:"Hear dialogue"}).first().click();
  const playback=await listenPage.evaluate(()=>window.__syntheticSpeech.played);
  assert.equal(playback.length,1);
  assert.ok(playback[0].includes("Maya says:"));
  const q1=listenPage.locator('[id="listen-A2.01.L01.Q01"]');
  await q1.locator('input[value="Physics"]').check();
  await q1.getByRole("button",{name:"Check comprehension"}).click();
  await listenPage.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="1");
  const transcript=listenPage.locator('[id="transcript-A2.01.L01"]');
  await transcript.locator("summary").click();
  assert.equal(await transcript.getAttribute("open"),"");
  const q2=listenPage.locator('[id="listen-A2.01.L01.Q02"]');
  await q2.locator('input[value="At nine"]').check();
  await q2.getByRole("button",{name:"Check comprehension"}).click();
  await listenPage.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="2");
  const history=await listenPage.evaluate(()=>new Promise((resolve,reject)=>{
   const r=indexedDB.open("physics-usthb-english-v1",1);
   r.onerror=()=>reject(r.error);
   r.onsuccess=()=>{
    const db=r.result,req=db.transaction("records","readonly").objectStore("records").get("attempts");
    req.onsuccess=()=>{db.close();resolve(req.result);};
    req.onerror=()=>reject(req.error);
   };
  }));
  const one=history.attempts.find(x=>x.id==="A2.01.L01.Q01");
  const two=history.attempts.find(x=>x.id==="A2.01.L01.Q02");
  assert.equal(one?.correct,true);
  assert.equal(one?.independent,false,"Synthetic speech must never count as independent proficiency evidence");
  assert.equal(one?.hintsUsed,0);
  assert.equal(two?.correct,true);
  assert.equal(two?.independent,false);
  assert.equal(two?.hintsUsed,1,"Transcript reveal must mark assisted practice");
  await listenPage.locator("#units button").nth(1).click();
  assert.equal(await listenPage.locator(".listening-scene").count(),2,"A2.02 dialogues not loaded on navigation");
  const canceled=await listenPage.evaluate(()=>window.__syntheticSpeech.cancels);
  assert.ok(canceled>=2,"Changing units must cancel synthetic playback");
  assert.deepEqual(listeningOutbound,[],"Optional dialogue practice must not invoke third-party services itself");
 }finally{await listeningContext.close();}

 assert.deepEqual(outbound,[],"Assessment content unexpectedly requested a third-party service");
 console.log("English A2 browser checks passed: 12 units, feedback, persistence, privacy isolation, graph, export, deletion and import.");
}finally{
 await browser.close();
}
