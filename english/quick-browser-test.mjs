import {chromium} from "playwright";
import assert from "node:assert/strict";

const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const page=await context.newPage();
const faults=[],outbound=[];
page.on("pageerror",e=>faults.push(e.message));
page.on("request",r=>{if(!r.url().startsWith("http://127.0.0.1:8080/"))outbound.push(r.url());});

try{
 await page.goto("http://127.0.0.1:8080/english/",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("40 text questions"));
 const select=page.locator("#quick-mode");
 assert.equal(await select.locator("option").count(),4,"All quick-practice modes must be accessible");
 assert.match(await page.locator("#quick-count").innerText(),/40 eligible question/);
 const first=page.locator('[id="quick-A2.01.BE.001"]');
 assert.equal(await first.count(),1,"First unattempted question missing");
 await first.locator('input[value="am"]').check();
 await first.getByRole("button",{name:"Check answer"}).click();
 await first.locator(".feedback").getByText(/Correct/).waitFor();
 assert.equal(await page.locator("#total-attempts").innerText(),"1");
 assert.equal(await page.locator("#first-correct").innerText(),"1");
 assert.match(await page.locator("#quick-count").innerText(),/39 eligible question/);

 await first.getByRole("button",{name:"Next question"}).click();
 const second=page.locator('[id="quick-A2.01.BE.002"]');
 await second.locator('input[value="are"]').check();
 await second.getByRole("button",{name:"Check answer"}).click();
 await second.locator(".feedback").getByText(/Not accepted/).waitFor();
 assert.equal(await page.locator("#total-attempts").innerText(),"2");

 await select.selectOption("revisit");
 const replay=page.locator('[id="quick-A2.01.BE.002"]');
 assert.equal(await replay.count(),1,"First wrong answer should be offered for further practice");
 await replay.locator('input[value="is"]').check();
 await replay.getByRole("button",{name:"Check answer"}).click();
 await replay.locator(".feedback").getByText(/Correct/).waitFor();
 assert.equal(await page.locator("#first-correct").innerText(),"1","Retry must not be miscounted as correct on first attempt");
 await replay.getByRole("button",{name:"Next question"}).click();
 assert.match(await page.locator("#quick-question").innerText(),/No unresolved first-attempt errors remain/);

 await select.selectOption("due");
 assert.match(await page.locator("#quick-question").innerText(),/No scheduled reviews are due/);

 // Simulate a properly persisted review that has become due, without modifying item answers.
 await page.evaluate(()=>new Promise((resolve,reject)=>{
  const r=indexedDB.open("physics-usthb-english-v1",1);
  r.onerror=()=>reject(r.error);
  r.onsuccess=()=>{
   const db=r.result,tx=db.transaction("records","readwrite");
   const object=tx.objectStore("records"),get=object.get("attempts");
   get.onsuccess=()=>{
    const data=get.result;
    data.reviews["A2.01.BE.001"].dueAt="2020-01-01T00:00:00.000Z";
    object.put(data,"attempts");
   };
   get.onerror=()=>reject(get.error);
   tx.oncomplete=()=>{db.close();resolve();};
   tx.onerror=()=>reject(tx.error);
  };
 }));
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("40 text questions"));
 await page.locator("#quick-mode").selectOption("due");
 assert.equal(await page.locator('[id="quick-A2.01.BE.001"]').count(),1,"Due item must be discoverable");

 // The full exercise bank uses the same history and must record this as a retry.
 const original=page.locator('[id="practice-A2.01.BE.001"]');
 await original.evaluate(el=>{el.closest("details").open=true;});
 await original.locator('input[value="is"]').check();
 await original.getByRole("button",{name:"Check answer"}).click();
 await original.locator(".feedback").getByText(/Not accepted/).waitFor();
 assert.equal(await page.locator("#total-attempts").innerText(),"4");
 assert.equal(await page.locator("#first-correct").innerText(),"1");

 // An existing source-linked reading question can jump directly to the reference text.
 await page.locator("#units button").nth(11).click();
 await page.waitForFunction(()=>document.querySelector("#unit-title")?.textContent.includes("A2.12"));
 const quick=page.locator("#quick-question");
 const source=quick.getByRole("button",{name:/Open source R1/});
 assert.equal(await source.count(),1);
 await source.click();
 const reading=page.locator('[id="reading-A2.12-R1"]');
 assert.equal(await reading.getAttribute("open"),"");
 assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.includes("R1")),true);

 // Browser profile isolation continues to hold for quick practice.
 const other=await browser.newContext();
 try{
  const otherPage=await other.newPage();
  await otherPage.goto("http://127.0.0.1:8080/english/",{waitUntil:"domcontentloaded"});
  await otherPage.waitForFunction(()=>document.querySelector("#unit-status")?.textContent.includes("40 text questions"));
  assert.equal(await otherPage.locator("#total-attempts").innerText(),"0");
  assert.match(await otherPage.locator("#quick-count").innerText(),/40 eligible question/);
 }finally{await other.close();}
 assert.deepEqual(faults,[],"JavaScript runtime error in quick practice");
 assert.deepEqual(outbound,[],"Question-at-a-time interface made a third-party request");
 console.log("A2 quick-practice browser checks passed: modes, first attempts, retry, due, source navigation, shared history, privacy.");
}finally{await browser.close();}
