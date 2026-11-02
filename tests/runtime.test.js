import test from 'node:test';
import assert from 'node:assert/strict';
import { RoutineRunner, validateWorkspace, parseRoutine, exportRoutine } from '../web/runtime.js';
import { templates } from '../web/templates.js';

const b = (type, fields = {}, inputs = {}, next) => ({ type, fields, inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, { block: v }])), ...(next ? { next: { block: next } } : {}) });
const num = v => b('value_number', { VALUE: v });
const txt = v => b('value_text', { VALUE: v });
const bool = v => b('value_boolean', { VALUE: v ? 'TRUE' : 'FALSE' });
const state = block => ({ blocks: { blocks: [b('routine_start', {}, {}, block)] } });
const notify = (value, next) => b('action_notify', {}, { TEXT: value }, next);
function setup(signals = {}, options = {}) {
  const effects = [];
  const runner = new RoutineRunner({ read: async key => signals[key], set: async (key, value) => effects.push([key, value]), say: async value => effects.push(['say', value]), notify: async value => effects.push(['notify', value]) }, { stepDelay: 0, ...options });
  return { runner, effects };
}
test('comfort example takes hot branch and changes only demo outputs', async () => {
  const { runner, effects } = setup({ temperature: 28 });
  await runner.run(templates[0].workspace);
  assert.deepEqual(effects.slice(0, 2), [['climate', 22], ['fan', 3]]);
  assert.equal(effects.length, 3);
});
test('comfort example cold branch does not change climate', async () => {
  const { runner, effects } = setup({ temperature: 22 });
  await runner.run(templates[0].workspace);
  assert.equal(effects.length, 1); assert.equal(effects[0][0], 'notify');
});
test('nested repetition and variables use prior block outputs', async () => {
  const { runner, effects } = setup();
  const get = b('variable_get', { NAME: 'count' });
  const add = b('variable_set', { NAME: 'count' }, { VALUE: b('value_math', { OP: 'ADD' }, { A: get, B: num(1) }) });
  const condition = b('logic_compare', { OP: 'GTE' }, { A: get, B: num(3) });
  const flow = b('variable_set', { NAME: 'count' }, { VALUE: num(0) }, b('flow_repeat', {}, { TIMES: num(3), DO: add }, b('flow_if', {}, { CONDITION: condition, THEN: notify(get), ELSE: notify(txt('wrong')) })));
  const result = await runner.run(state(flow));
  assert.equal(result.variables.count, 3); assert.deepEqual(effects, [['notify', '3']]);
});
test('logical operations short circuit unsupported reads', async () => {
  const { runner, effects } = setup();
  await runner.run(state(b('flow_if', {}, { CONDITION: b('logic_operation', { OP: 'AND' }, { A: bool(false), B: b('variable_get', { NAME: 'missing' }) }), ELSE: notify(txt('ok')) })));
  assert.deepEqual(effects, [['notify', 'ok']]);
});
test('undefined variables fail without manufacturing a default', async () => {
  await assert.rejects(setup().runner.run(state(notify(b('variable_get', { NAME: 'missing' })))), /먼저 값을/);
});
test('strict comparison rejects accidental string and number coercion', async () => {
  await assert.rejects(setup().runner.run(state(b('flow_if', {}, { CONDITION: b('logic_compare', { OP: 'GT' }, { A: txt('28'), B: num(26) }) }))), /숫자 블록/);
});
test('division by zero stops before emitting results', async () => {
  const { runner, effects } = setup();
  await assert.rejects(runner.run(state(notify(b('value_math', { OP: 'DIVIDE' }, { A: num(2), B: num(0) })))), /0으로 나눌/);
  assert.equal(effects.length, 0);
});
test('cancel interrupts a wait and prevents following side effects', async () => {
  const { runner, effects } = setup();
  const promise = runner.run(state(b('flow_wait', {}, { SECONDS: num(10) }, notify(txt('must not run')))));
  setTimeout(() => runner.cancel(), 30);
  await assert.rejects(promise, /중지했어요/); assert.equal(effects.length, 0); assert.equal(runner.running, false);
});
test('cancel interrupts an unresponsive adapter', async () => {
  const runner = new RoutineRunner({ read: () => new Promise(() => {}) }, { stepDelay: 0 });
  const promise = runner.run(state(notify(b('vehicle_signal', { SIGNAL: 'door' }))));
  setTimeout(() => runner.cancel(), 25);
  await assert.rejects(promise, /중지했어요/); assert.equal(runner.running, false);
});
test('only one concurrent execution is allowed', async () => {
  const { runner } = setup(); const promise = runner.run(state(b('flow_wait', {}, { SECONDS: num(.2) })));
  await assert.rejects(runner.run(state(notify(txt('second')))), /이미 실행/);
  runner.cancel(); await assert.rejects(promise, /중지했어요/);
});
test('while loop terminates on iteration budget', async () => {
  const { runner } = setup({}, { maxIterations: 4 });
  await assert.rejects(runner.run(state(b('flow_while', {}, { CONDITION: bool(true) }))), /100회를 초과/);
});
test('stop inside a loop terminates the entire routine', async () => {
  const { runner, effects } = setup();
  const result = await runner.run(state(b('flow_repeat', {}, { TIMES: num(3), DO: b('flow_stop') }, notify(txt('must not run')))));
  assert.equal(result.stopped, true); assert.equal(effects.length, 0);
});
test('manual execution does not invoke an event trigger', async () => {
  const { runner, effects } = setup({ door: true });
  await assert.rejects(runner.run(templates[3].workspace), /실행 버튼/);
  await runner.run(templates[3].workspace, 'door'); assert.equal(effects.length, 1);
});
test('import and export preserve versioned workspace without auto-execution fields', () => {
  const source = { ...templates[0], enabled: true, credential: 'not-exported' };
  const saved = exportRoutine(source); const restored = parseRoutine(saved);
  assert.deepEqual(restored.workspace, source.workspace); assert.equal(saved.includes('not-exported'), false); assert.equal(saved.includes('enabled'), false);
});
test('import rejects unknown blocks, script extensions and unsupported versions', () => {
  assert.throws(() => parseRoutine('{broken'), /JSON/);
  assert.throws(() => parseRoutine(JSON.stringify({ format: 'pleos-routines', version: 9 })), /v1/);
  assert.throws(() => validateWorkspace(state(b('eval'))), /지원하지 않는/);
  assert.throws(() => validateWorkspace(state({ ...notify(txt('ok')), extraState: { script: 'arbitrary()' } })), /허용하지 않는/);
});
test('oversized input and deeply nested workspace are rejected', () => {
  assert.throws(() => parseRoutine(' '.repeat(500001)), /500KB/);
  let chain = notify(txt('end'));
  for (let i = 0; i < 90; i++) chain = notify(txt('next'), chain);
  assert.throws(() => validateWorkspace(state(chain)), /연결 깊이/);
});
test('device errors preserve the failing block ID', async () => {
  const runner = new RoutineRunner({ read: async () => { throw new Error('permission denied'); } }, { stepDelay: 0 });
  const signal = { ...b('vehicle_signal', { SIGNAL: 'door' }), id: 'failed-door' };
  await assert.rejects(runner.run(state(notify(signal))), error => error.blockId === 'failed-door' && error.message === 'permission denied');
});
