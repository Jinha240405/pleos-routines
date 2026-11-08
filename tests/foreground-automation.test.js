import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ForegroundAutomation} from '../web/foreground-automation.js';
import {apiNode,literal} from '../web/api.js';
import {exportRoutine,parseRoutine} from '../web/runtime.js';

function routine(id,enabled=true,operation='Door.registerDoorPosition') {
  const root=apiNode(operation,true);root.id=id+'-event';
  root.next={block:{type:'action_notify',inputs:{TEXT:{block:literal(id)}}}};
  return {id,name:id,enabled,workspace:{blocks:{blocks:[root]}}};
}
function harness(overrides={}) {
  const subscriptions=[],unsubscribed=[],triggers=[],errors=[];
  let now=0;
  const controller=new ForegroundAutomation({
    subscribe:async(id,args,token,callback)=>{subscriptions.push({id,args,token,callback});},
    unsubscribe:async token=>{unsubscribed.push(token);},
    onTrigger:trigger=>triggers.push(trigger),onError:(id,error)=>errors.push({id,error}),now:()=>now,
    ...overrides,
  });
  return {controller,subscriptions,unsubscribed,triggers,errors,tick:()=>now+=1500};
}

test('OFF routines never subscribe; each enabled routine owns its own subscriptions',async()=>{
  const h=harness(),a=routine('a'),b=routine('b'),off=routine('off',false);
  h.controller.sync([a,b,off]);assert.equal(h.subscriptions.length,0);
  h.controller.resume();await h.controller.settled();
  assert.equal(h.subscriptions.length,2);
  assert.equal(h.controller.state('off'),'off');
  a.enabled=false;h.controller.sync([a,b,off]);
  assert.deepEqual(h.unsubscribed,[h.subscriptions[0].token]);
  h.subscriptions[0].callback(0);h.subscriptions[0].callback(1);
  h.subscriptions[1].callback(0);h.subscriptions[1].callback(1);
  assert.deepEqual(h.triggers.map(t=>t.routine.id),['b']);
});

test('state streams establish a baseline, deduplicate and throttle changes',async()=>{
  const h=harness();h.controller.sync([routine('a')]);h.controller.resume();await h.controller.settled();
  const send=h.subscriptions[0].callback;
  send(0);send(0);assert.equal(h.triggers.length,0);
  send(1);send(2);assert.equal(h.triggers.length,1);
  h.tick();send(3);assert.equal(h.triggers.length,2);
  assert.equal(h.triggers[1].event.rootId,'a-event');
});

test('pause preserves ON preferences, invalidates callbacks and re-baselines on resume',async()=>{
  const h=harness(),a=routine('a');h.controller.sync([a]);h.controller.resume();await h.controller.settled();
  const first=h.subscriptions[0];first.callback(0);
  h.controller.pause();assert.equal(a.enabled,true);assert.equal(h.controller.state('a'),'paused');
  first.callback(1);assert.equal(h.triggers.length,0);
  h.controller.resume();h.controller.resume();await h.controller.settled();
  assert.equal(h.subscriptions.length,2);assert.notEqual(first.token,h.subscriptions[1].token);
  h.subscriptions[1].callback(1);assert.equal(h.triggers.length,0);
  h.subscriptions[1].callback(0);assert.equal(h.triggers.length,1);
});

test('OFF during in-flight registration cleans up a late native registration',async()=>{
  let finish;const h=harness({subscribe:async(...args)=>{h.subscriptions.push({token:args[2],callback:args[3]});await new Promise(resolve=>finish=resolve);}});
  const a=routine('a');h.controller.sync([a]);h.controller.resume();await Promise.resolve();
  a.enabled=false;h.controller.sync([a]);h.subscriptions[0].callback(0);h.subscriptions[0].callback(1);
  finish();await h.controller.settled();
  assert.equal(h.triggers.length,0);assert.equal(h.unsubscribed.length,2);assert.equal(h.controller.state('a'),'off');
});

test('editing or deleting a routine invalidates old trigger snapshots',async()=>{
  const h=harness(),a=routine('a');h.controller.sync([a]);h.controller.resume();await h.controller.settled();
  h.subscriptions[0].callback(0);h.subscriptions[0].callback(1);
  const old=h.triggers[0];assert.equal(old.isCurrent(),true);
  a.workspace.blocks.blocks[0].next.block.inputs.TEXT.block=literal('changed');h.controller.sync([a]);await h.controller.settled();
  assert.equal(old.isCurrent(),false);
  h.controller.sync([]);assert.equal(h.controller.sessions.size,0);
});

test('a failing subscription releases its tokens and does not block other routines',async()=>{
  const h=harness({subscribe:async(id,args,token,callback)=>{h.subscriptions.push({id,token,callback});if(id==='Door.registerDoorPosition')throw new Error('unsupported');}});
  h.controller.sync([routine('a'),routine('b',true,'EvBattery.registerEvBatteryStateOfCharge')]);h.controller.resume();await h.controller.settled();
  assert.equal(h.errors.length,1);assert.equal(h.controller.state('a'),'error');assert.equal(h.controller.state('b'),'watching');
  assert.deepEqual(h.unsubscribed,[h.subscriptions[0].token]);
});

test('Gleo commands do not need a baseline and STOP bypasses throttling',async()=>{
  const h=harness(),a=routine('gleo',true,'Gleo.command');a.workspace.blocks.blocks[0].inputs.ARG0={block:literal('STOP_ROUTINE')};
  h.controller.sync([a]);h.controller.resume();await h.controller.settled();
  h.subscriptions[0].callback({command:'STOP_ROUTINE'});h.subscriptions[0].callback({command:'STOP_ROUTINE'});
  assert.equal(h.triggers.length,2);assert.equal(h.triggers[0].interrupt,true);
});

test('manual ON routines are ready without any automatic execution or subscription',async()=>{
  const h=harness(),a=routine('manual');a.workspace.blocks.blocks[0].type='routine_start';
  h.controller.sync([a]);h.controller.resume();await h.controller.settled();
  assert.equal(h.controller.state('manual'),'ready');assert.equal(h.subscriptions.length,0);assert.equal(h.triggers.length,0);
});

test('export and import never carry local ON settings',()=>{
  const a=routine('a'),text=exportRoutine(a);assert.equal(JSON.parse(text).enabled,undefined);
  const imported=parseRoutine(JSON.stringify({...JSON.parse(text),enabled:true}));assert.equal(imported.enabled,undefined);
});
