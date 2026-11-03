import { test, expect } from '@playwright/test';
const ready = page => page.waitForFunction(() => window.__app?.editor);

test('browser editor cannot simulate vehicle execution and offers all five editable recipes', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await expect(page.locator('#runButton')).toBeDisabled(); await expect(page.locator('#runButton')).toHaveText('차량에서 실행');
  await expect(page.locator('#watchEvents')).toBeDisabled(); await expect(page.locator('#testButton,#testDialog,#apiInspectorRoot')).toHaveCount(0);
  await page.locator('#communityTab').click(); await expect(page.locator('.starter-grid .community-card')).toHaveCount(5);
  await page.getByRole('button', { name: /캠핑 철수 브리핑/ }).click();
  await expect(page.getByRole('dialog')).toContainText('문 위치');
  await page.getByRole('button', { name: '내 루틴에 내려받기', exact: true }).click();
  await expect(page.locator('#routineName')).toHaveValue('캠핑 철수 브리핑');
  await expect(page.locator('#watchEvents')).not.toBeChecked(); await expect(page.locator('#executionState')).toHaveText('실행 준비 완료');
  await expect(page.locator('[data-type="variable_set"]')).not.toHaveCount(0);
});
test('two independent browsers upload and download through the real persistent community server', async ({ browser }) => {
  const a = await browser.newContext(), b = await browser.newContext(); const publisher = await a.newPage(), receiver = await b.newPage();
  const name = '공유 확인 ' + Date.now();
  try {
    await publisher.goto('/'); await ready(publisher); await publisher.locator('#routineName').fill(name);
    await publisher.locator('#communityTab').click(); await publisher.getByRole('button', { name: '내 루틴 올리기', exact: true }).first().click();
    const dialog = publisher.getByRole('dialog'); await dialog.getByLabel('닉네임', { exact: true }).fill('장거리 운전자');
    await dialog.getByLabel('분류', { exact: true }).selectOption('장거리');
    await dialog.getByLabel('어떤 상황에서 유용한가요?', { exact: true }).fill('휴게소에서 쉬었다가 출발할 때 쓰는 설정입니다.');
    await expect(dialog.getByRole('button', { name: '커뮤니티에 올리기', exact: true })).toBeDisabled();
    await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: '커뮤니티에 올리기', exact: true }).click(); await expect(dialog).not.toBeVisible();
    await expect(publisher.locator('.community-grid')).toContainText(name);
    await receiver.goto('/'); await ready(receiver); await receiver.locator('#communityTab').click();
    await receiver.getByRole('textbox', { name: '커뮤니티 루틴 검색' }).fill(name);
    await receiver.locator('.community-grid').getByRole('button', { name: new RegExp(name) }).click();
    await expect(receiver.getByRole('button', { name: '게시물 삭제', exact: true })).toHaveCount(0);
    await receiver.getByRole('button', { name: '내 루틴에 내려받기', exact: true }).click();
    await expect(receiver.locator('#routineName')).toHaveValue(name); await expect(receiver.locator('#watchEvents')).not.toBeChecked();
    await receiver.reload(); await ready(receiver); await expect(receiver.locator('#routineName')).toHaveValue(name);
    await publisher.getByRole('button', { name: '게시물 새로고침' }).click();
    await publisher.locator('.community-grid').getByRole('button', { name: new RegExp(name) }).click();
    publisher.once('dialog', d => d.accept()); await publisher.getByRole('button', { name: '게시물 삭제', exact: true }).click();
    await expect(publisher.getByRole('dialog')).not.toBeVisible(); await expect(publisher.locator('.community-grid').getByRole('button', { name: new RegExp(name) })).toHaveCount(0);
  } finally { await a.close(); await b.close(); }
});
test('community server failure offers retry and preserves local editing', async ({ page }) => {
  await page.route('**/api/community/**', route => route.abort()); await page.goto('/'); await ready(page); await page.locator('#communityTab').click();
  await expect(page.getByRole('alert')).toContainText('연결되지 않았어요'); await expect(page.getByRole('button', { name: '다시 연결' })).toBeVisible();
  await page.getByRole('button', { name: /차박 독서 자리/ }).click(); await page.getByRole('button', { name: '내 루틴에 내려받기', exact: true }).click();
  await expect(page.locator('#routineName')).toHaveValue('차박 독서 자리');
});
test('community cards, upload form and detail fit touch and desktop viewports', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await ready(page); await page.locator('#communityTab').click();
  for (const width of [1440, 1024, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `artifacts/community-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /빈 동승석 정리/ }).click();
    expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole('dialog').getByRole('button', { name: '닫기', exact: true }).first().click();
    await page.getByRole('button', { name: '내 루틴 올리기', exact: true }).first().click();
    expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole('button', { name: '취소', exact: true }).click();
  }
  expect(errors).toEqual([]);
});
