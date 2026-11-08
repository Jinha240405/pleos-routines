// Existing editor regression tests start with an explicit saved example.
// Fresh-install and list-first behavior are covered separately in navigation.spec.js.
export async function readyEditor(page) {
  await page.waitForFunction(() => window.__app?.editor);
  if (await page.locator('#editorView').isVisible()) return;
  if (await page.evaluate(() => window.__app.store.routines.length === 0)) {
    await page.evaluate(() => { const t=window.__app.templates[0]; window.__app.addRoutine(t.name,t.workspace,t.id); });
  } else {
    await page.locator('#savedRoutines .routine-card').first().click();
  }
}
export async function useTemplate(page, name) {
  await page.locator('#libraryTab').click();
  await page.locator('#templateRoutines').getByRole('button',{name}).click();
  await page.getByRole('button',{name:'이 템플릿으로 만들기',exact:true}).click();
}
export async function runRoutine(page, method='click') {
  await page.locator('#watchEvents').check();
  await page.locator('#runButton')[method]();
}
