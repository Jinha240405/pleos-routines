import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const browser=await chromium.launch();const folder=`artifacts/visual-round-${process.argv[2] ?? 7}-interactions`;await mkdir(folder,{recursive:true});const reports=[];
for(const width of [1440,375]){
 const page=await browser.newPage({viewport:{width,height:width===1440?960:812}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__app?.workspace);
 const snap=async state=>{await page.waitForTimeout(250);await page.screenshot({path:`${folder}/${width}-${state}.png`,fullPage:true});reports.push({width,state,pageWidth:await page.evaluate(()=>document.documentElement.scrollWidth),errors:[...errors]});};
 await page.evaluate(()=>window.__app.addRoutine('우리 가족의 여름 휴가 출발 전 차량 상태와 온도를 확인하는 아주 긴 이름의 루틴',{blocks:{blocks:[{type:'routine_start',next:{block:{type:'flow_wait',inputs:{SECONDS:{block:{type:'value_number',fields:{VALUE:10}}}}}}}]}}));
 await page.locator('#runButton').click();await snap('running-long-title');await page.locator('#stopButton').click();await page.waitForFunction(()=>document.querySelector('#executionState').textContent==='실행 중지됨');
 await page.locator('#blockSearch').fill('조건');await snap('search-palette');
 await page.locator('#blockSearch').fill('');await page.locator('#libraryTab').click();await page.locator('#libraryNew').focus();await snap('library-keyboard');
 await page.close();
}
await browser.close();await writeFile(`${folder}/report.json`,JSON.stringify(reports,null,2));console.log(reports);
