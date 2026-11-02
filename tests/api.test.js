import test from 'node:test';
import assert from 'node:assert/strict';
import { RoutineRunner, validateWorkspace } from '../web/runtime.js';
import {capabilityHints} from '../web/capabilities.js';
import { apiNode, operations, operation, literal, validateArguments, propertyOf, configureApi, callApi, setSample, watchApi, receiveApiEvent, clearApiWatches } from '../web/api.js';
const block=(type,fields={},inputs={})=>({type,fields,inputs:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,{block:v}]))});
const flow=node=>({blocks:{blocks:[{type:'routine_start',next:{block:node}}]}});

test('all active catalogue inputs have typed defaults and all vehicle writes have preflight capabilities',()=>{
  assert.equal(operations.filter(o=>o.source==='vehicle').length,476);
  const actions=operations.filter(o=>o.source==='vehicle'&&o.kind==='write'&&!o.disabled);
  assert.equal(actions.length,55);
  for(const op of operations.filter(o=>!o.disabled)){
    assert.doesNotThrow(()=>validateArguments(op,op.params.map(p=>p.default)),op.id);
    if(actions.includes(op))assert.equal(operation(op.capability).kind,'capability',op.id);
    if(op.kind==='subscribe'&&op.source==='vehicle')assert.equal(operation(op.unsubscribe).kind,'unsubscribe');
  }
});
test('device capabilities expose real ranges and grouped areas instead of percentage assumptions',()=>{
 const window=operation('Window.setWindowPosition');
 const result={values:[{accessType:'READ_WRITE'},{ROW_1_LEFT:{minValue:0,maxValue:10}}]};
 const hint=capabilityHints(window,result,window.params.map(p=>p.kind==='area'?'ROW_1_LEFT':p.default));
 assert.deepEqual(hint.areas,['ROW_1_LEFT']);assert.equal(hint.range.max,10);
 const light=operation('Light.setAmbientLightBrightness'),group='ROW_1_LEFT|ROW_1_RIGHT|ROW_2_LEFT|ROW_2_CENTER|ROW_2_RIGHT';
 const args=light.params.map(p=>p.kind==='area'?group:p.default);assert.doesNotThrow(()=>validateArguments(light,args));
 assert.deepEqual(capabilityHints(light,{values:[{accessType:'READ_WRITE'},{[group]:{minValue:0,maxValue:100}}]},args).areas,[group]);
 const temp=operation('HVAC.setHvacTemperature'),tempArgs=temp.params.map(p=>p.kind==='area'?'ROW_1_LEFT':p.type.endsWith('TemperatureUnit')?'FAHRENHEIT':72);
 const tempCap={values:[{ROW_1_LEFT:{minValue:15,maxValue:30}},{minCelsius:15,maxCelsius:30,incrementCelsius:0.5,minFahrenheit:58,maxFahrenheit:88,incrementFahrenheit:1}]};
 assert.deepEqual(capabilityHints(temp,tempCap,tempArgs).range,{min:58,max:88,step:1});
});
test('structured API output feeds a later condition without conversion to text',async()=>{
  const first=apiNode('Location.lastKnown');first.fields.NAME='위치';
  const branch=block('flow_if',{}, {CONDITION:block('logic_compare',{OP:'GT'},{A:block('value_property',{PATH:'latitude'},{VALUE:block('variable_get',{NAME:'위치'})}),B:literal(30)}),THEN:block('action_notify',{}, {TEXT:literal('북쪽')})});first.next={block:branch};
  const effects=[];const runner=new RoutineRunner({invoke:async(id,args)=>{assert.equal(id,'Location.lastKnown');assert.deepEqual(args,[]);return{latitude:37.5,longitude:127}},notify:async text=>effects.push(text)},{stepDelay:0});
  const result=await runner.run(flow(first));assert.deepEqual(result.variables['위치'],{latitude:37.5,longitude:127});assert.deepEqual(effects,['북쪽']);
});
test('API action arguments may use values returned by a previous read',async()=>{
  const first=apiNode('HVAC.getHvacTemperatureCurrent');first.fields.NAME='측정';
  const set=apiNode('HVAC.setHvacTemperature');const op=operation(set.fields.API);const at=op.params.findIndex(p=>p.kind==='number');set.inputs[`ARG${at}`]={block:block('variable_get',{NAME:'측정'})};first.next={block:set};const calls=[];
  const runner=new RoutineRunner({invoke:async(id,args)=>{calls.push([id,args]);return 23}},{stepDelay:0});await runner.run(flow(first));assert.equal(calls[1][0],'HVAC.setHvacTemperature');assert.equal(calls[1][1][at],23);
});
test('unknown operations and retired writes cannot be imported',()=>{
  for(const API of ['Runtime.exec','Odometer.setRangeRemainingDistance'])assert.throws(()=>validateWorkspace(flow(block('api_call',{API}))),/사용할 수 없는/);
  assert.throws(()=>validateWorkspace(flow(block('api_read',{API:'Door.setDoorLock'}))),/사용할 수 없는/);
});
test('typed arguments reject invalid enums, fractional integer values and invalid coordinates',()=>{
  assert.throws(()=>validateArguments(operation('Door.setDoorLock'),['not-an-area',true]),/목록/);
  const fan=operation('HVAC.setHvacFanSpeed'),args=fan.params.map(p=>p.default);args[fan.params.findIndex(p=>p.kind==='number')]=1.5;assert.throws(()=>validateArguments(fan,args),/정수/);
  assert.throws(()=>validateArguments(operation('Location.proximity'),[91,127,200,'BOTH']),/범위/);
});
test('result paths support arrays, preserve null, and reject prototype traversal',()=>{
  assert.equal(propertyOf({a:[{value:false}]},'a[0].value'),false);assert.equal(propertyOf(null,''),null);
  for(const path of ['__proto__.x','constructor','missing'])assert.throws(()=>propertyOf({},path));
});
test('event routines require their matching root and receive the event payload',async()=>{
  const root=apiNode('Location.changed',true);root.id='location-event';root.next={block:block('variable_set',{NAME:'위도'},{VALUE:block('event_value',{PATH:'latitude'})})};
  const workspace={blocks:{blocks:[root]}};const runner=new RoutineRunner({}, {stepDelay:0});await assert.rejects(runner.run(workspace),/실행 버튼/);const result=await runner.run(workspace,{rootId:root.id,value:{latitude:37.5}});assert.equal(result.variables['위도'],37.5);
});
test('native failures are not replaced with simulated successes',async()=>{
  configureApi({vehicle:()=>true,call:async()=>{throw new Error('unsupported on device')},log:()=>{}});
  setSample('Door.getCurrentDoorPosition',['ROW_1_LEFT'],0);
  await assert.rejects(callApi('Door.getCurrentDoorPosition',['ROW_1_LEFT']),/unsupported on device/);
  configureApi({vehicle:()=>false});assert.equal(await callApi('Door.getCurrentDoorPosition',['ROW_1_LEFT']),0);
  await assert.rejects(callApi('Door.getCurrentDoorPosition',['ROW_1_RIGHT']),/테스트 응답이 없습니다/);
});
test('unsubscribing discards late listener events',async()=>{
  configureApi({vehicle:()=>false});const events=[];await watchApi('Door.registerDoorPosition',['ROW_1_LEFT'],'token',(value)=>events.push(value));receiveApiEvent('token',1,null);await clearApiWatches();receiveApiEvent('token',0,null);assert.deepEqual(events,[1]);
});
