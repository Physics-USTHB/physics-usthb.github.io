import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
const outbound = [];
page.on('request', request => {
  const url = request.url();
  if (!url.startsWith('http://127.0.0.1:8080')) outbound.push(url);
});
page.on('console', msg => {
  if (msg.type() === 'error') console.error('browser console:', msg.text());
});

try {
  await page.goto('http://127.0.0.1:8080/latex/', {waitUntil:'domcontentloaded', timeout:30_000});
  await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Ready'), null, {timeout:15_000});

  const source = String.raw`\documentclass{article}
\begin{document}
Physics USTHB local compiler browser test.
\end{document}
`;
  await page.locator('#source').fill(source);
  await page.locator('#save-project').click();
  await page.waitForFunction(() => document.querySelector('#dirty-indicator')?.textContent.includes('Saved'), null, {timeout:10_000});

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Ready'), null, {timeout:15_000});
  assert.equal(await page.locator('#source').inputValue(), source, 'Saved source did not survive reload');

  // A separate browser context represents another user/device profile.
  // Its storage must be independent even while both sessions are open.
  const otherContext = await browser.newContext();
  try {
    const otherPage = await otherContext.newPage();
    await otherPage.goto('http://127.0.0.1:8080/latex/', {waitUntil:'domcontentloaded', timeout:30_000});
    await otherPage.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Ready'), null, {timeout:15_000});
    const otherSource = await otherPage.locator('#source').inputValue();
    assert.notEqual(otherSource, source, 'A second user context saw the first user\'s saved LaTeX source');
  } finally {
    await otherContext.close();
  }

  await page.locator('#compile').click();
  await page.waitForFunction(() => {
    const frame = document.querySelector('#pdf-frame');
    const status = document.querySelector('#status')?.textContent || '';
    return (!frame?.hidden && frame?.src?.startsWith('blob:')) || status.includes('Compilation failed');
  }, null, {timeout:240_000});

  const status = await page.locator('#status').textContent();
  if (status.includes('Compilation failed')) {
    const log = await page.locator('#compile-log').textContent();
    throw new Error('Browser-local compilation failed:\n' + log.slice(-8000));
  }
  assert.equal(await page.locator('#pdf-frame').isHidden(), false, 'PDF preview did not appear');
  assert.equal(await page.locator('#download-pdf').isEnabled(), true, 'PDF download was not enabled');

  const leaked = outbound.filter(url => url.includes('Physics%20USTHB%20local%20compiler') || url.includes('Physics+USTHB+local+compiler'));
  assert.deepEqual(leaked, [], 'Document source appeared in an outbound request URL');

  // Practicum persistence/privacy: useful work persists, student identity does not.
  await page.goto('http://127.0.0.1:8080/electricity/e01/', {waitUntil:'domcontentloaded', timeout:30_000});
  await page.locator('#studentName').fill('Private Test Student');
  await page.locator('#studentGroup').fill('Private Group');
  await page.locator('#reportDiscussion').fill('Persisted scientific discussion');
  await page.waitForTimeout(150);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#studentName').inputValue(), '', 'TP1 persisted student identity');
  assert.equal(await page.locator('#studentGroup').inputValue(), '', 'TP1 persisted group identity');
  assert.equal(await page.locator('#reportDiscussion').inputValue(), 'Persisted scientific discussion', 'TP1 did not restore non-identifying saved work');
  console.log('Browser test passed: persistence reload + isolated concurrent user context + local PDF compilation + TP privacy persistence.');
} finally {
  await browser.close();
}
