import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const round=process.argv[2]||'1',folder=`artifacts/touch-round-${round}`;await fs.mkdir(folder,{recursive:true});
const browser=await chromium.launch();
try{for(const width of [1440,375]){
 const page=await browser.newPage({viewport:{width,height:width===375?812:1000},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__app?.editor);await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`${folder}/canvas-${width}.png`,fullPage:true});
 if(round==='1'){await page.locator('.add-step').first().click();await page.getByRole('button',{name:'차량·연결 기능',exact:true}).click()}
 else if(round==='2'){await page.evaluate(async()=>{const{apiNode}=await import('/api.js');window.__app.addRoutine('공조 맞추기',{blocks:{blocks:[{type:'routine_start',next:{block:apiNode('HVAC.setHvacTemperature')}}]}})});await page.locator('[data-type="api_call"] .card-main').click()}
 else{await page.locator('#testButton').click();await page.getByRole('button',{name:/전체 기능 연결 및 테스트/}).click();await page.getByRole('button',{name:'테스트 값 늘리기'}).click();await page.getByRole('button',{name:'값 읽기',exact:true}).click()}
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${folder}/dialog-${width}.png`});
 const metrics=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,font:getComputedStyle(document.body).fontFamily,dialogs:[...document.querySelectorAll('dialog[open]')].map(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth}))}));console.log(JSON.stringify({round,width,metrics,errors}));await page.close();
}}finally{await browser.close()}
