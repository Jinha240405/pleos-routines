import {test,expect} from '@playwright/test';
import {templates} from '../../web/templates.js';
import {exportRoutine} from '../../web/runtime.js';
import {mockNative} from './native-fixture.js';
const ready=page=>page.waitForFunction(()=>window.__app?.editor);
async function addTemplate(page,name=/쾌적한 출발/){
  await page.locator('#templateRoutines').getByRole('button',{name}).click();
  await page.getByRole('button',{name:'이 템플릿으로 만들기',exact:true}).click();
}

test('fresh installs open an empty library and official templates require an explicit choice',async({page})=>{
  await page.goto('/');await ready(page);
  await expect(page.locator('#libraryView')).toBeVisible();
  await expect(page.getByRole('navigation',{name:'앱 화면'}).getByRole('button')).toHaveCount(2);
  await expect(page.locator('#editorTab')).toHaveCount(0);
  await expect(page.locator('#routineCount')).toHaveText('0');
  await expect(page.locator('#templateRoutines .routine-card')).toHaveCount(17);
  await page.getByRole('button',{name:/쾌적한 출발/}).click();
  await expect(page.locator('#templateOverview')).toContainText('26°C');
  await expect(page.locator('#routineCount')).toHaveText('0');
  await page.locator('#templateDialog').getByRole('button',{name:'닫기',exact:true}).last().click();
  await expect(page.locator('#routineCount')).toHaveText('0');
  await addTemplate(page);
  await expect(page.locator('#editorView')).toBeVisible();
  await expect(page.locator('#routineSummary')).toContainText('공조 22°C');
  await expect(page.locator('#libraryTab')).toHaveAttribute('aria-current','page');
  await expect(page.locator('#runButton')).toBeDisabled();
  await page.locator('#backToLibrary').click();
  await expect(page.locator('#savedRoutines .routine-card')).toHaveCount(1);
  await page.reload();await ready(page);await expect(page.locator('#libraryView')).toBeVisible();
  await page.locator('#savedRoutines .routine-card').click();
  await page.goBack();await expect(page.locator('#libraryView')).toBeVisible();
  await page.goForward();await expect(page.locator('#editorView')).toBeVisible();
});

test('existing version-one routines keep names, blocks and the selected routine across deep links',async({page})=>{
  const saved={version:1,activeId:'existing-b',routines:templates.slice(0,2).map((t,i)=>({id:'existing-'+(i?'b':'a'),name:'기존 '+t.name,workspace:t.workspace,updatedAt:'2026-11-01T00:00:00Z'}))};
  await page.addInitScript(data=>localStorage.setItem('pleos-routines-v1',JSON.stringify(data)),saved);
  await page.goto('/#routine/existing-b');await ready(page);
  await expect(page.locator('#routineName')).toHaveValue('기존 출발 전 도어 확인');
  expect(await page.evaluate(()=>window.__app.store.routines.map(r=>r.id))).toEqual(['existing-a','existing-b']);
  await page.locator('#backToLibrary').click();await expect(page.locator('#savedRoutines .routine-card')).toHaveCount(2);
});

test('deleting the final saved routine leaves an honest empty state after reload',async({page})=>{
  await page.goto('/');await ready(page);await addTemplate(page);await page.locator('#backToLibrary').click();
  await page.locator('.routine-more summary').click();
  page.once('dialog',dialog=>dialog.accept());await page.locator('.routine-more-actions').getByRole('button',{name:'삭제',exact:true}).click();
  await expect(page.locator('#routineCount')).toHaveText('0');
  await page.reload();await ready(page);await expect(page.locator('#routineCount')).toHaveText('0');
  await expect(page.locator('.library-empty')).toBeVisible();
});

