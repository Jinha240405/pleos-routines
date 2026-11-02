import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const ready=page=>page.waitForFunction(()=>window.__app?.editor);
test.use({hasTouch:true});
test('icon start choices retain per-mode settings and the downstream flow',async({page})=>{
 await page.goto('/');await ready(page);await page.locator('[data-type="routine_start"] .card-main').tap();
 await expect(page.locator('.flow-dialog select')).toHaveCount(0);
 await page.getByRole('radio',{name:'차량 상태 감지',exact:true}).tap();await page.getByRole('radio',{name:'배터리',exact:true}).tap();
 await page.getByRole('radio',{name:'직접 실행',exact:true}).tap();await page.getByRole('radio',{name:'차량 상태 감지',exact:true}).tap();await expect(page.getByRole('radio',{name:'배터리',exact:true})).toHaveAttribute('aria-checked','true');
 await page.getByRole('button',{name:'적용',exact:true}).tap();await expect(page.locator('[data-type="routine_event"]')).toContainText('배터리 감지');await expect(page.locator('[data-type="flow_if"]')).toHaveCount(1);
 await page.reload();await ready(page);await expect(page.locator('[data-type="routine_event"]')).toContainText('배터리');
});
test('value kinds and watched signals are icon choices with keyboard support',async({page})=>{
 await page.goto('/');await ready(page);await page.locator('[data-type="flow_if"] .card-main').tap();await expect(page.locator('.flow-dialog select')).toHaveCount(0);
 await page.getByRole('button',{name:'확인할 상태 종류',exact:true}).tap();await expect(page.getByRole('radio',{name:'연결된 값',exact:true})).toBeVisible();await page.getByRole('radio',{name:'차량 상태',exact:true}).tap();
 const signals=page.getByRole('radiogroup',{name:'확인할 상태 차량 상태'});await signals.getByRole('radio',{name:'실내 온도',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(signals.getByRole('radio',{name:'배터리',exact:true})).toHaveAttribute('aria-checked','true');await page.getByRole('button',{name:'적용',exact:true}).tap();await expect(page.locator('[data-type="flow_if"]')).toContainText('배터리');
});
for(const width of [1440,375])test(`three visual rounds of trigger choices at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===375?812:1000});await fs.mkdir('artifacts/start-choice-rounds',{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await ready(page);await page.locator('[data-type="routine_start"] .card-main').tap();
 for(const [round,mode] of [[1,'직접 실행'],[2,'차량 상태 감지'],[3,'상태 변화 감지']]){
  await page.getByRole('radio',{name:mode,exact:true}).tap();if(round===2)await page.getByRole('radio',{name:'실내 온도',exact:true}).tap();
  if(round===3){await page.getByRole('button',{name:'변경',exact:true}).tap();await page.getByRole('button',{name:'위치',exact:true}).tap();await page.getByRole('button',{name:/위치 변경.*변화 감지/}).tap()}
  await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);expect(await page.locator('.flow-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:`artifacts/start-choice-rounds/round-${round}-${width}.png`});
 }
 await page.getByRole('button',{name:'적용',exact:true}).tap();await expect(page.locator('[data-type="routine_api_event"]')).toContainText('위치 변경 감지');expect(errors).toEqual([]);
});
