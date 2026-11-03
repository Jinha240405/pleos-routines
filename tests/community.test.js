import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createCommunityServer } from '../server/community.mjs';
import { templates, practicalTemplates } from '../web/templates.js';
import { exportRoutine, RoutineRunner, validateWorkspace } from '../web/runtime.js';
import { inspectRoutine } from '../web/community-model.js';
import { operation, validateArguments } from '../web/api.js';

const one = 'a'.repeat(64), two = 'b'.repeat(64);
async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'routines-community-'));
  let server;
  const start = async () => { server = await createCommunityServer({ dataDir: dir }); await new Promise(r => server.listen(0, '127.0.0.1', r)); };
  const stop = async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); };
  await start();
  t.after(async () => { await stop(); assert.equal(path.dirname(path.resolve(dir)), path.resolve(tmpdir())); assert.ok(path.basename(dir).startsWith('routines-community-')); await rm(dir, { recursive: true, force: true }); });
  return { dir, restart: async () => { await stop(); await start(); }, send: async (route, { method = 'GET', token = one, body, origin } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/community/${route}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(origin ? { Origin: origin } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  } };
}
const post = (i = 0) => ({ author: '캠핑하는 운전자', description: `내 취향으로 바꾸는 루틴 ${i}`, category: '캠핑', routine: JSON.parse(exportRoutine(practicalTemplates[4])) });

test('separate clients publish, discover, download an unchanged routine, and retain posts after restart', async t => {
  const f = await fixture(t), published = await f.send('posts', { method: 'POST', body: post() });
  assert.equal(published.status, 201); const id = published.data.id;
  const listed = await f.send('posts?q=철수&category=캠핑', { token: two });
  assert.equal(listed.data.total, 1); assert.equal(listed.data.items[0].mine, false);
  assert.equal('owner' in listed.data.items[0], false); assert.equal('routine' in listed.data.items[0], false);
  const result = await f.send(`posts/${id}/download`, { method: 'POST', token: two });
  assert.equal(result.status, 200); assert.deepEqual(result.data.routine, post().routine);
  assert.equal(result.data.downloads, 1);
  await f.restart();
  const detail = await f.send('posts/' + id); assert.equal(detail.data.downloads, 1); assert.equal(detail.data.mine, true);
  assert.equal((await f.send('posts?mine=1', { token: two })).data.total, 0);
  assert.equal((await f.send('posts?mine=1')).data.total, 1);
  assert.ok(!(await readFile(path.join(f.dir, 'posts.json'), 'utf8')).includes(one));
});
test('ownership, allowed origin and schema checks prevent anonymous mutation and invalid execution data', async t => {
  const f = await fixture(t);
  assert.equal((await f.send('posts', { method: 'POST', body: post(), token: null })).status, 401);
  assert.equal((await f.send('posts', { method: 'POST', body: post(), origin: 'https://untrusted.example' })).status, 403);
  const invalid = post(); invalid.routine.workspace.blocks.blocks[0].type = 'javascript_eval';
  assert.equal((await f.send('posts', { method: 'POST', body: invalid })).status, 400);
  const bad = post(); bad.author = 'x'.repeat(31);
  assert.equal((await f.send('posts', { method: 'POST', body: bad })).status, 400);
  const valid = await f.send('posts', { method: 'POST', body: post() });
  assert.equal((await f.send('posts/' + valid.data.id, { method: 'DELETE', token: two })).status, 403);
  assert.equal((await f.send('posts/' + valid.data.id, { method: 'DELETE' })).status, 200);
  assert.equal((await f.send('posts/' + valid.data.id)).status, 404);
});
test('concurrent publishes and downloads preserve every write', async t => {
  const f = await fixture(t);
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => f.send('posts', { method: 'POST', body: post(i) })));
  assert.ok(results.every(r => r.status === 201)); assert.equal((await f.send('posts')).data.total, 8);
  const id = results[0].data.id;
  await Promise.all(Array.from({ length: 8 }, () => f.send(`posts/${id}/download`, { method: 'POST', token: two })));
  assert.equal((await f.send('posts/' + id)).data.downloads, 8);
});
test('catalogue and all 17 templates validate, summaries disclose writes and foreground events', () => {
  for (const template of templates) validateWorkspace(template.workspace);
  assert.equal(templates.length, 17);
  const summary = inspectRoutine(practicalTemplates[0].workspace);
  assert.equal(summary.events, true);
  assert.equal(summary.features.filter(f => f.kind === 'write').length, 3);
});

