import {test,expect} from '@playwright/test';
import {mockNative} from './native-fixture.js';
const ready=page=>page.waitForFunction(()=>window.__app?.editor);
const card=(page,name)=>page.locator('.saved-routine').filter({has:page.getByRole('switch',{name:name+' 사용 설정',exact:true})});
async function add(page,name,event=false,wait=false){
  await page.evaluate(async({name,event,wait})=>{
    const {apiNode,literal}=await import('/api.js');
    const root=event?apiNode('Door.registerDoorPosition',true):{type:'routine_start'};
    const notify={type:'action_notify',inputs:{TEXT:{block:literal(name+' 알림')}}};
    root.next={block:wait?{type:'flow_wait',inputs:{SECONDS:{block:literal(10)}},next:{block:notify}}:notify};
    window.__app.addRoutine(name,{blocks:{blocks:[root]}});
  },{name,event,wait});
}
const settled=page=>page.evaluate(()=>window.__app.automations.settled());

test('web switches save preferences and copies start OFF without pretending to execute',async({page})=>{
  await page.goto('/');await ready(page);await add(page,'웹 루틴');
  await expect(page.locator('#watchEvents')).not.toBeChecked();await expect(page.locator('#runButton')).toBeDisabled();
  await page.locator('#backToLibrary').click();
  const toggle=card(page,'웹 루틴').getByRole('switch');await expect(toggle).toHaveAttribute('aria-checked','false');await toggle.click();
  await expect(card(page,'웹 루틴')).toContainText('ON · 차량 앱에서 사용');await expect(card(page,'웹 루틴').getByRole('button',{name:'웹 루틴 실행'})).toBeDisabled();
  await page.reload();await ready(page);await expect(card(page,'웹 루틴').getByRole('switch')).toHaveAttribute('aria-checked','true');
  await card(page,'웹 루틴').locator('summary').click();await page.getByRole('button',{name:'복제',exact:true}).click();
  await expect(page.locator('#watchEvents')).not.toBeChecked();
  expect(await page.evaluate(()=>window.__app.store.routines.map(r=>r.enabled))).toEqual([true,false]);
});

test('manual OFF blocks running, enabling never auto-runs, and OFF cancels remaining steps',async({page})=>{
  await mockNative(page);await page.goto('/');await ready(page);await add(page,'수동 대기',false,true);
  await expect(page.locator('#runButton')).toBeDisabled();
  await page.locator('#backToLibrary').click();await expect(card(page,'수동 대기').locator('.card-run')).toBeDisabled();
  await card(page,'수동 대기').getByRole('switch').click();
  expect(await page.evaluate(()=>window.__app.runner.running)).toBe(false);
  expect(await page.evaluate(()=>window.calls.some(c=>c.action==='api.invoke'))).toBe(false);
  await card(page,'수동 대기').locator('.card-run').click();await expect(page.locator('#globalExecution')).toBeVisible();
  await page.locator('#watchEvents').uncheck();await expect(page.locator('#executionState')).toHaveText('실행 중지됨');
  await expect(page.locator('#runButton')).toBeDisabled();await expect(page.locator('#logList')).not.toContainText('수동 대기 알림');
  await page.reload();await ready(page);await expect(page.locator('#watchEvents')).not.toBeChecked();
});

test('multiple enabled routines monitor independently of the editor and OFF releases only its own token',async({page})=>{
  await mockNative(page);await page.goto('/');await ready(page);
  await add(page,'첫 감지',true);await page.locator('#watchEvents').check();await settled(page);
  await add(page,'둘째 감지',true);await page.locator('#watchEvents').check();await settled(page);
  const tokens=await page.evaluate(()=>window.calls.filter(c=>c.action==='api.subscribe').map(c=>c.token));expect(tokens).toHaveLength(2);
  await page.locator('#backToLibrary').click();await expect(page.locator('#savedCount')).toContainText('ON 2개');
  await card(page,'첫 감지').getByRole('switch').click();
  const removed=await page.evaluate(()=>window.calls.filter(c=>c.action==='api.unsubscribe').map(c=>c.token));expect(removed).toEqual([tokens[0]]);
  await page.evaluate(tokens=>{for(const token of tokens){window.PleosNative.event(token,0,null);window.PleosNative.event(token,1,null);}},tokens);
  await expect(card(page,'둘째 감지').locator('.routine-result')).toHaveText('실행 완료');
  await expect(card(page,'첫 감지').locator('.routine-result')).toHaveText('');
  await expect(page.locator('#libraryView')).toBeVisible();
  await card(page,'첫 감지').locator('.routine-card').click();await expect(page.locator('#logList')).not.toContainText('둘째 감지 알림');
});

