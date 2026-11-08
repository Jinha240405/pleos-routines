import {literalArguments,operationMap} from './api.js';

const legacyEvents={door:'Door.registerDoorPosition',temperature:'HVAC.registerHvacTemperatureCurrent',battery:'EvBattery.registerEvBatteryStateOfCharge',speed:'AAOS.speedChanged'};
const enabledRoots=workspace=>(workspace?.blocks?.blocks||[]).filter(root=>!root.disabled&&root.enabled!==false);
const eventRoots=workspace=>enabledRoots(workspace).filter(root=>['routine_event','routine_api_event'].includes(root.type));

// Owns foreground subscriptions independently of the currently edited routine.
// Native background execution is deliberately outside this controller.
export class ForegroundAutomation {
  constructor({subscribe,unsubscribe,onTrigger,onState=()=>{},onError=()=>{},onStop=()=>{},now=()=>Date.now()}) {
    Object.assign(this,{subscribe,unsubscribe,onTrigger,onState,onError,onStop,now});
    this.routines=new Map(); this.sessions=new Map(); this.states=new Map();
    this.foreground=false; this.sequence=0; this.chain=Promise.resolve();
    this.epoch=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  state(id){return this.states.get(id)||'off';}
  setState(id,state){if(this.state(id)===state)return;this.states.set(id,state);this.onState(id,state);}
  sync(routines) {
    this.routines=new Map(routines.map(r=>[r.id,r]));
    for(const [id,session] of this.sessions){
      const routine=this.routines.get(id);
      if(!routine?.enabled||JSON.stringify(routine.workspace)!==session.fingerprint)this.stop(id);
    }
    for(const routine of routines){
      if(!routine.enabled){this.setState(routine.id,'off');continue;}
      if(!this.foreground){this.setState(routine.id,'paused');continue;}
      if(!eventRoots(routine.workspace).length){this.setState(routine.id,'ready');continue;}
      if(!this.sessions.has(routine.id))this.start(routine);
    }
    for(const id of this.states.keys())if(!this.routines.has(id))this.states.delete(id);
  }
  resume(){if(this.foreground)return;this.foreground=true;this.sync([...this.routines.values()]);}
  pause(){
    this.foreground=false;
    for(const id of [...this.sessions.keys()])this.stop(id,'paused');
    for(const r of this.routines.values())this.setState(r.id,r.enabled?'paused':'off');
  }
  stop(id,state='off'){
    const session=this.sessions.get(id);
    if(session){this.sessions.delete(id);this.onStop(id);for(const token of session.tokens)void this.clean(token);}
    this.setState(id,state);
  }
  async clean(token){try{await this.unsubscribe(token);}catch{/* Native pause also clears subscriptions; callbacks are already invalid. */}}
  valid(session){return this.foreground&&this.sessions.get(session.routine.id)===session&&this.routines.get(session.routine.id)?.enabled===true;}
  start(routine){
    const copy=structuredClone(routine);
    copy.workspace.blocks.blocks.forEach((root,index)=>{root.id||=`${routine.id}-root-${index}`;});
    const session={routine:copy,fingerprint:JSON.stringify(routine.workspace),tokens:new Set(),generation:++this.sequence};
    this.sessions.set(routine.id,session);this.setState(routine.id,'connecting');
    this.chain=this.chain.then(async()=>{
      if(!this.valid(session))return;
      try{
        let index=0;
        for(const root of eventRoots(copy.workspace)){
          if(!this.valid(session))return;
          const id=root.type==='routine_api_event'?root.fields.API:legacyEvents[root.fields?.EVENT];
          const op=operationMap.get(id);if(!op)throw new Error('감지할 차량 상태를 다시 선택해 주세요.');
          const args=root.type==='routine_api_event'?literalArguments(root):op.params.map(p=>structuredClone(p.default));
          const token=`routine-${this.epoch}-${session.generation}-${index++}`;
          session.tokens.add(token);
          let initialized=false,last,lastRun=-Infinity;
          const stateful=op.source!=='connect'||id==='Location.changed';
          await this.subscribe(id,args,token,(value,error)=>{
            if(!this.valid(session))return;
            if(error){this.fail(session,new Error(error));return;}
            const fingerprint=JSON.stringify(value);
            if(stateful&&!initialized){initialized=true;last=fingerprint;this.onState(copy.id,'baseline');return;}
            if(stateful&&fingerprint===last)return;
            last=fingerprint;
            const interrupt=id==='Gleo.command'&&args[0]==='STOP_ROUTINE';
            if(!interrupt&&this.now()-lastRun<1200)return;
            lastRun=this.now();
            const event=root.type==='routine_api_event'?{rootId:root.id,value}:root.fields.EVENT;
            try{void Promise.resolve(this.onTrigger({routine:copy,event,interrupt,isCurrent:()=>this.valid(session)})).catch(error=>this.fail(session,error));}
            catch(error){this.fail(session,error);}
          });
          if(!this.valid(session)){await this.clean(token);return;}
        }
        if(this.valid(session))this.setState(copy.id,'watching');
      }catch(error){this.fail(session,error);}
    });
  }
  fail(session,error){
    if(!this.valid(session))return;
    this.stop(session.routine.id,'error');
    this.onError(session.routine.id,error);
  }
  async settled(){await this.chain;await Promise.resolve();}
}
