import {chromium} from "playwright";
import assert from "node:assert/strict";

const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const page=await context.newPage();
const errors=[],external=[];
page.on("pageerror",error=>errors.push(error.message));
page.on("request",request=>{
 if(!request.url().startsWith("http://127.0.0.1:8080/"))external.push(request.url());
});
await page.addInitScript(()=>{
 const voices=[
  {name:"Basic US Voice",lang:"en-US",voiceURI:"basic",localService:true,default:true},
  {name:"Natural Neural US",lang:"en-US",voiceURI:"neural",localService:false,default:false},
  {name:"Natural Neural US Two",lang:"en-US",voiceURI:"neural2",localService:false,default:false},
  {name:"French Voice",lang:"fr-FR",voiceURI:"fr",localService:true,default:false}
 ];
 const events=new Map();
 const mock={
  voices,spoken:[],cancels:0,last:null,
  getVoices(){return this.voices;},
  cancel(){this.cancels++;this.last=null;},
  speak(u){this.spoken.push({text:u.text,voice:u.voice?.name||"default",rate:u.rate});this.last=u;},
  addEventListener(name,handler){events.set(name,handler);},
  removeEventListener(name,handler){if(events.get(name)===handler)events.delete(name);},
  triggerVoicesChanged(){events.get("voiceschanged")?.();}
 };
 window.__testSpeech=mock;
 Object.defineProperty(window,"speechSynthesis",{configurable:true,value:mock});
 window.SpeechSynthesisUtterance=class{
  constructor(text){this.text=text;this.lang="en-US";this.rate=1;this.pitch=1;this.volume=1;this.voice=null;}
 };
});
try{
 await page.goto("http://127.0.0.1:8080/english/",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("40 text questions"));
 assert.equal(await page.locator("#voice-choice option").count(),4,"Voice selector should list only three English voices plus Auto");
 assert.match(await page.locator("#voice-note").innerText(),/Natural Neural US/);
 assert.match(await page.locator("#voice-note").innerText(),/online\/service/i);

 await page.getByRole("button",{name:"Preview voice"}).click();
 let played=await page.evaluate(()=>window.__testSpeech.spoken);
 assert.equal(played.length,1);
 assert.equal(played[0].voice,"Natural Neural US");
 assert.equal(played[0].rate,1);
 assert.ok(played[0].text.includes("Position is measured in meters"));
 await page.evaluate(()=>window.__testSpeech.last?.onend?.());

 const localKey="en-us::Basic US Voice::basic::true";
 await page.locator("#voice-choice").selectOption(localKey);
 assert.match(await page.locator("#voice-note").innerText(),/On-device voice/);
 assert.equal(await page.evaluate(()=>localStorage.getItem("physics-usthb-english-voice-v1")),localKey);

 await page.getByRole("button",{name:"Hear reading"}).first().click();
 played=await page.evaluate(()=>window.__testSpeech.spoken);
 assert.equal(played.at(-1).voice,"Basic US Voice","Source reading must use the selected voice");
 assert.equal(played.at(-1).rate,1,"Reading's natural speed should be the default");
 assert.ok(played.at(-1).text.length<=1100,"Long reading text should be chunked at natural boundaries");
 await page.getByRole("button",{name:"Stop audio"}).first().click();

 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("40 text questions"));
 assert.equal(await page.locator("#voice-choice").inputValue(),localKey,"Voice preference should persist in the same browser profile");
 await page.locator("#voice-choice").selectOption("auto");
 assert.match(await page.locator("#voice-note").innerText(),/Natural Neural US/);
 const before=await page.evaluate(()=>window.__testSpeech.spoken.length);
 await page.getByRole("button",{name:"Hear dialogue"}).first().click();
 played=await page.evaluate(()=>window.__testSpeech.spoken);
 assert.equal(played.length,before+1);
 assert.equal(played.at(-1).voice,"Natural Neural US");
 assert.ok(played.at(-1).text.startsWith("Hello, I'm Maya"),"Dialogue should speak the character's words directly");
 assert.ok(!played.at(-1).text.includes("Maya says:"),"Do not read artificial role annotations");
 await page.evaluate(()=>window.__testSpeech.last?.onend?.());
 played=await page.evaluate(()=>window.__testSpeech.spoken);
 assert.equal(played.length,before+2);
 assert.equal(played.at(-1).voice,"Natural Neural US Two","Automatic dialogue mode should alternate available natural voices");
 assert.ok(played.at(-1).text.includes("I'm Jordan"));

 // Manual selection takes priority; both characters use the learner's preferred voice.
 await page.getByRole("button",{name:"Stop playback"}).first().click();
 await page.locator("#voice-choice").selectOption(localKey);
 await page.getByRole("button",{name:"Hear dialogue"}).first().click();
 played=await page.evaluate(()=>window.__testSpeech.spoken);
 assert.equal(played.at(-1).voice,"Basic US Voice");
 await page.evaluate(()=>window.__testSpeech.last?.onend?.());
 played=await page.evaluate(()=>window.__testSpeech.spoken);
 assert.equal(played.at(-1).voice,"Basic US Voice");
 await page.getByRole("button",{name:"Stop playback"}).first().click();

 // Voice availability changes: saved preference should fall back safely, not break narration.
 await page.evaluate(()=>{
  window.__testSpeech.voices=window.__testSpeech.voices.filter(x=>x.name!=="Basic US Voice");
  window.__testSpeech.triggerVoicesChanged();
 });
 assert.match(await page.locator("#voice-note").innerText(),/Saved voice unavailable/);
 await page.getByRole("button",{name:"Preview voice"}).click();
 played=await page.evaluate(()=>window.__testSpeech.spoken);
 assert.equal(played.at(-1).voice,"Natural Neural US");
 await page.getByRole("button",{name:"Stop preview"}).click();

 page.once("dialog",async dialog=>dialog.accept());
 await page.getByRole("button",{name:"Clear local progress"}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem("physics-usthb-english-voice-v1")),null,
   "Clearing local progress should also clear the saved voice preference");
 assert.equal(await page.locator("#voice-choice").inputValue(),"auto");
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[],"Voice selection must not make requests to third-party APIs");
 console.log("Voice regression passed: enhanced voice selection, native rate, direct dialogues, turn voices, persistence, preview, missing voice fallback and privacy.");
}finally{await browser.close();}