test('shared routines contain no official templates and sharing asks which saved routine to upload',async({page})=>{
  await page.goto('/');await ready(page);await addTemplate(page);
  await page.locator('#routineName').fill('공유할 첫 루틴');await page.locator('#backToLibrary').click();
  await addTemplate(page,/차박 독서 자리/);
  await page.locator('#communityTab').click();
  await expect(page.getByRole('heading',{name:'모두의 루틴',exact:true})).toBeVisible();
  await expect(page.locator('.starter-grid')).toHaveCount(0);
  await page.getByRole('button',{name:'내 루틴 올리기',exact:true}).first().click();
  await expect(page.getByRole('dialog',{name:'공유할 루틴 선택'})).toBeVisible();
  await page.locator('.publish-routine-list').getByRole('button',{name:/공유할 첫 루틴/}).click();
  await expect(page.locator('.upload-routine-name strong')).toHaveText('공유할 첫 루틴');
  await expect(page.getByRole('button',{name:'모두의 루틴에 올리기',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'취소',exact:true}).click();
  await page.locator('#libraryTab').click();await page.locator('#savedRoutines .routine-card').first().click();
  await page.locator('#publishRoutine').click();
  await expect(page.locator('.upload-routine-name strong')).toHaveText('공유할 첫 루틴');
});

test('file import is explicit and invalid input preserves existing routines',async({page})=>{
  await page.goto('/');await ready(page);await page.locator('#libraryImport').click();
  await expect(page.locator('#routineJson')).not.toBeVisible();
  await page.locator('#routineFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});
  await expect(page.locator('#importError')).toContainText('JSON');
  await expect(page.locator('#routineCount')).toHaveText('0');
  const json=exportRoutine({name:'파일에서 가져온 루틴',workspace:templates[0].workspace});
  await page.locator('#routineFile').setInputFiles({name:'routine.pleos.json',mimeType:'application/json',buffer:Buffer.from(json)});
  await expect(page.locator('#selectedRoutineFile')).toContainText('파일에서 가져온 루틴');
  await expect(page.locator('#routineCount')).toHaveText('0');
  await page.locator('#importJson').click();await expect(page.locator('#routineName')).toHaveValue('파일에서 가져온 루틴');
  await expect(page.locator('#watchEvents')).not.toBeChecked();
});

test('enabled routines keep monitoring across app pages until explicitly switched off',async({page})=>{
  await mockNative(page);await page.goto('/');await ready(page);await addTemplate(page,/충전 80% 알림/);
  await page.locator('#watchEvents').check();await expect(page.locator('#monitorStatus')).toHaveText('ON · 상태 감지 중');
  await page.locator('#backToLibrary').click();await expect(page.locator('.routine-toggle')).toHaveAttribute('aria-checked','true');
  await expect(page.locator('.routine-saved-state')).toHaveText('ON · 상태 감지 중');
  expect(await page.evaluate(()=>window.calls.some(c=>c.action==='api.unsubscribe'))).toBe(false);
  await page.locator('.routine-toggle').click();
  await page.locator('#savedRoutines .routine-card').click();
  await expect(page.locator('#watchEvents')).not.toBeChecked();await expect(page.locator('#monitorStatus')).toContainText('OFF');
  expect(await page.evaluate(()=>window.calls.some(c=>c.action==='api.unsubscribe'))).toBe(true);
});

test('a saved manual routine can run directly from its own card in the vehicle app',async({page})=>{
  await mockNative(page);await page.goto('/');await ready(page);await addTemplate(page);
  await page.locator('#backToLibrary').click();
  await page.locator('.routine-toggle').click();
  await page.getByRole('button',{name:'쾌적한 출발 실행',exact:true}).click();
  await expect(page.locator('#editorView')).toBeVisible();
  await expect(page.locator('#executionState')).toHaveText('실행 완료');
  expect(await page.evaluate(()=>window.__device.climate)).toBe(22);
});

test('vehicle file selection delivers data for preview without automatically importing or executing',async({page})=>{
  await mockNative(page);await page.goto('/');await ready(page);await page.locator('#libraryImport').click();
  await expect(page.locator('#webImportFile')).not.toBeVisible();
  await page.locator('#nativeImportFile').click();
  await page.waitForFunction(()=>window.calls.some(c=>c.action==='import'));
  const text=exportRoutine({name:'차량 파일 가져오기',workspace:templates[0].workspace});
  await page.evaluate(text=>window.dispatchEvent(new CustomEvent('pleos:import-file',{detail:{text,name:'선택한 루틴 파일'}})),text);
  await expect(page.locator('#selectedRoutineFile')).toContainText('차량 파일 가져오기');
  await expect(page.locator('#routineCount')).toHaveText('0');
  await page.locator('#importJson').click();await expect(page.locator('#routineName')).toHaveValue('차량 파일 가져오기');
  expect(await page.evaluate(()=>window.calls.some(c=>c.action==='api.invoke'))).toBe(false);
});

test('library keyboard shortcuts never edit the hidden active routine',async({page})=>{
  await page.goto('/');await ready(page);await addTemplate(page);
  await page.locator('[data-type="vehicle_fan"] .node-menu-button').click();
  await page.getByRole('menuitem',{name:'삭제',exact:true}).click();
  await page.locator('#backToLibrary').click();
  const before=await page.evaluate(()=>JSON.stringify(window.__app.snapshot()));
  await page.keyboard.press('Control+z');
  expect(await page.evaluate(()=>JSON.stringify(window.__app.snapshot()))).toBe(before);
});

test('library, previews, editor and shared page fit laptop and narrow touch screens',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await ready(page);
  for(const width of [1440,1024,375]){
    await page.setViewportSize({width,height:width===375?812:960});await page.locator('#libraryTab').click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:`artifacts/ux-library-${width}.png`,fullPage:true});
    await page.locator('#templateRoutines').getByRole('button',{name:/쾌적한 출발/}).click();
    expect(await page.locator('#templateDialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.getByRole('button',{name:'이 템플릿으로 만들기',exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:`artifacts/ux-editor-${width}.png`,fullPage:true});
    await page.locator('#communityTab').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:`artifacts/ux-shared-${width}.png`,fullPage:true});
  }
  expect(errors).toEqual([]);
});
