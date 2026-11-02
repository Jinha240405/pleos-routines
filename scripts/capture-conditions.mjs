import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const round=process.argv[2]||'1',folder=`artifacts/conditions-round-${round}`;
await fs.mkdir(folder,{recursive:true});
const browser=await chromium.launch();
try{for(const width of [1440,375]){
  const page=await browser.newPage({viewport:{width,height:width===375?812:1000},hasTouch:true});
  await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__app?.editor);await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-type="flow_if"] .card-main').tap();
  await page.screenshot({animations:'disabled',path:`${folder}/condition-${width}.png`});
  if(round==='3'){await page.getByRole('button',{name:'조건 추가',exact:true}).tap();await page.screenshot({animations:'disabled',path:`${folder}/multiple-${width}.png`});}
  await page.locator('.condition-source').first().tap();await page.screenshot({animations:'disabled',path:`${folder}/sources-${width}.png`});
  await page.getByRole('button',{name:'닫기',exact:true}).tap();await page.locator('#libraryTab').tap();
  await page.screenshot({animations:'disabled',path:`${folder}/templates-${width}.png`});
  if(round==='3'){await page.getByRole('group',{name:'템플릿 분류'}).getByRole('button',{name:'출발',exact:true}).tap();await page.getByRole('button',{name:/동승석 안전벨트 확인.*조회 2개/}).tap();await page.locator('[data-type=flow_if] .card-main').tap();await page.locator('.condition-source').first().tap();await page.screenshot({animations:'disabled',path:`${folder}/results-${width}.png`});}
  await page.close();
}}finally{await browser.close();}
console.log(folder);