test('native pause suspends subscriptions and resume retains ON with a fresh baseline',async({page})=>{
  await mockNative(page);await page.goto('/');await ready(page);await add(page,'복귀 감지',true);
  await page.locator('#watchEvents').check();await settled(page);
  const first=await page.evaluate(()=>window.calls.find(c=>c.action==='api.subscribe').token);
  await page.evaluate(t=>{window.PleosNative.event(t,0,null);window.PleosNative.pause();window.PleosNative.event(t,1,null);},first);
  await expect(page.locator('#watchEvents')).toBeChecked();await expect(page.locator('#monitorStatus')).toContainText('앱 복귀 후 감지');
  await page.evaluate(()=>window.PleosNative.resume());await settled(page);
  const last=await page.evaluate(()=>window.calls.filter(c=>c.action==='api.subscribe').at(-1).token);expect(last).not.toBe(first);
  await page.evaluate(t=>window.PleosNative.event(t,1,null),last);await expect(page.locator('#executionState')).toHaveText('실행 준비 완료');
  await page.evaluate(t=>window.PleosNative.event(t,0,null),last);await expect(page.locator('#executionState')).toHaveText('실행 완료');
  await page.reload();await ready(page);await expect(page.locator('#watchEvents')).toBeChecked();await expect(page.locator('#monitorStatus')).toContainText('상태 감지 중');
});

test('editing an enabled routine switches it OFF, and storage failure never activates a routine',async({page})=>{
  await mockNative(page);await page.goto('/');await ready(page);
  await page.evaluate(()=>{const t=window.__app.templates[0];window.__app.addRoutine(t.name,t.workspace);});
  await page.locator('#watchEvents').check();
  await page.locator('[data-type="vehicle_fan"] .node-menu-button').click();await page.getByRole('menuitem',{name:'삭제',exact:true}).click();
  await expect(page.locator('#watchEvents')).not.toBeChecked();await expect(page.locator('#toast')).toContainText('수정해 OFF');
  await page.evaluate(()=>window.AndroidBridge.saveState=()=>false);
  await page.locator('#watchEvents').click();await expect(page.locator('#watchEvents')).not.toBeChecked();await expect(page.locator('#saveStatus')).toContainText('저장 실패');
  expect(await page.evaluate(()=>window.calls.some(c=>c.action==='api.subscribe'||c.action==='api.invoke'))).toBe(false);
});

test('a subscription failure switches the routine OFF and displays the error',async({page})=>{
  await mockNative(page);await page.goto('/');await ready(page);await add(page,'지원 안 됨',true);
  await page.evaluate(()=>{
    const request=window.AndroidBridge.request;
    window.AndroidBridge.request=text=>{const r=JSON.parse(text);if(r.action==='api.subscribe'){window.calls.push(r);setTimeout(()=>window.PleosNative.resolve(r.id,{ok:false,error:'감지 지원 없음'}),5);}else request(text);};
  });
  await page.locator('#watchEvents').click();await expect(page.locator('#watchEvents')).not.toBeChecked();await expect(page.locator('#monitorStatus')).toHaveText('OFF · 감지 연결 실패');
  await expect(page.locator('#toast')).toContainText('감지 지원 없음');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('native-fixture-state')).routines[0].enabled)).toBe(false);
});

test('failed OFF saves still stop monitoring and display an unsaved setting',async({page})=>{
  await mockNative(page);await page.goto('/');await ready(page);await add(page,'저장 실패 감지',true);
  await page.locator('#watchEvents').check();await settled(page);
  const token=await page.evaluate(()=>window.calls.find(c=>c.action==='api.subscribe').token);
  await page.evaluate(()=>window.AndroidBridge.saveState=()=>false);
  await page.locator('#watchEvents').click();
  await expect(page.locator('#watchEvents')).not.toBeChecked();await expect(page.locator('#monitorStatus')).toHaveText('OFF · 설정 저장 실패');
  await page.evaluate(t=>{window.PleosNative.event(t,0,null);window.PleosNative.event(t,1,null);},token);
  await expect(page.locator('#executionState')).toHaveText('실행 준비 완료');
  expect(await page.evaluate(()=>window.__app.store.routines[0].enabled)).toBe(false);
});