async function runRecipe(id, { gear = 'GEAR_PARK', occupied = false, battery = 75, open = false, unsupported = false } = {}) {
  const template = practicalTemplates.find(t => t.id === id), calls = [], messages = [];
  const adapter = {
    invoke: async (id, args) => { const op = operation(id); validateArguments(op, args); calls.push({ id, args }); if (unsupported) throw new Error('unsupported'); if (id.startsWith('Gear.')) return gear; if (id.includes('Occupancy')) return occupied; if (id.startsWith('Window.') || id.startsWith('Door.')) return open ? 1 : 0; return true; },
    read: async () => battery, set: async (action, value) => calls.push({ id: action, value }), notify: async text => messages.push(text), say: async text => messages.push(text),
  };
  const root = template.workspace.blocks.blocks[0];
  await new RoutineRunner(adapter, { stepDelay: 0 }).run(template.workspace, root.type === 'routine_api_event' ? { rootId: root.id, value: false } : 'manual');
  return { calls, messages };
}
test('empty passenger cleanup only writes for an unoccupied seat in Park', async () => {
  for (const settings of [{ occupied: true }, { gear: 'GEAR_DRIVE' }]) {
    const result = await runRecipe('empty-passenger', settings);
    assert.equal(result.calls.filter(c => c.id.includes('.set')).length, 0);
  }
  const result = await runRecipe('empty-passenger');
  assert.equal(result.calls.filter(c => c.id.includes('.set')).length, 3);
  assert.ok(result.calls.filter(c => c.id.includes('.set')).every(c => c.args[0] === 'ROW_1_RIGHT'));
});
test('charging and arrival recipes take different branches at user thresholds', async () => {
  const low = await runRecipe('charge-and-leave', { battery: 69 });
  assert.ok(low.calls.some(c => c.id === 'Navi.requestNavigationScreen')); assert.ok(!low.calls.some(c => c.id.includes('.set')));
  const enough = await runRecipe('charge-and-leave', { battery: 70 });
  assert.ok(enough.calls.some(c => c.id === 'HVAC.setHvacPower')); assert.ok(!enough.calls.some(c => c.id.startsWith('Navi.')));
  assert.ok((await runRecipe('arrival-next', { battery: 44 })).calls.some(c => c.id.startsWith('Navi.')));
  assert.ok(!(await runRecipe('arrival-next', { battery: 45 })).calls.some(c => c.id.startsWith('Navi.')));
});
test('pack-up reads once into one spoken checklist and aborts on unsupported data', async () => {
  const result = await runRecipe('camp-packup', { battery: 30, open: true });
  assert.equal(result.messages.length, 1); assert.match(result.messages[0], /적재함/); assert.match(result.messages[0], /40%/);
  const closed = await runRecipe('camp-packup', { battery: 80 });
  assert.doesNotMatch(closed.messages[0], /열려 있어요|미만/);
  await assert.rejects(runRecipe('camp-packup', { unsupported: true }), /unsupported/);
  assert.equal((await runRecipe('camp-reading', { gear: 'GEAR_DRIVE' })).calls.filter(c => c.id.includes('.set')).length, 0);
  assert.ok((await runRecipe('camp-reading')).calls.some(c => c.id === 'Light.setReadingLightSwitch'));
});
