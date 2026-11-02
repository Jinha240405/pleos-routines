import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const round = Number(process.argv[2] ?? 1);
const folder = `artifacts/visual-round-${round}`;
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const viewport of [{ width: 1440, height: 960 }, { width: 375, height: 812 }]) {
  const page = await browser.newPage({ viewport });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173');
  await page.waitForFunction(() => window.__app?.workspace);
  await page.waitForTimeout(250);
  async function capture(state) {
    await page.waitForTimeout(250); // Let intentional colour/focus transitions settle before visual QA.
    const path = `${folder}/${viewport.width}-${state}.png`;
    await page.screenshot({ path, fullPage: true });
    const layout = await page.evaluate(() => {
      const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const clipped = [...document.querySelectorAll('button,input,select,h1,h2,h3,p')].filter(el => visible(el) && !el.closest('#blocklyDiv') && el.tagName !== 'INPUT' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2).map(el => ({ id: el.id, text: el.textContent.trim().slice(0, 80), width: el.clientWidth, scroll: el.scrollWidth }));
      return { width: innerWidth, pageWidth: document.documentElement.scrollWidth, clipped };
    });
    report.push({ viewport, state, path, ...layout, errors: [...errors] });
  }
  await capture('editor');
  if (round >= 2) {
    await page.locator('#runButton').click();
    await page.waitForFunction(() => document.querySelector('#executionState').textContent === '실행 완료');
    await capture('executed');
    await page.locator('#libraryTab').click(); await capture('library');
    await page.locator('#savedRoutines .routine-card').first().click();
    await page.locator('#shareButton').click(); await capture('share');
    if (round >= 3) {
      await page.locator('#routineJson').fill('{ invalid');
      await page.locator('#importJson').click(); await capture('import-error');
      await page.locator('#shareDialog .close-dialog').click();
      await page.locator('#helpButton').click(); await capture('help');
    }
  }
  await page.close();
}
await browser.close();
await writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
