import React, { useState, useSyncExternalStore, useRef, useEffect, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { validateWorkspace } from './runtime';
import { Button } from './components/ui/button';
import { apiNode, operationMap, literalArguments, literal, optionLabel, validateArguments } from './api.js';
import { ApiFields, ApiPickerOptions } from './api-ui.jsx';
import {Icon,operationIcon} from './icons';
import {TouchChoice,TouchNumber,TouchText,FieldPicker,ResultValues,IconCards,IconSelect} from './touch-controls';
import {ConditionEditor,SourcePicker} from './condition-editor';
import {contextBefore,sourceInfo,duplicateWithReferences,conditionSummary,simpleConditions} from './condition-model';
const ValuesContext=createContext({names:['조회 결과','기준값'],eventId:null,sources:{}});

const copy = value => JSON.parse(JSON.stringify(value));
const uid = () => crypto.randomUUID();
export const inputOf = (node, key) => node.inputs?.[key]?.block ?? node.inputs?.[key]?.shadow;
const childKeys = ['THEN', 'ELSE', 'DO'];
const number = n => ({ type: 'value_number', fields: { VALUE: n } });
const text = s => ({ type: 'value_text', fields: { VALUE: s } });
const signalNames = { temperature: '실내 온도', battery: '배터리 잔량', door: '운전석 도어 열림', speed: '주행 속도' };
const startOptions=[
 {value:'routine_start',label:'버튼을 눌러 시작',icon:'play',description:'내가 실행할 때 동작해요'},
 {value:'event',label:'상태가 바뀌면 시작',icon:'radar',description:'이 화면을 열고 감지를 시작해요'},
];
const eventStartOptions=[
 {value:'routine_event',label:'도어·온도·배터리',icon:'CarInfo',description:'자주 사용하는 차량 상태'},
 {value:'routine_api_event',label:'다른 차량·위치·음성',icon:'activity',description:'전체 연결 기능에서 선택'},
];
function StartChoices({type,onChange}) {
 const lastEvent=useRef(type==='routine_api_event'?'routine_api_event':'routine_event');
 if(type&&type!=='routine_start')lastEvent.current=type;
 const value=type?(type==='routine_start'?'routine_start':'event'):undefined;
 return <><IconCards className="start-choices" label="시작 방식" value={value} options={startOptions} onChange={v=>onChange(v==='routine_start'?v:lastEvent.current)}/>{value==='event'&&<section className="event-source-choices"><h3 className="choice-heading">어떤 상태를 감지할까요?</h3><IconCards compact label="감지할 기능" value={type} options={eventStartOptions} onChange={onChange}/></section>}</>;
}
const signalOptions=[{value:'door',label:'도어',icon:'Door',description:'운전석 문'},{value:'temperature',label:'실내 온도',icon:'climate',description:'현재 온도'},{value:'battery',label:'배터리',icon:'EvBattery',description:'충전 잔량'},{value:'speed',label:'주행 속도',icon:'DrivingMode',description:'현재 속도'}];
const valueIcons={result_get:'result',value_number:'number',value_text:'text',value_boolean:'yes',vehicle_signal:'CarInfo',api_read:'link',variable_get:'layers',value_property:'result',event_value:'radar',value_json:'json',logic_compare:'branch',logic_operation:'layers',logic_not:'no',value_math:'calculator',value_join:'link'};
const operators = { EQ: '=', NEQ: '≠', GT: '>', LT: '<', GTE: '≥', LTE: '≤', AND: '그리고', OR: '또는', ADD: '+', MINUS: '−', MULTIPLY: '×', DIVIDE: '÷', MOD: '나머지' };
const definitions = {
  result_get:['앞에서 읽은 값','result','값'],
  api_call: ['차량·연결 기능', 'activity', '연결'], api_read:['연결된 값','activity','값'], routine_api_event:['상태 변화 감지','activity','시작'],value_property:['결과 항목 읽기','variable','값'],value_json:['구조화된 값','variable','값'],event_value:['이벤트 값','activity','값'],
  routine_start: ['직접 실행', 'play', '시작'], routine_event: ['상태가 바뀌면', 'activity', '시작'],
  flow_if: ['조건에 따라 나누기', 'branch', '조건'], flow_repeat: ['횟수만큼 반복', 'repeat', '흐름'], flow_while: ['조건 동안 반복', 'repeat', '흐름'], flow_wait: ['잠시 대기', 'clock', '흐름'], flow_stop: ['루틴 종료', 'stop', '흐름'],
  vehicle_climate: ['공조 온도 설정', 'climate', '차량'], vehicle_fan: ['풍량 설정', 'fan', '차량'],
  action_notify: ['알림 표시', 'bell', '알림'], action_speak: ['음성 안내', 'volume', '알림'], variable_set: ['변수 저장', 'variable', '데이터'],
  vehicle_signal: ['차량 상태', 'activity', '값'], value_number: ['숫자', 'variable', '값'], value_text: ['텍스트', 'variable', '값'], value_boolean: ['참 / 거짓', 'branch', '값'], value_math: ['계산', 'variable', '값'], value_join: ['텍스트 연결', 'variable', '값'], logic_compare: ['값 비교', 'branch', '값'], logic_operation: ['조건 조합', 'branch', '값'], logic_not: ['반대 조건', 'branch', '값'], variable_get: ['변수 읽기', 'variable', '값'],
};
function walk(state, fn) {
  const visit = n => { if (!n) return; fn(n); Object.values(n.inputs || {}).forEach(v => { visit(v.block); visit(v.shadow); }); visit(n.next?.block); };
  state.blocks.blocks.forEach(visit);
}
function hydrate(state) { const next = copy(state); walk(next, n => { n.id ||= uid(); }); return next; }
function locate(state, id) { let result; walk(state, n => { if (n.id === id) result = n; }); return result; }
function chain(node) { const nodes = []; while (node) { nodes.push(node); node = node.next?.block; } return nodes; }
function getList(state, location) { const p = locate(state, location.parent); return chain(location.key === 'next' ? p?.next?.block : inputOf(p || {}, location.key)); }
function putList(state, location, nodes) {
  const parent = locate(state, location.parent);
  nodes.forEach((n, i) => { delete n.next; if (nodes[i + 1]) n.next = { block: nodes[i + 1] }; });
  if (location.key === 'next') { delete parent.next; if (nodes.length) parent.next = { block: nodes[0] }; }
  else { parent.inputs ||= {}; delete parent.inputs[location.key]; if (nodes.length) parent.inputs[location.key] = { block: nodes[0] }; }
}
function freshNode(type) {
  if(type==='api_call')return apiNode('Door.getCurrentDoorPosition');
  if(type==='routine_api_event')return apiNode('Door.registerDoorPosition',true);
  if(type==='api_read')return {...apiNode('Door.getCurrentDoorPosition'),type:'api_read'};
  const node = { type, fields: {}, inputs: {} };
  const set = (key, value) => { node.inputs[key] = { block: value }; };
  if (type === 'routine_event') node.fields.EVENT = 'door';
  if (type === 'vehicle_signal') node.fields.SIGNAL = 'temperature';
  if (type === 'value_number') node.fields.VALUE = 0;
  if (type === 'value_text') node.fields.VALUE = '';
  if(type==='value_json')node.fields.VALUE='{}';
  if(['event_value','value_property'].includes(type))node.fields.PATH='';
  if(type==='value_property')set('VALUE',{type:'variable_get',fields:{NAME:'조회 결과'}});
  if (type === 'value_boolean') node.fields.VALUE = 'TRUE';
  if (type.startsWith('variable_')) node.fields.NAME = '기준값';
  if (type === 'vehicle_climate') set('VALUE', number(22));
  if (type === 'vehicle_fan') set('VALUE', number(3));
  if (type === 'variable_set') set('VALUE', number(26));
  if (type.startsWith('action_')) set('TEXT', text('출발 준비 완료'));
  if (type === 'flow_wait') set('SECONDS', number(1));
  if (type === 'flow_repeat') set('TIMES', number(2));
  if (['flow_if', 'flow_while'].includes(type)) set('CONDITION', { type: 'logic_compare', fields: { OP: 'GT' }, inputs: { A: { block: { type: 'vehicle_signal', fields: { SIGNAL: 'temperature' } } }, B: { block: number(26) } } });
  if (['logic_compare', 'logic_operation', 'value_math', 'value_join'].includes(type)) {
    node.fields.OP = { logic_compare: 'GT', logic_operation: 'AND', value_math: 'ADD' }[type] || '';
    set('A', type === 'logic_operation' ? freshNode('value_boolean') : type === 'value_join' ? text('현재 ') : number(0));
    set('B', type === 'logic_operation' ? freshNode('value_boolean') : type === 'value_join' ? text('상태') : number(26));
  }
  if (type === 'logic_not') set('VALUE', freshNode('value_boolean'));
  return hydrate({ blocks: { blocks: [node] } }).blocks.blocks[0];
}
export function describe(node) {
  if (!node) return '설정 필요';
  const f = node.fields || {}, v = key => describe(inputOf(node, key));
  switch (node.type) {
    case 'api_call': return ['read','capability'].includes(operationMap.get(f.API)?.kind)?'이 값을 다음 조건·동작에서 바로 사용해요':operationMap.get(f.API)?.label||'기능 선택';
    case 'result_get': return '앞에서 읽은 값';
    case 'api_read': return operationMap.get(f.API)?.label||'연결된 값';
    case 'routine_api_event': return `${operationMap.get(f.API)?.label||'차량 상태'} 변경 시`;
    case 'event_value': return f.PATH?`이벤트 · ${f.PATH}`:'이벤트 값';
    case 'value_property': return `${v('VALUE')}${f.PATH?` · ${f.PATH}`:''}`;
    case 'value_json': return String(f.VALUE||'{}');
    case 'routine_start': return '실행 버튼을 누르면';
    case 'routine_event': return `${signalNames[f.EVENT] || '차량 상태'} 변경 시`;
    case 'value_number': case 'value_text': return String(f.VALUE ?? '');
    case 'value_boolean': return f.VALUE === 'TRUE' ? '참' : '거짓';
    case 'vehicle_signal': return signalNames[f.SIGNAL] || '차량 상태';
    case 'variable_get': return f.NAME || '변수';
    case 'logic_compare': {
      const left = inputOf(node, 'A'), right = inputOf(node, 'B');
      const unit = left?.type === 'vehicle_signal' && right?.type === 'value_number' ? ({temperature:'°C',battery:'%',speed:' km/h'}[left.fields?.SIGNAL] || '') : '';
      return `${v('A')} ${operators[f.OP] || '?'} ${v('B')}${unit}`;
    }
    case 'logic_operation': case 'value_math': return `${v('A')} ${operators[f.OP] || '?'} ${v('B')}`;
    case 'value_join': return `${v('A')} + ${v('B')}`;
    case 'logic_not': return `${v('VALUE')}의 반대`;
    case 'flow_if': return v('CONDITION');
    case 'flow_while': return `${v('CONDITION')} 동안`;
    case 'flow_repeat': return `${v('TIMES')}회 반복`;
    case 'flow_wait': return `${v('SECONDS')}초`;
    case 'flow_stop': return '여기서 실행 마침';
    case 'vehicle_climate': return `${v('VALUE')}°C`;
    case 'vehicle_fan': return `${v('VALUE')}단계`;
    case 'action_notify': case 'action_speak': return v('TEXT');
    case 'variable_set': return `${f.NAME} = ${v('VALUE')}`;
    default: return definitions[node.type]?.[0] || node.type;
  }
}
export function countSteps(state) {
  let count = 0;
  walk(state, n => { if (!n.type.startsWith('routine_') && !expressionTypes.includes(n.type)) count++; });
  return count;
}
export function createFlowEditor(element, onChange, onError) {
  let state = { blocks: { languageVersion: 0, blocks: [] } }, previous = [], following = [], version = 0, locked = false, highlight = '', warning = null;
  const listeners = new Set();
  const emit = () => { version++; listeners.forEach(fn => fn()); };
  const change = mutate => {
    if (locked) return;
    try { const next = copy(state); mutate(next); validateWorkspace(next); previous.push(state); if (previous.length > 60) previous.shift(); following = []; state = hydrate(next); warning = null; emit(); onChange(); }
    catch (error) { onError(error.message); }
  };
  const api = {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, getVersion: () => version,
    get state() { return state; }, get locked() { return locked; }, get highlightId() { return highlight; }, get warning() { return warning; },
    get canUndo() { return previous.length > 0; }, get canRedo() { return following.length > 0; },
    snapshot: () => copy(state),
    load(value) { validateWorkspace(value); state = hydrate(value); previous = []; following = []; warning = null; highlight = ''; emit(); },
    lock(value) { locked = value; emit(); },
    highlight(id) { highlight = id || ''; emit(); },
    warn(id, message) { warning = id ? { id, message } : null; emit(); },
    undo(redo = false) { if (locked) return; const from = redo ? following : previous, to = redo ? previous : following; if (!from.length) return; to.push(state); state = from.pop(); warning = null; emit(); onChange(); },
    edit(node) { change(s => { const target = locate(s, node.id); Object.assign(target, copy(node)); }); },
    add(location, type) { change(s => { const nodes = getList(s, location); nodes.splice(location.index ?? nodes.length, 0, typeof type==='string'?freshNode(type):copy(type)); putList(s, location, nodes); }); },
    addRoot(type) { change(s => s.blocks.blocks.push(typeof type==='string'?freshNode(type):copy(type))); },
    removeRoot(id) { change(s => { s.blocks.blocks = s.blocks.blocks.filter(n => n.id !== id); }); },
    remove(location, id) { change(s => putList(s, location, getList(s, location).filter(n => n.id !== id))); },
    duplicate(location, id) { change(s => { const nodes = getList(s, location), index = nodes.findIndex(n => n.id === id); const node = duplicateWithReferences(nodes[index],uid); nodes.splice(index + 1, 0, node); putList(s, location, nodes); }); },
    move(source, destination, index) {
      change(s => {
        const from = getList(s, source), at = from.findIndex(n => n.id === source.id); if (at < 0) return;
        const node = from[at], own = copy(node); delete own.next;
        if (locate({ blocks: { blocks: [own] } }, destination.parent)) throw new Error('동작을 자기 내부로 옮길 수 없어요.');
        const same = source.parent === destination.parent && source.key === destination.key;
        from.splice(at, 1); putList(s, source, from); delete node.next;
        const to = same ? from : getList(s, destination);
        to.splice(Math.max(0, same && at < index ? index - 1 : index), 0, node); putList(s, destination, to);
      });
    },
  };
  createRoot(element).render(<FlowEditor api={api} />);
  return api;
}

function Modal({ title, children, onClose, className = '' }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; el.showModal(); return () => { el.close(); }; }, []);
  return <dialog ref={ref} className={`flow-dialog ${className}`} onCancel={onClose} onClick={e => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}><div className="dialog-header"><h2>{title}</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기"><Icon name="close" /></Button></div>{children}</dialog>;
}
const expressionTypes = ['value_number', 'value_text', 'value_boolean', 'vehicle_signal', 'api_read', 'result_get', 'variable_get', 'value_property', 'event_value', 'value_json', 'logic_compare', 'logic_operation', 'logic_not', 'value_math', 'value_join'];
function Expression({ node, onChange, label, depth = 0 }) {
 const n=node||freshNode('value_number'),f=n.fields||{},context=useContext(ValuesContext);
 const [choosingResult,setChoosingResult]=useState(false);
 const field=(key,value)=>onChange({...n,fields:{...f,[key]:value}}),sub=(key,value)=>onChange({...n,inputs:{...n.inputs,[key]:{block:value}}});
 const comparison=n.type==='logic_compare',left=inputOf(n,'A'),schema=left?.type==='api_read'?operationMap.get(left.fields?.API)?.result:null;
 const compareNames={GT:'보다 높으면',GTE:'이상이면',LT:'보다 낮으면',LTE:'이하이면',EQ:'같으면',NEQ:'다르면'};
 const variableOptions=[...new Set([...context.names,f.NAME].filter(Boolean))].map(v=>[v,v]);
 const types=expressionTypes.filter(t=>t!=='value_json'||n.type==='value_json').map(t=>({value:t,label:definitions[t][0],icon:valueIcons[t]||definitions[t][1]}));
 return <fieldset className="expression"><legend>{label}</legend><div className="expression-value"><IconSelect label={label+' 종류'} value={n.type} options={types} onChange={type=>onChange(freshNode(type))}/>
 {n.type==='value_number'&&<TouchNumber label={label} value={f.VALUE??0} onChange={v=>field('VALUE',v)}/>}
 {n.type==='value_text'&&<TouchText label={label} value={f.VALUE||''} onChange={v=>field('VALUE',v)}/>}
 {n.type==='variable_get'&&<TouchChoice label={label} value={f.NAME} options={variableOptions} onChange={v=>field('NAME',v)}/>}
 {n.type==='vehicle_signal'&&<IconCards compact className="signal-choices" label={label+' 차량 상태'} value={f.SIGNAL} options={signalOptions} onChange={v=>field('SIGNAL',v)}/>}
 {n.type==='value_boolean'&&<IconCards compact label={label} value={f.VALUE} options={[{value:'TRUE',label:'해당함',icon:'yes'},{value:'FALSE',label:'해당 없음',icon:'no'}]} onChange={v=>field('VALUE',v)}/>}
 {n.type==='result_get'&&(choosingResult?<SourcePicker context={context} onClose={()=>setChoosingResult(false)} onPick={v=>{onChange(v);setChoosingResult(false)}}/>:<Button type="button" variant="outline" onClick={()=>setChoosingResult(true)}><Icon name="result"/>{sourceInfo(n,context).label} · 변경</Button>)}
 </div>
 {n.type==='api_read'&&<ApiFields node={n} onChange={onChange} kinds={['read','capability']} Expression={Expression}/>}
 {n.type==='value_json'&&<ResultValues value={JSON.parse(f.VALUE||'null')}/>}
 {['value_property','event_value','api_read'].includes(n.type)&&<FieldPicker label={label+'에서 사용할 항목'} value={f.PATH} operationId={n.type==='event_value'?context.eventId:n.type==='value_property'?context.sources[inputOf(n,'VALUE')?.fields?.NAME]:f.API} onChange={v=>field('PATH',v)}/>}
 {n.type==='value_property'&&<Expression label="읽어 둔 값" node={inputOf(n,'VALUE')} onChange={v=>sub('VALUE',v)} depth={depth+1}/>}
 {depth<80&&['logic_compare','logic_operation','value_math','value_join'].includes(n.type)&&<div className="expression-pair touch-expression-pair"><Expression label={comparison?'확인할 상태':'첫 번째 값'} node={left} onChange={v=>sub('A',v)} depth={depth+1}/>
 {n.type!=='value_join'&&<TouchChoice label={label+' 연산'} value={f.OP} options={(comparison?['GT','GTE','LT','LTE','EQ','NEQ']:n.type==='logic_operation'?['AND','OR']:['ADD','MINUS','MULTIPLY','DIVIDE','MOD']).map(v=>[v,comparison?compareNames[v]:operators[v]])} onChange={v=>field('OP',v)}/>}
 {schema?.kind==='enum'?<TouchChoice label="비교할 상태" value={inputOf(n,'B')?.fields?.VALUE} options={schema.options.map(v=>[v,optionLabel(v)])} onChange={v=>sub('B',literal(v))}/>:schema?.kind==='boolean'?<TouchChoice label="비교할 상태" value={inputOf(n,'B')?.fields?.VALUE==='TRUE'} options={[[true,'해당함'],[false,'해당 없음']]} onChange={v=>sub('B',literal(v))}/>:<Expression label={comparison?'비교할 값':'두 번째 값'} node={inputOf(n,'B')} onChange={v=>sub('B',v)} depth={depth+1}/>}
 </div>}
 {depth<80&&n.type==='logic_not'&&<Expression label="조건 값" node={inputOf(n,'VALUE')} onChange={v=>sub('VALUE',v)} depth={depth+1}/>}
 </fieldset>;
}
function SimpleValue({node,onChange,label}) {
 const context=useContext(ValuesContext),[choosing,setChoosing]=useState(node?.type==='result_get'&&!node.fields?.SOURCE),[advanced,setAdvanced]=useState(false);
 const n=node||number(0),fixed=['value_number','value_text','value_boolean'].includes(n.type);
 if(choosing)return <SourcePicker context={context} onClose={()=>setChoosing(false)} onPick={v=>{onChange(v);setChoosing(false)}}/>;
 if(advanced)return <><Expression label={label} node={n} onChange={onChange}/><Button type="button" variant="ghost" onClick={()=>setAdvanced(false)}>간단히 보기</Button></>;
 return <section className="simple-value"><div className="simple-value-heading"><span className="control-label">{label}</span><button type="button" className="text-button" onClick={()=>fixed?setChoosing(true):onChange(/내용/.test(label)?text('출발 준비 완료'):number(0))}>{fixed?'읽은 값 사용':'직접 입력'}</button></div>
  {n.type==='value_number'?<TouchNumber label={label} value={n.fields.VALUE} onChange={v=>onChange({...n,fields:{VALUE:v}})} {...(/온도/.test(label)?{min:16,max:30,step:0.5,unit:'°C'}:/풍량/.test(label)?{min:0,max:8,unit:'단계'}:/대기/.test(label)?{min:0,max:30,unit:'초'}:/횟수/.test(label)?{min:0,max:100,unit:'회'}:{})}/>:n.type==='value_text'?<TouchText label={label} value={n.fields.VALUE} onChange={v=>onChange(text(v))}/>:n.type==='value_boolean'?<TouchChoice label={label} value={n.fields.VALUE==='TRUE'} options={[[true,'해당함'],[false,'해당 없음']]} onChange={v=>onChange(literal(v))}/>:<Button type="button" variant="outline" className="simple-source-value" onClick={()=>setChoosing(true)}><Icon name={sourceInfo(n,context).icon}/>{sourceInfo(n,context).label}<Icon name="next"/></Button>}
  <button type="button" className="text-button value-advanced-link" onClick={()=>setAdvanced(true)}>계산·고급 값</button>
 </section>;
}
function EditModal({ node, onClose, onSave, context }) {
  const [draft, setDraft] = useState(() => copy(node));
  const [error, setError] = useState('');
  const startDrafts=useRef(new Map([[node.type,copy(node)]]));
  function changeStart(type){startDrafts.current.set(draft.type,copy(draft));const n=startDrafts.current.get(type)||freshNode(type);setDraft({...draft,type,fields:copy(n.fields),inputs:copy(n.inputs||{})});}
  const params = { flow_if: [['CONDITION', '조건']], flow_while: [['CONDITION', '반복 조건']], flow_repeat: [['TIMES', '반복 횟수']], flow_wait: [['SECONDS', '대기 시간 (초)']], vehicle_climate: [['VALUE', '설정 온도 (°C)']], vehicle_fan: [['VALUE', '풍량 (단계)']], action_notify: [['TEXT', '알림 내용']], action_speak: [['TEXT', '안내 내용']], variable_set: [['VALUE', '저장할 값']] };
  function save(e) {
    e.preventDefault();
    try {
      walk({ blocks: { blocks: [draft] } }, n => { if (n.type === 'value_number' && (n.fields?.VALUE === '' || !Number.isFinite(Number(n.fields?.VALUE)))) throw new Error('숫자 값을 입력해 주세요.'); });
      if(draft.type==='routine_api_event')literalArguments(draft);
      walk({blocks:{blocks:[draft]}},n=>{if(!['api_call','api_read'].includes(n.type))return;const op=operationMap.get(n.fields.API),values=op.params.map((p,i)=>inputOf(n,'ARG'+i));if(values.every(v=>['value_number','value_text','value_boolean','value_json'].includes(v?.type)))validateArguments(op,values.map(v=>v.type==='value_boolean'?v.fields.VALUE==='TRUE':v.type==='value_json'?JSON.parse(v.fields.VALUE):v.fields.VALUE));});
      onSave(draft); onClose();
    } catch (e) { setError(e.message); }
  }
  return <Modal title={node.type.startsWith('routine_')?'시작 설정':operationMap.get(node.fields?.API)?.label||definitions[node.type]?.[0] || '동작 설정'} onClose={onClose}><form onSubmit={save}>
    {node.type.startsWith('routine_')&&<section className="start-method-section"><h3 className="choice-heading">언제 시작할까요?</h3><StartChoices type={draft.type} onChange={changeStart}/></section>}
    {draft.type === 'routine_start' && <p className="form-note">상단의 실행 버튼을 누르면 이 흐름이 시작됩니다.</p>}
    {node.type === 'flow_stop' && <p className="form-note">이 단계에 도착하면 루틴 실행을 종료합니다.</p>}
    {draft.type==='routine_event'&&<section className="watched-state-section"><h3 className="choice-heading">감지할 상태</h3><IconCards compact className="signal-choices" label="감지할 상태" value={draft.fields.EVENT} options={signalOptions.filter(o=>o.value!=='speed')} onChange={v=>setDraft({...draft,fields:{EVENT:v}})}/><p className="form-note">루틴을 ON으로 켜면 차량 앱을 사용하는 동안 상태 변화를 감지해요.</p></section>}
    {node.type === 'variable_set' && <label className="form-field">변수 이름<input required maxLength={80} value={draft.fields.NAME} onChange={e => setDraft({ ...draft, fields: { ...draft.fields, NAME: e.target.value } })} /></label>}
    {['api_call','routine_api_event'].includes(draft.type)&&<ApiFields node={draft} onChange={setDraft} kinds={draft.type==='routine_api_event'?['subscribe']:['read','write','capability']} Expression={SimpleValue} fixed={draft.type==='routine_api_event'}/>}
    {draft.type==='routine_api_event'&&<p className="form-note">루틴을 ON으로 켜면 차량 앱을 사용하는 동안 감지합니다. 이벤트 값은 조건과 동작에 연결할 수 있어요.</p>}
    {draft.type==='api_call'&&<><p className="result-ready-note"><Icon name="result"/>결과는 다음 조건·동작에서 바로 선택할 수 있어요.</p><details className="save-result-options"><summary>고급 · 변수로도 저장</summary><TouchChoice label="결과 저장" value={draft.fields.NAME||''} options={[...new Set(['',draft.fields.NAME,'조회 결과',operationMap.get(draft.fields.API)?.label+' 결과'])].filter(v=>v!==undefined).map(v=>[v,v||'변수로 저장 안 함'])} onChange={v=>setDraft({...draft,fields:{...draft.fields,NAME:v}})}/>{draft.fields.NAME&&<FieldPicker label="저장할 항목" operationId={draft.fields.API} value={draft.fields.PATH} onChange={v=>setDraft({...draft,fields:{...draft.fields,PATH:v}})}/>}</details></>}
    {(params[node.type] || []).map(([key, label]) => key==='CONDITION'?<ConditionEditor key={key} node={inputOf(draft,key)} onChange={n=>setDraft({...draft,inputs:{...draft.inputs,[key]:{block:n}}})} context={context} Expression={Expression}/>:<SimpleValue key={key} label={label} node={inputOf(draft, key)} onChange={n => setDraft({ ...draft, inputs: { ...draft.inputs, [key]: { block: n } } })} />)}
    {expressionTypes.includes(node.type) && <Expression label="값" node={draft} onChange={n => setDraft({ ...n, id: draft.id, ...(draft.next ? { next: draft.next } : {}) })} />}
    {node.type.startsWith('vehicle_') && node.type !== 'vehicle_signal' && <p className="form-note">Pleos 연결에서는 운전석 공조를 제어합니다. 기기에서 지원하는 범위 안에서 실행됩니다.</p>}
    {error && <p role="alert" className="error-text">{error}</p>}
    <div className="dialog-actions"><Button type="button" variant="outline" onClick={onClose}>취소</Button><Button type="submit">적용</Button></div>
  </form></Modal>;
}
function Picker({ location, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const [section,setSection]=useState('basic');
  const [rootStep,setRootStep]=useState(null);
  if(location==='root')return <Modal title="시작 방식 추가" onClose={onClose}><StartChoices type={rootStep} onChange={type=>type==='routine_start'?onPick(type):setRootStep(type)}/>{rootStep==='routine_event'?<><h3 className="choice-heading">감지할 상태</h3><IconCards compact className="signal-choices" label="감지할 상태" options={signalOptions.filter(o=>o.value!=='speed')} onChange={v=>onPick({...freshNode('routine_event'),fields:{EVENT:v}})}/></>:rootStep==='routine_api_event'?<ApiPickerOptions query="" root onPick={onPick}/>:null}</Modal>;
  const types = location === 'root' ? ['routine_start', 'routine_event'] : ['vehicle_climate', 'vehicle_fan', 'action_notify', 'action_speak', 'flow_if', 'flow_wait', 'flow_repeat', 'flow_while', 'variable_set', 'flow_stop'];
  const matches = types.filter(t => (definitions[t].join(' ') + describe(freshNode(t))).includes(query.trim()));
  return <Modal title={location === 'root' ? '시작 방식 추가' : '동작 추가'} onClose={onClose}><div className="api-picker-tabs" role="group" aria-label="동작 분류"><button className={section==='basic'?'selected':''} onClick={()=>setSection('basic')}><Icon name="grid"/>기본 동작</button><button className={section==='api'?'selected':''} onClick={()=>setSection('api')}><Icon name="CarInfo"/>차량·연결 기능</button></div><input className="action-search" placeholder="동작 찾기" aria-label="동작 찾기" value={query} onChange={e => setQuery(e.target.value)} />{section==='api'?<ApiPickerOptions query={query} root={location==='root'} onPick={onPick}/>:<div className="action-options">{matches.map(type => <button key={type} onClick={() => onPick(type)} className="action-option"><span className="node-icon"><Icon name={definitions[type][1]} /></span><span><strong>{definitions[type][0]}</strong><small>{definitions[type][2]}</small></span><Icon name="plus" /></button>)}{!matches.length && <p className="form-note">일치하는 동작이 없습니다. 차량·연결 기능에서도 찾아보세요.</p>}</div>}</Modal>;
}
function FlowEditor({ api }) {
  useSyncExternalStore(api.subscribe, api.getVersion);
  const [editing, setEditing] = useState(null), [adding, setAdding] = useState(null), [menu, setMenu] = useState(null), [drop, setDrop] = useState(null);
  const drag = useRef(null);
  useEffect(() => {
    if (!menu) return;
    const anchor = [...document.querySelectorAll('[data-node-id]')].find(el => el.dataset.nodeId === menu);
    anchor?.querySelector('.node-menu button:not(:disabled)')?.focus();
    const dismiss = event => { if (!event.target.closest('.node-menu-anchor')) setMenu(null); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [menu]);
  const locked = api.locked;
  const edit = node => { if (!locked) { setMenu(null); setEditing(node); } };
  function acceptDrop(e, location, index) { if (locked || !drag.current) return; e.preventDefault(); e.stopPropagation(); api.move(drag.current, location, index); drag.current = null; setDrop(null); }
  function nodeContains(node, id) { const isolated = { ...node }; delete isolated.next; return !!locate({ blocks: { blocks: [isolated] } }, id); }
  function renderCard({ node, location, index, total, root = false }) {
    const [baseTitle, symbol, category] = definitions[node.type] || ['동작', 'variable', ''];
    const title=node.type==='api_call'?operationMap.get(node.fields?.API)?.label||baseTitle:node.type==='routine_api_event'?(operationMap.get(node.fields?.API)?.label||'상태 변화')+' 감지':node.type==='routine_event'?(signalOptions.find(o=>o.value===node.fields.EVENT)?.label||'차량 상태')+' 감지':baseTitle;
    const conditions=['flow_if','flow_while'].includes(node.type)?simpleConditions(inputOf(node,'CONDITION')):null;
    const description=conditions?conditions.rows.map(row=>conditionSummary(row,contextBefore(api.state,node.id))).join(conditions.mode==='AND'?' · 그리고 ':' · 또는 '):describe(node);
    const current = node.id === api.highlightId || (!childKeys.some(k => inputOf(node, k)) && nodeContains(node, api.highlightId));
    const fault = api.warning && nodeContains(node, api.warning.id);
    const trigger = node.type.startsWith('routine_');
    const disabled = node.enabled === false || node.disabled === true;
    return <article className={`flow-card ${disabled ? 'is-disabled' : ''} ${trigger ? 'trigger-card' : ''} ${['vehicle_climate','vehicle_fan','flow_wait'].includes(node.type) ? 'numeric-card' : ''} ${current ? 'is-active' : ''} ${fault ? 'has-error' : ''} ${drop === node.id ? 'drop-before' : ''}`} data-node-id={node.id} data-type={node.type} onDragOver={e => { if (!root && drag.current && !locked) { e.preventDefault(); e.stopPropagation(); setDrop(node.id); } }} onDrop={e => !root && acceptDrop(e, location, index)}>
      {!root && <button className="drag-handle" draggable={!locked} disabled={locked} aria-label={`${title} 끌어서 이동`} onDragStart={e => { drag.current = { ...location, id: node.id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', node.id); setMenu(null); }} onDragEnd={() => { drag.current = null; setDrop(null); }}><Icon name="drag" /></button>}
      <button className="card-main" disabled={locked} onClick={() => edit(node)} aria-label={`${title} 설정: ${description}`}><span className={`node-icon ${trigger ? 'trigger-icon' : ''}`}><Icon name={node.fields?.API?operationIcon(operationMap.get(node.fields.API)):node.type==='routine_event'?signalOptions.find(o=>o.value===node.fields.EVENT)?.icon:symbol} /></span><span className="node-copy"><span className="node-title">{title}{disabled && <span className="node-tag">사용 안 함</span>}{trigger && <span className="node-tag">시작</span>}</span><span className={`node-description ${['vehicle_climate', 'vehicle_fan', 'flow_wait'].includes(node.type) ? 'numeric-value' : ''}`}>{description}</span></span></button>
      <div className="node-menu-anchor"><button className="node-menu-button" disabled={locked} aria-label={`${title} 메뉴`} aria-expanded={menu === node.id} onClick={() => setMenu(menu === node.id ? null : node.id)}><Icon name="more" /></button>{menu === node.id && <div className="node-menu" role="menu" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setMenu(null); e.currentTarget.parentElement.querySelector('.node-menu-button').focus(); } else if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) { e.preventDefault(); const items=[...e.currentTarget.querySelectorAll('button:not(:disabled)')]; const index=items.indexOf(document.activeElement); items[e.key === 'Home' ? 0 : e.key === 'End' ? items.length-1 : (index+(e.key === 'ArrowDown' ? 1 : -1)+items.length)%items.length]?.focus(); } }}><button role="menuitem" onClick={() => edit(node)}>설정 변경</button>{!root && <><button role="menuitem" disabled={index === 0} onClick={() => { api.move({ ...location, id: node.id }, location, index - 1); setMenu(null); }}>위로 이동</button><button role="menuitem" disabled={index === total - 1} onClick={() => { api.move({ ...location, id: node.id }, location, index + 2); setMenu(null); }}>아래로 이동</button><button role="menuitem" onClick={() => { api.duplicate(location, node.id); setMenu(null); }}>복제</button></>}{root && <button role="menuitem" onClick={() => {setAdding("root");setMenu(null);}}>시작 방식 추가</button>}<button role="menuitem" onClick={() => {api.edit({...node,enabled:disabled,disabled:!disabled});setMenu(null);}}>{disabled ? "사용" : "사용 안 함"}</button><button role="menuitem" className="danger" onClick={() => { root ? api.removeRoot(node.id) : api.remove(location, node.id); setMenu(null); }}>삭제</button></div>}</div>
      {fault && <p className="node-error">{api.warning.message}</p>}
    </article>;
  }
  function renderList({ parent, branch, label }) {
    const location = { parent: parent.id, key: branch }, nodes = getList(api.state, location);
    return <div className="flow-list">{label && <div className="branch-label"><span />{label}</div>}{nodes.map((node, index) => <React.Fragment key={node.id}><div className="flow-step">{renderCard({node, location, index, total:nodes.length})}{node.type === 'flow_if' && <div className="branch-grid">{renderList({parent:node, branch:"THEN", label:"조건 충족"})}{renderList({parent:node, branch:"ELSE", label:"미충족"})}</div>}{['flow_repeat', 'flow_while'].includes(node.type) && <div className="loop-group">{renderList({parent:node, branch:"DO", label:"반복할 동작"})}</div>}</div></React.Fragment>)}<div className={`add-step-row ${drop === `${parent.id}-${branch}` ? 'drop-target' : ''}`} onDragOver={e => { if (drag.current && !locked) { e.preventDefault(); e.stopPropagation(); setDrop(`${parent.id}-${branch}`); } }} onDrop={e => acceptDrop(e, location, nodes.length)}><button className="add-step" disabled={locked} onClick={() => { setMenu(null); setAdding(location); }}><Icon name="plus" />{nodes.at(-1)?.type === "flow_if" ? "분기 이후 추가" : "동작 추가"}</button></div></div>;
  }
  const names=['조회 결과','기준값'],sources={};let eventId=null;walk(api.state,n=>{if(n.fields?.NAME)names.push(n.fields.NAME);if(n.type==='api_call'&&n.fields.NAME)sources[n.fields.NAME]=n.fields.API;if(n.type==='routine_api_event')eventId=n.fields.API});
  return <ValuesContext.Provider value={{names:[...new Set(names)],eventId,sources}}><div className="flow-canvas" onKeyDown={e => { if (e.key === 'Escape') setMenu(null); }}>{api.state.blocks.blocks.map(root => <section key={root.id} className="flow-root" aria-label="자동화 흐름"><div className="root-card-wrap">{renderCard({node:root, root:true})}</div>{root.type === 'flow_if' && <div className="branch-grid">{renderList({parent:root, branch:"THEN", label:"조건 충족"})}{renderList({parent:root, branch:"ELSE", label:"미충족"})}</div>}{['flow_repeat', 'flow_while'].includes(root.type) && renderList({parent:root, branch:"DO", label:"반복할 동작"})}{renderList({parent:root, branch:"next"})}</section>)}{!api.state.blocks.blocks.length && <button className="add-trigger" disabled={locked} onClick={() => setAdding('root')}><Icon name="plus" />{api.state.blocks.blocks.length ? '다른 시작 방식 추가' : '시작 방식 선택'}</button>}</div>
    {editing && <ValuesContext.Provider value={{...contextBefore(api.state,editing.id),names:[...new Set(names)],sources,eventId:contextBefore(api.state,editing.id).event?.fields.API}}><EditModal key={editing.id} node={editing} context={contextBefore(api.state,editing.id)} onClose={() => setEditing(null)} onSave={node => api.edit(node)} /></ValuesContext.Provider>}
    {adding && <Picker location={adding} onClose={() => setAdding(null)} onPick={type => { adding === 'root' ? api.addRoot(type) : api.add(adding, type); setAdding(null); }} />}
  </ValuesContext.Provider>;}
