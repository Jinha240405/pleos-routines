import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const round=process.argv[2]||'1';const directory=`artifacts/api-round-${round}`;await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch();
try{for(const width of [1440,375]){
 const page=await browser.newPage({viewport:{width,height:width===375?812:1000}});await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__app?.editor);
 if(round==='1'){
  await page.locator('.add-step').first().click();await page.getByRole('button',{name:'차량·연결 기능',exact:true}).click();await page.getByRole('combobox',{name:'동작 분야'}).selectOption('HVAC');
 }else if(round==='2'){
  await page.evaluate(async()=>{const{apiNode}=await import('/api.js');window.__app.addRoutine('실내 환경 설정',{blocks:{blocks:[{type:'routine_start',next:{block:apiNode('HVAC.setHvacTemperature')}}]}})});await page.locator('[data-type="api_call"] .card-main').click();
 }else{
  await page.locator('#testButton').click();await page.getByRole('button',{name:/전체 기능 연결 및 테스트/}).click();await page.getByRole('textbox',{name:'테스트 응답',exact:true}).fill('{"position":1,"area":"ROW_1_LEFT"}');await page.getByRole('button',{name:'값 읽기',exact:true}).click();
 }
 await page.screenshot({path:`${directory}/${width}.png`});console.log(`${round} ${width}:`,await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,dialog:document.querySelector('dialog[open]')?.getBoundingClientRect().width})));await page.close();
}}finally{await browser.close()}
