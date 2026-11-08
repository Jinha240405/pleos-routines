import test from 'node:test';
import assert from 'node:assert/strict';
import { presentRoutine } from '../web/routine-presentation.js';
import { templates } from '../web/templates.js';

test('summaries describe the original temperature condition and both branches without changing data',()=>{
  const workspace=structuredClone(templates[0].workspace), before=JSON.stringify(workspace);
  const info=presentRoutine(workspace);
  assert.match(info.summary,/실내 온도 26°C 초과/);
  assert.match(info.summary,/공조 22°C 설정/);
  assert.equal(info.hasManual,true); assert.equal(info.hasEvents,false);
  assert.equal(JSON.stringify(workspace),before);
});
test('an empty graph asks for a start rather than claiming it is an active automation',()=>{
  const info=presentRoutine({blocks:{blocks:[]}});
  assert.equal(info.steps,0); assert.equal(info.hasEvents,false);assert.equal(info.hasManual,false);
  assert.match(info.summary,/시작 방식을 선택/);
});
test('disabled starts and branches do not contribute active actions or event status',()=>{
  const number = value => ({block:{type:'value_number',fields:{VALUE:value}}});
  const hiddenAction = {type:'vehicle_climate',inputs:{VALUE:number(30)}};
  const wait = {type:'flow_wait',inputs:{SECONDS:number(2)}};
  const disabledBranch = {type:'flow_if',disabled:true,inputs:{THEN:{block:hiddenAction}},next:{block:wait}};
  const workspace={blocks:{blocks:[
    {type:'routine_event',disabled:true,fields:{EVENT:'battery'},next:{block:{type:'action_notify'}}},
    {type:'routine_start',next:{block:disabledBranch}},
  ]}};
  const info=presentRoutine(workspace);
  assert.equal(info.hasEvents,false);assert.equal(info.hasManual,true);
  assert.ok(!info.summary.includes('30°C'));assert.ok(info.actions.includes('2초 대기'));
});
test('all official templates provide a nonempty overview and consistent starting modes',()=>{
  for(const template of templates){const info=presentRoutine(template.workspace);assert.ok(info.summary,template.id);assert.ok(info.steps>0,template.id);assert.ok(info.hasEvents||info.hasManual,template.id);}
});
