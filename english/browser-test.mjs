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
 await page.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("34 text questions"),null,{timeout:25_000});
 assert.equal(await page.locator("#units button").count(),12,"All twelve units must be navigable");
 assert.equal(await page.locator("#authored-lesson form").count(),34,"First unit practice missing");
 assert.match(await page.locator("body").innerText(),/A2 beta — formative learning only/);
 const first=page.locator("#practice-A2\\.01\\.BE\\.001");
 await first.locator('input[value="am"]').check();
 await first.locator("button[type=submit]").click();
 await page.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="1");
 assert.match(await first.locator(".feedback").innerText(),/Correct/);
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#total-attempts")?.textContent==="1",{timeout:20000});
 assert.equal(await page.locator("#first-correct").innerText(),"1","First attempt did not survive reload");
 const draft="My name is Nora. I study physics and I work with my classmates. I usually read notes at home. Is our class on Tuesday?";
 await page.locator("#writing-text").fill(draft);
 await page.locator("#guided-writing button").filter({hasText:"Save draft now"}).click();
 await page.waitForFunction(()=>document.querySelector("#guided-writing [role=status]")?.textContent.includes("Draft saved"));
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#writing-text")?.value?.includes("I study physics"),null,{timeout:20_000});
 assert.equal(await page.locator("#writing-text").inputValue(),draft,"Guided writing draft did not persist");

 const otherContext=await browser.newContext();
 try{
  const other=await otherContext.newPage();
  await other.goto("http://127.0.0.1:8080/english/",{waitUntil:"domcontentloaded"});
  await other.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("34 text questions"));
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
 assert.deepEqual(outbound,[],"Assessment content unexpectedly requested a third-party service");
 console.log("English A2 browser checks passed: 12 units, feedback, persistence, privacy isolation, graph, export, deletion and import.");
}finally{
 await browser.close();
}
