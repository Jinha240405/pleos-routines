import { test, expect } from '@playwright/test';

async function touchNumber(page,label,value){await page.getByRole('button',{name:label+' 숫자판 열기',exact:true}).click();const pad=page.getByRole('group',{name:label+' 숫자판',exact:true});await pad.getByRole('button',{name:'지우기',exact:true}).click();for(const digit of String(value))await pad.getByRole('button',{name:digit,exact:true}).click();await pad.getByRole('button',{name:'숫자 적용',exact:true}).click();}
const ready = page => page.waitForFunction(() => window.__app?.editor);
const closeTest = page => page.locator('#testDialog .close-dialog').click();
const card = (page, type) => page.locator(`[data-type="${type}"]`);
const menu = async (page,type,action) => { await card(page,type).first().locator('.node-menu-button').click(); await page.getByRole('menuitem',{name:action,exact:true}).click(); };
test.beforeEach(async ({page}) => { await page.goto('/'); await ready(page); });

test('clean canvas keeps tests hidden and executes both branches', async ({page}) => {
 await expect(page.locator('aside')).toHaveCount(0);await expect(page.locator('#testDialog')).not.toBeVisible();
 await page.locator('#runButton').click();await expect(page.locator('#executionState')).toHaveText('실행 완료');
 await page.locator('#resultButton').click();await expect(page.locator('#climateValue')).toHaveText('22°C');await expect(page.locator('#fanValue')).toHaveText('3단계');
 await page.locator('#temperature').fill('20');await closeTest(page);await page.locator('#runButton').click();await expect(page.locator('#executionState')).toHaveText('실행 완료');
 await page.locator('#resultButton').click();await expect(page.locator('#logList')).toContainText('지금 온도가 좋아요');
});
test('editing a card updates execution and persists across reload', async ({page}) => {
 await card(page,'vehicle_climate').locator('.card-main').click();await touchNumber(page,'설정 온도 (°C)',21);await page.getByRole('button',{name:'적용',exact:true}).click();
 await expect(card(page,'vehicle_climate')).toContainText('21°C');await page.locator('#routineName').fill('우리 가족 출발');await page.locator('#routineName').blur();await expect(page.locator('#saveStatus')).toHaveText('모든 변경 사항 저장됨');
 await page.reload();await ready(page);await expect(page.locator('#routineName')).toHaveValue('우리 가족 출발');await expect(card(page,'vehicle_climate')).toContainText('21°C');
 await page.locator('#runButton').click();await expect(page.locator('#executionState')).toHaveText('실행 완료');await expect(page.locator('#climateValue')).toHaveText('21°C');
});
test('action picker, delete, undo and redo preserve the flow', async ({page}) => {
 await page.locator('.add-step').first().click();await page.getByRole('textbox',{name:'동작 찾기'}).fill('대기');await page.getByRole('button',{name:/잠시 대기/}).click();
 await expect(card(page,'flow_wait')).toHaveCount(1);await menu(page,'flow_wait','삭제');await expect(card(page,'flow_wait')).toHaveCount(0);
 await page.locator('#undoButton').click();await expect(card(page,'flow_wait')).toHaveCount(1);await page.locator('#redoButton').click();await expect(card(page,'flow_wait')).toHaveCount(0);
});
test('real drag moves an action between branches and undo restores it', async ({page}) => {
 const source=card(page,'vehicle_fan').locator('.drag-handle');const destination=page.locator('.branch-grid>.flow-list').nth(1).locator('.flow-card').first();
 await source.dragTo(destination);
 const lists=page.locator('.branch-grid>.flow-list');await expect(lists.nth(1).locator('[data-type="vehicle_fan"]')).toHaveCount(1);await expect(lists.nth(0).locator('[data-type="vehicle_fan"]')).toHaveCount(0);
 await page.locator('#undoButton').click();await expect(lists.nth(0).locator('[data-type="vehicle_fan"]')).toHaveCount(1);
});
test('menu reorders and duplicates cards without duplicating IDs', async ({page}) => {
 await menu(page,'vehicle_fan','위로 이동');const cards=page.locator('.branch-grid>.flow-list').first().locator('.flow-card');await expect(cards.first()).toHaveAttribute('data-type','vehicle_fan');
 await menu(page,'vehicle_fan','복제');await expect(card(page,'vehicle_fan')).toHaveCount(2);
 await page.locator('#runButton').click();await expect(page.locator('#executionState')).toHaveText('실행 완료');
});
test('import errors preserve data and legacy JSON remains compatible', async ({page}) => {
 await page.locator('#shareButton').click();const json=await page.locator('#routineJson').inputValue();
 await page.locator('#routineJson').fill('{bad');await page.locator('#importJson').click();await expect(page.locator('#importError')).toContainText('JSON');
 const parsed=JSON.parse(json);parsed.name='기존 파일';await page.locator('#routineJson').fill(JSON.stringify(parsed));await page.locator('#importJson').click();await expect(page.locator('#shareDialog')).not.toBeVisible();
 await expect(page.locator('#routineCount')).toHaveText('2');await expect(card(page,'vehicle_climate')).toHaveCount(1);await expect(page.locator('#executionState')).toHaveText('실행 준비 완료');
});
test('trigger editing and explicit arming control event execution', async ({page}) => {
 await card(page,'routine_start').locator('.card-main').click();await page.getByRole('radio',{name:'차량 상태 감지',exact:true}).click();await page.getByRole('button',{name:'적용',exact:true}).click();
 await expect(card(page,'routine_event')).toContainText('도어');await page.locator('#testButton').click();await page.locator('#doorToggle').click();await expect(page.locator('#logCount')).toHaveText('0');
 await page.locator('#watchEvents').check();await page.locator('#doorToggle').click();await expect(page.locator('#executionState')).toHaveText('실행 완료');
 await expect(page.locator('#climateValue')).toHaveText('22°C');
});
test('cancellation prevents later actions and SDK failure stays visible in settings', async ({page}) => {
 await page.evaluate(() => {
  const notify = {type:'action_notify',inputs:{TEXT:{block:{type:'value_text',fields:{VALUE:'should-never-run'}}}}};
  const wait = {type:'flow_wait',inputs:{SECONDS:{block:{type:'value_number',fields:{VALUE:10}}}},next:{block:notify}};
  window.__app.addRoutine('중지 테스트',{blocks:{blocks:[{type:'routine_start',next:{block:wait}}]}});
 });
 await page.locator('#runButton').click();await expect(card(page,'flow_wait').locator('.card-main')).toBeDisabled();await page.locator('#stopButton').click();await expect(page.locator('#executionState')).toHaveText('실행 중지됨');
 await page.locator('#testButton').click();await expect(page.locator('#logList')).not.toContainText('should-never-run');await page.locator('#vehicleMode').click();await expect(page.locator('#demoMode')).toHaveClass('selected');await expect(page.locator('#modeNote')).toContainText('Android APK');
});
test('repeat and variable templates run through the card editor', async ({page}) => {
 await page.locator('#libraryTab').click();await page.getByRole('button',{name:/충전 리마인더/}).click();await page.locator('#testButton').click();await page.locator('#battery').fill('20');await closeTest(page);
 await page.locator('#runButton').click();await expect(page.locator('#executionState')).toHaveText('실행 완료');await page.locator('#resultButton').click();await expect(page.locator('#logList')).toContainText('배터리가 부족해요');await page.locator('#variablesTab').click();await expect(page.locator('#variablesList')).toContainText('충전기준');await expect(page.locator('#variablesList')).toContainText('30');
});
test('touch condition editing changes the branch and invalid keypad values are rejected', async ({page}) => {
 await card(page,'flow_if').locator('.card-main').click();await touchNumber(page,'비교할 값',30);await page.getByRole('button',{name:'적용',exact:true}).click();
 await page.locator('#runButton').click();await expect(page.locator('#executionState')).toHaveText('실행 완료');await page.locator('#resultButton').click();await expect(page.locator('#logList')).toContainText('지금 온도가 좋아요');await closeTest(page);
 await card(page,'vehicle_climate').locator('.card-main').click();await page.getByRole('button',{name:'설정 온도 (°C) 숫자판 열기'}).click();const pad=page.getByRole('group',{name:'설정 온도 (°C) 숫자판',exact:true});await pad.getByRole('button',{name:'지우기',exact:true}).click();await pad.getByRole('button',{name:'±',exact:true}).click();await pad.getByRole('button',{name:'숫자 적용',exact:true}).click();await expect(pad.getByRole('alert')).toContainText('숫자');
});
test('desktop and mobile keep readable text with no side panel or overflow', async ({page}) => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,1024,375]){
  await page.setViewportSize({width,height:width===375?812:960});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect(await page.locator('.node-title').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.screenshot({path:`artifacts/cards-${width}.png`,fullPage:true});
 }
 await page.locator('#runButton').click();await expect(page.locator('#executionState')).toHaveText('실행 완료');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);expect(errors).toEqual([]);
});
test('mobile picker preserves query through keyboard resize and dialog traps focus', async ({page}) => {
 await page.setViewportSize({width:375,height:812});await page.locator('.add-step').first().click();const search=page.getByRole('textbox',{name:'동작 찾기'});await search.fill('조건');
 await page.setViewportSize({width:375,height:500});await expect(search).toHaveValue('조건');await expect(page.locator('.action-options').getByRole('button',{name:/조건에 따라 나누기/})).toBeVisible();
 await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement.closest('dialog')!==null)).toBe(true);
 await page.keyboard.press('Escape');await expect(page.locator('.flow-dialog')).toHaveCount(0);
});
