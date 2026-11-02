import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const round = Number(process.argv[2] || 1);
const folder = `artifacts/cards-round-${round}`;
await mkdir(folder, {recursive:true});
const browser = await chromium.launch(), report=[];
try {
 for(const width of [1440,375]) {
  const page=await browser.newPage({viewport:{width,height:width===1440?960:812}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__app?.editor);
  const capture=async state=>{
   await page.screenshot({path:`${folder}/${width}-${state}.png`,fullPage:!(await page.locator('dialog[open]').count())});
   const sizes=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth, clipped:[...document.querySelectorAll('button,h1,h2,h3,p,.node-description,.node-title')].filter(el=>el.getClientRects().length&&el.clientWidth&&el.scrollWidth>el.clientWidth+2).map(el=>({text:el.textContent.slice(0,70),width:el.clientWidth,scroll:el.scrollWidth}))}));
   report.push({width,state,...sizes,errors:[...errors]});
  };
  await capture('editor');
  if(round>=2){
   await page.locator('[data-type="flow_if"] .card-main').first().click();await capture('edit-condition');
   await page.locator('.flow-dialog [aria-label="닫기"]').click();
   await page.locator('.add-step').first().click();await capture('add-action');await page.locator('.flow-dialog [aria-label="닫기"]').click();
   await page.locator('#runButton').click();await page.waitForFunction(()=>document.querySelector('#executionState').textContent==='실행 완료');
   await page.locator('#resultButton').click();await capture('test-result');await page.locator('#testDialog .close-dialog').click();
   await page.locator('#libraryTab').click();await capture('library');await page.locator('#editorTab').click();
  }
  if(round>=3){
   await page.locator('[data-type="action_notify"] .card-main').first().click();
   await page.getByRole('textbox',{name:'알림 내용',exact:true}).fill('우리 가족의 여름 휴가를 위한 출발 준비가 끝났어요. 탑승 전에 안전벨트와 소지품을 확인해 주세요.');
   await page.getByRole('button',{name:'적용',exact:true}).click();await capture('long-text');
   await page.locator('[data-type="vehicle_climate"] .node-menu-button').click();await capture('card-menu');
   await page.getByRole('menuitem',{name:'설정 변경'}).click();await page.getByRole('button',{name:'취소',exact:true}).click();
   await page.locator('#shareButton').click();await page.locator('#routineJson').fill('{ invalid');await page.locator('#importJson').click();await capture('import-error');
  }
  await page.close();
 }
}finally{await browser.close();await writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
