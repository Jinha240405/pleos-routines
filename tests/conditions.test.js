import test from 'node:test';
import assert from 'node:assert/strict';
import {RoutineRunner,validateWorkspace,parseRoutine,exportRoutine} from '../web/runtime.js';
import {apiNode,literal,operation,validateArguments} from '../web/api.js';
import {contextBefore,resultReference,comparison,joinConditions,simpleConditions,duplicateWithReferences,sourceInfo,sourceFields} from '../web/condition-model.js';
import {templates} from '../web/templates.js';
const b=(type,fields={},inputs={},id)=>({type,fields,id,inputs:Object.fromEntries(Object.entries(inputs).map(([k,n])=>[k,{block:n}]))});
const state=n=>({blocks:{blocks:[{type:'routine_start',id:'root',next:{block:n}}]}});
const chain=(...nodes)=>{nodes.slice(0,-1).forEach((n,i)=>n.next={block:nodes[i+1]});return nodes[0]};
const notify=text=>b('action_notify',{}, {TEXT:literal(text)});
const runner=invoke=>new RoutineRunner({invoke,notify:async()=>{}},{stepDelay:0});
test('two unnamed reads retain separate results, including properties after a legacy name collision',async()=>{
 const first={...apiNode('Location.lastKnown'),id:'first',fields:{API:'Location.lastKnown',NAME:'조회 결과',PATH:''}},second={...apiNode('Location.lastKnown'),id:'second',fields:{...first.fields}};
 const selected=b('variable_set',{NAME:'첫 위도'},{VALUE:resultReference(first,'latitude')});
 const flow=state(chain(first,second,selected));let count=0;
 const r=runner(async()=>({latitude:++count===1?37:38}));const result=await r.run(flow);
 assert.equal(result.variables['첫 위도'],37);assert.deepEqual(result.variables['조회 결과'],{latitude:38});
 assert.doesNotThrow(()=>parseRoutine(exportRoutine({name:'결과 연결',workspace:flow})));
});
test('result references do not reuse results from a previous run or a skipped branch',async()=>{
 const read={...apiNode('Location.lastKnown'),id:'read'},use=b('variable_set',{NAME:'x'},{VALUE:resultReference(read,'latitude')});
 const r=runner(async()=>({latitude:37}));await r.run(state(chain(read,use)));
 await assert.rejects(r.run(state(use)),/앞에서 실행/);
 const conditional=b('flow_if',{}, {CONDITION:literal(false),THEN:read});
 await assert.rejects(r.run(state(chain(conditional,use))),/앞에서 실행/);
});
test('result choices only contain earlier reads on this execution path',()=>{
 const first={...apiNode('Location.lastKnown'),id:'before'},later={...apiNode('Location.lastKnown'),id:'after'},inner={...apiNode('Location.lastKnown'),id:'branch-read'};
 const target=b('flow_if',{}, {CONDITION:literal(true)},'target'),branch=b('flow_if',{}, {CONDITION:literal(true),THEN:inner,ELSE:target},'branch');
 const flow=state(chain(first,branch,later));flow.blocks.blocks.push({type:'routine_api_event',id:'other',fields:{API:'Location.changed'},next:{block:{...apiNode('Location.lastKnown'),id:'unrelated'}}});
 assert.deepEqual(contextBefore(flow,'target').reads.map(n=>n.id),['before']);
 assert.deepEqual(contextBefore(flow,'after').reads.map(n=>n.id),['before']);
 assert.equal(contextBefore(flow,'target').event,null);
});
test('duplicated groups reconnect their own reads but keep external result references',()=>{
 const read={...apiNode('Location.lastKnown'),id:'internal'},group=b('flow_repeat',{}, {TIMES:literal(1),DO:chain(read,b('variable_set',{NAME:'x'},{VALUE:resultReference(read,'latitude')},'use'))},'group');
 let id=0;const copy=duplicateWithReferences(group,()=>`copy-${++id}`);
 assert.equal(copy.inputs.DO.block.next.block.inputs.VALUE.block.fields.SOURCE,copy.inputs.DO.block.id);
 assert.notEqual(copy.inputs.DO.block.id,'internal');assert.equal(group.inputs.DO.block.id,'internal');
});
test('compound condition editing round-trips and preserves mixed logic in advanced mode',()=>{
 const a=comparison(b('vehicle_signal',{SIGNAL:'temperature'}),'GT',literal(26)),c=comparison(b('vehicle_signal',{SIGNAL:'battery'}),'LT',literal(30));
 for(const mode of ['AND','OR'])assert.deepEqual(simpleConditions(joinConditions([a,c],mode)),{mode,rows:[a,c]});
 assert.equal(simpleConditions(joinConditions([a,joinConditions([a,c],'OR')],'AND')),null);
});
test('known structured results and result references expose typed, labelled fields',()=>{
 const read={...apiNode('Location.lastKnown'),id:'location'},context={reads:[read],variables:[],event:null};
 assert.equal(sourceInfo(resultReference(read,'accuracy'),context).kind,'number');
 assert.equal(sourceInfo(resultReference(read,'accuracy'),context).label,'현재 위치 · 위치 정확도');
 assert.ok(sourceFields(resultReference(read),context).some(f=>f.path==='latitude'));
});
test('all twelve templates validate and execute with representative demo inputs',async()=>{
 assert.equal(templates.length,12);
 for(const template of templates){
   validateWorkspace(template.workspace);const effects=[];
   const r=new RoutineRunner({read:async key=>({temperature:28,battery:85,door:true,speed:0})[key],set:async(...args)=>effects.push(args),notify:async value=>effects.push(value),say:async value=>effects.push(value),invoke:async(id,args)=>{const op=operation(id);validateArguments(op,args);if(op.kind==='write')return {simulated:true};const sample=template.samples?.find(s=>s.id===id&&JSON.stringify(s.args)===JSON.stringify(args));assert.ok(sample,`${template.id}: missing sample ${id}`);return sample.value;}},{stepDelay:0});
   const root=template.workspace.blocks.blocks[0];await r.run(template.workspace,root.type==='routine_event'?root.fields.EVENT:'manual');
   assert.ok(effects.length,template.id);
 }
});
test('seatbelt template requires both occupied seat and unbuckled belt',async()=>{
 const template=templates.find(t=>t.id==='belt');
 for(const [occupied,buckled,warning] of [[true,false,true],[false,false,false],[true,true,false]]){
   const effects=[];const r=new RoutineRunner({invoke:async id=>id.includes('Occupancy')?occupied:buckled,notify:async text=>effects.push(text)},{stepDelay:0});await r.run(template.workspace);assert.equal(effects[0].includes('확인해 주세요'),warning);
 }
});
