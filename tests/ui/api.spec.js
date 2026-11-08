import {test,expect} from '@playwright/test';
import {readyEditor,runRoutine} from './editor-fixture.js';

async function touchNumber(page,label,value){await page.getByRole('button',{name:label+' 숫자판 열기',exact:true}).click();const pad=page.getByRole('group',{name:label+' 숫자판',exact:true});await pad.getByRole('button',{name:'지우기',exact:true}).click();for(const digit of String(value))await pad.getByRole('button',{name:digit,exact:true}).click();await pad.getByRole('button',{name:'숫자 적용',exact:true}).click();}
const ready=readyEditor;
const connect=async page=>{};
async function nativeMock(page,{fail=false}={}){
 await page.addInitScript(({fail})=>{
  window.calls=[];window.AndroidBridge={loadState:()=>'',saveState:()=>true,request:text=>{const r=JSON.parse(text);window.calls.push(r);setTimeout(()=>window.PleosNative.resolve(r.id,r.action==='api.invoke'&&fail?{ok:false,error:'이 차량에서 지원하지 않습니다.'}:{ok:true,value:r.action==='api.invoke'?28:{status:'registered'}}),5)}};
 },{fail});
}
test('catalog picker searches vehicle actions, edits typed arguments and preserves API IDs',async({page})=>{
 await page.goto('/');await ready(page);await page.locator('.add-step').first().click();await page.getByRole('button',{name:'차량·연결 기능',exact:true}).click();await page.getByRole('button',{name:'창문',exact:true}).click();
 await expect(page.locator('.api-option')).toHaveCount(6);await page.getByRole('button',{name:/창문 위치.*동작시키기/}).click();
 const card=page.locator('[data-type="api_call"]');await card.locator('.card-main').click();await page.getByRole('group',{name:'대상 영역',exact:true}).getByRole('button',{name:'운전석',exact:true}).click();await touchNumber(page,'창문 위치',30);await page.getByRole('button',{name:'적용',exact:true}).click();
 const state=await page.evaluate(()=>window.__app.snapshot());expect(JSON.stringify(state)).toContain('Window.setWindowPosition');expect(JSON.stringify(state)).toContain('ROW_1_LEFT');
 await page.reload();await ready(page);await expect(page.locator('[data-type="api_call"]')).toContainText('창문 위치');
});
test('vehicle mode routes old climate cards to the actual API bridge and surfaces errors',async({page})=>{
 await nativeMock(page,{fail:true});await page.goto('/');await ready(page);await runRoutine(page);await expect(page.locator('#executionState')).toHaveText('동작 설정을 확인해 주세요');await expect(page.locator('.node-error')).toContainText('지원하지 않습니다');
 expect(await page.evaluate(()=>window.calls.some(c=>c.operation==='HVAC.getHvacTemperatureCurrent'))).toBe(true);
});
test('API read flows store native results in variables',async({page})=>{
 await nativeMock(page);await page.goto('/');await ready(page);await page.evaluate(async()=>{const{apiNode}=await import('/api.js');const n=apiNode('EvBattery.getEvBatteryStateOfCharge');n.fields.NAME='충전율';window.__app.addRoutine('배터리 조회',{blocks:{blocks:[{type:'routine_start',next:{block:n}}]}})});await runRoutine(page);await expect(page.locator('#executionState')).toHaveText('실행 완료');expect(await page.evaluate(()=>window.__app.variables['충전율'])).toBe(28);
});
test('foreground subscriptions use a baseline, fire on change and discard late callbacks',async({page})=>{
 await nativeMock(page);await page.goto('/');await ready(page);await page.evaluate(async()=>{const{apiNode}=await import('/api.js');const root=apiNode('Door.registerDoorPosition',true);root.next={block:{type:'action_notify',inputs:{TEXT:{block:{type:'value_text',fields:{VALUE:'문 상태 변경 수신'}}}}}};window.__app.addRoutine('문 감지',{blocks:{blocks:[root]}})});await page.locator('#watchEvents').check();
 await page.waitForFunction(()=>window.calls.some(c=>c.action==='api.subscribe'));const token=await page.evaluate(()=>window.calls.find(c=>c.action==='api.subscribe').token);
 await page.evaluate(token=>window.PleosNative.event(token,0,null),token);await expect(page.locator('#logList')).toContainText('기준값 수신');await page.evaluate(token=>window.PleosNative.event(token,1,null),token);await expect(page.locator('#executionState')).toHaveText('실행 완료');await expect(page.locator('#logList')).toContainText('문 상태 변경 수신');
 await page.locator('#watchEvents').uncheck();const count=await page.locator('#logCount').textContent();await page.evaluate(token=>window.PleosNative.event(token,0,null),token);await expect(page.locator('#logCount')).toHaveText(count);
});
test('API dialogs fit desktop and mobile with readable arguments',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await ready(page);
 for(const width of [1440,375]){
  await page.setViewportSize({width,height:width===375?812:1000});await page.locator('.add-step').first().click();await page.getByRole('button',{name:'차량·연결 기능',exact:true}).click();await page.getByRole('button',{name:'조명',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.screenshot({path:`artifacts/api-picker-${width}.png`,fullPage:true});await page.keyboard.press('Escape');

 }expect(errors).toEqual([]);
});

test.describe('touch-only configuration',()=>{
 test.use({hasTouch:true,viewport:{width:375,height:812}});
 test('category, rear location, numeric value and execution work with taps',async({page})=>{
  await nativeMock(page);await page.goto('/');await ready(page);
  await page.locator('.add-step').first().tap();await page.getByRole('button',{name:'차량·연결 기능',exact:true}).tap();await page.getByRole('button',{name:'창문',exact:true}).tap();await page.getByRole('button',{name:/창문 위치.*동작시키기/}).tap();
  await page.locator('[data-type="api_call"] .card-main').tap();await page.getByRole('button',{name:'다른 위치 보기',exact:true}).tap();await page.getByRole('button',{name:'2열 오른쪽',exact:true}).tap();await page.getByRole('button',{name:'25',exact:true}).tap();await page.getByRole('button',{name:'적용',exact:true}).tap();
  await runRoutine(page,'tap');await expect(page.locator('#executionState')).toHaveText('실행 완료');
  const call=await page.evaluate(()=>window.calls.find(c=>c.operation==='Window.setWindowPosition'));expect(call.args).toContain('ROW_2_RIGHT');expect(call.args).toContain(25);
  expect(await page.locator('textarea:visible').count()).toBe(0);
 });
});

test('an armed Gleo stop request interrupts an active flow before handling the command',async({page})=>{
 await nativeMock(page);await page.goto('/');await ready(page);await page.evaluate(async()=>{
  const {apiNode,literal}=await import('/api.js'),stop=apiNode('Gleo.command',true);stop.inputs.ARG0={block:literal('STOP_ROUTINE')};stop.next={block:{type:'action_notify',inputs:{TEXT:{block:literal('중지 요청 처리')}}}};
  const waiting={type:'routine_start',next:{block:{type:'flow_wait',inputs:{SECONDS:{block:literal(10)}},next:{block:{type:'action_notify',inputs:{TEXT:{block:literal('실행되면 안 됨')}}}}}}};
  window.__app.addRoutine('Gleo 중지 확인',{blocks:{blocks:[waiting,stop]}});
 });await page.locator('#watchEvents').check();await page.waitForFunction(()=>window.calls.some(c=>c.action==='api.subscribe'));const token=await page.evaluate(()=>window.calls.find(c=>c.action==='api.subscribe').token);await runRoutine(page);await expect(page.locator('#stopButton')).toBeVisible();await page.evaluate(t=>window.PleosNative.event(t,{command:'STOP_ROUTINE'},null),token);await expect(page.locator('#executionState')).toHaveText('실행 완료');await page.locator('#resultButton').click();await expect(page.locator('#logList')).toContainText('중지 요청 처리');await expect(page.locator('#logList')).not.toContainText('실행되면 안 됨');
});

 test('temperature unit selection converts the touch value and display together',async({page})=>{
 await page.goto('/');await ready(page);await page.evaluate(async()=>{const{apiNode}=await import('/api.js');window.__app.addRoutine('온도 단위',{blocks:{blocks:[{type:'routine_start',next:{block:apiNode('HVAC.setHvacTemperature')}}]}})});await page.locator('[data-type="api_call"] .card-main').click();await page.getByRole('button',{name:'화씨 °F',exact:true}).click();await expect(page.locator('.number-display')).toContainText('72');await expect(page.locator('.number-display')).toContainText('°F');await page.getByRole('button',{name:'적용',exact:true}).click();const state=await page.evaluate(()=>window.__app.snapshot());expect(JSON.stringify(state)).toContain('FAHRENHEIT');expect(JSON.stringify(state)).toContain('72');
 });
