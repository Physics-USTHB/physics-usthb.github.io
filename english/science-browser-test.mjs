import {chromium} from "playwright";
import assert from "node:assert/strict";

const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const page=await context.newPage();
const scriptErrors=[],remoteRequests=[];
page.on("pageerror",e=>scriptErrors.push(e.message));
page.on("request",r=>{if(!r.url().startsWith("http://127.0.0.1:8080/"))remoteRequests.push(r.url());});
await page.addInitScript(()=>{
 const voices=[{name:"Local English US",lang:"en-US",voiceURI:"test",localService:true,default:true}];
 const engine={
  spoken:[],last:null,stopped:0,
  getVoices:()=>voices,
  speak(u){this.spoken.push({text:u.text,voice:u.voice?.name||null});this.last=u;},
  cancel(){this.stopped++;this.last=null;},
  addEventListener(){},removeEventListener(){}
 };
 Object.defineProperty(window,"speechSynthesis",{configurable:true,value:engine});
 window.SpeechSynthesisUtterance=class {
  constructor(text){this.text=text;this.voice=null;this.rate=1;this.pitch=1;this.volume=1;this.lang="en-US";}
 };
 window.__scienceAudio=engine;
});
try{
 await page.goto("http://127.0.0.1:8080/english/",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("text questions"),null,{timeout:20_000});
 // R1 in the graph unit contains SI units including "2 m/s"; screen text must be preserved.
 await page.locator("#units button").nth(10).click();
 await page.waitForFunction(()=>document.querySelector("#unit-title")?.textContent.includes("A2.11"));
 const graphSource=page.locator('[id="reading-A2.11-R1"]');
 await graphSource.evaluate(el=>{el.open=true;});
 assert.match(await graphSource.innerText(),/2 m\/s/,"Original SI symbols must remain visible to students");
 assert.match(await graphSource.innerText(),/Position \(m\)/);
 await graphSource.getByRole("button",{name:"Hear reading"}).click();
 let spoken=await page.evaluate(()=>window.__scienceAudio.spoken.map(x=>x.text));
 assert.ok(spoken.length>0);
 assert.ok(spoken[0].includes("two meters per second"),"Model speed should be spoken as SI unit words");
 assert.ok(spoken[0].includes("Time, in seconds"),"Graph axes should be read with units");
 assert.ok(spoken[0].includes("Position, in meters"),"Position axis should have an understandable unit");
 await graphSource.getByRole("button",{name:"Stop audio"}).click();

 // The equipment table is read by header + individual rows instead of symbol soup.
 await page.locator("#units button").nth(2).click();
 await page.waitForFunction(()=>document.querySelector("#unit-title")?.textContent.includes("A2.03"));
 const tableSource=page.locator('[id="reading-A2.03-R2"]');
 await tableSource.locator("summary").click();
 assert.match(await tableSource.innerText(),/meterstick/);
 await tableSource.getByRole("button",{name:"Hear reading"}).click();
 spoken=await page.evaluate(()=>window.__scienceAudio.spoken.map(x=>x.text));
 const latest=spoken.at(-1);
 assert.match(latest,/Table\. Columns: Label; Item; Number; Location/);
 assert.match(latest,/Row one\. Label: A\. Item: meterstick\. Number: one/);
 await tableSource.getByRole("button",{name:"Stop audio"}).click();

 // A dialogue with electrical units gets clearer scientific pronunciation.
 await page.locator("#units button").nth(9).click();
 await page.waitForFunction(()=>document.querySelector("#unit-title")?.textContent.includes("A2.10"));
 await page.getByRole("button",{name:"Hear dialogue"}).first().click();
 spoken=await page.evaluate(()=>window.__scienceAudio.spoken.map(x=>x.text));
 assert.ok(spoken.at(-1).includes("five ohms"),"Electrical resistance should be pronounced naturally");
 await page.evaluate(()=>window.__scienceAudio.last?.onend?.());
 spoken=await page.evaluate(()=>window.__scienceAudio.spoken.map(x=>x.text));
 assert.ok(spoken.at(-1).includes("five volts"),"Voltage symbol should be expanded in spoken dialogue");
 assert.ok(spoken.at(-1).includes("two amperes"),"Current symbol should be expanded in spoken dialogue");
 await page.getByRole("button",{name:"Stop playback"}).first().click();

 // A short repeat-after-me line preserves decimal digits and kilogram units.
 await page.locator("#units button").nth(1).click();
 await page.waitForFunction(()=>document.querySelector("#unit-title")?.textContent.includes("A2.02"));
 await page.getByRole("button",{name:"Hear example phrase"}).first().click();
 spoken=await page.evaluate(()=>window.__scienceAudio.spoken.map(x=>x.text));
 assert.match(spoken.at(-1),/zero point eight zero kilograms/);

 assert.deepEqual(scriptErrors,[],"Narration triggered a JavaScript exception");
 assert.deepEqual(remoteRequests,[],"Science speech conversion must never call an external service");
 console.log("Physics speech browser checks passed: SI units, axes, full readings, equipment tables, dialogues and decimal pronunciation.");
}finally{await browser.close();}
