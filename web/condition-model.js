import {operationMap, literal, apiNode, optionLabel, apiState} from './api.js';

export const input = (n, key) => n?.inputs?.[key]?.block ?? n?.inputs?.[key]?.shadow;
export const comparison = (left, op='GT', right=literal(26)) => ({type:'logic_compare',fields:{OP:op},inputs:{A:{block:left},B:{block:right}}});
export const commonStates = [
  {key:'temperature',label:'실내 온도',icon:'climate',kind:'number',unit:'°C'},
  {key:'battery',label:'배터리 잔량',icon:'EvBattery',kind:'number',unit:'%'},
  {key:'door',label:'운전석 도어',icon:'Door',kind:'boolean',options:[[true,'열림'],[false,'닫힘']]},
  {key:'speed',label:'주행 속도',icon:'DrivingMode',kind:'number',unit:'km/h'},
];
export const compareLabels={GT:'초과',GTE:'이상',LT:'미만',LTE:'이하',EQ:'같음',NEQ:'다름'};
const fieldNames={latitude:'위도',longitude:'경도',altitude:'고도',accuracy:'위치 정확도',speed:'속도',bearing:'방향',timestamp:'시각',text:'인식한 말',event:'이벤트',action:'요청',data:'응답 내용',status:'상태',value:'값',values:'받은 값',name:'이름',address:'주소',distance:'거리',duration:'소요 시간',remainingDistance:'남은 거리',remainingTime:'남은 시간',supported:'지원 여부',isSupported:'지원 여부',result:'결과',accessType:'읽기·설정 지원',minValue:'최솟값',maxValue:'최댓값'};
export const fieldLabel = path => path.split('.').map(p=>fieldNames[p]||optionLabel(p)).join(' · ');
const clone = n => JSON.parse(JSON.stringify(n));

// Only values that precede this block in the same execution path are selectable.
export function contextBefore(workspace, targetId) {
  let found;
  function sequence(node, context) {
    const scope={...context,reads:[...context.reads],variables:[...context.variables]};
    for(let n=node;n;n=n.next?.block){
      if(n.id===targetId){found=scope;return;}
      if(n.disabled||n.enabled===false)continue;
      for(const key of ['THEN','ELSE','DO']){sequence(input(n,key),scope);if(found)return;}
      if(n.type==='api_call')scope.reads.push(n);
      if(n.type==='variable_set')scope.variables.push(n);
    }
  }
  for(const root of workspace.blocks.blocks){sequence(root,{reads:[],variables:[],event:root.type==='routine_api_event'?root:null});if(found)break;}
  return found||{reads:[],variables:[],event:null};
}
export function resultReference(node,path='') {return {type:'result_get',fields:{SOURCE:node.id,PATH:path}};}
export function readExpression(id) {const n=apiNode(id);return {...n,type:'api_read',fields:{API:id,PATH:''}};}
export function sourceOperation(node, context) {
  if(node?.type==='api_read')return operationMap.get(node.fields.API);
  if(node?.type==='result_get')return operationMap.get(context.reads.find(n=>n.id===node.fields.SOURCE)?.fields.API);
  if(node?.type==='event_value')return operationMap.get(context.event?.fields.API);
  if(node?.type==='value_property')return sourceOperation(input(node,'VALUE'),context);
  if(node?.type==='variable_get')return operationMap.get([...context.reads].reverse().find(n=>n.fields.NAME===node.fields.NAME)?.fields.API);
}
export function sourceFields(node,context){
  const op=sourceOperation(node,context),fields=[];
  const add=(path,kind)=>{if(!fields.some(f=>f.path===path))fields.push({path,label:fieldLabel(path),kind});};
  if(op&&['Location.lastKnown','Location.changed'].includes(op.id))for(const p of ['latitude','longitude','accuracy','altitude','speed','bearing','timestamp'])add(p,'number');
  function walk(value,prefix='',depth=0){if(!value||typeof value!=='object'||depth>6)return;for(const [key,v] of Object.entries(value).slice(0,80)){if(['__proto__','constructor','prototype'].includes(key))continue;const path=prefix?prefix+'.'+key:key;if(v&&typeof v==='object')walk(v,path,depth+1);else if(v!==null)add(path,typeof v==='string'?'text':typeof v);}}
  if(op)walk(apiState.status.get(op.id)?.value);
  const path=node?.fields?.PATH;
  if(path&&!fields.some(f=>f.path===path))add(path,'unknown');
  return fields;
}
export function sourceInfo(node,context){
  if(node?.type==='vehicle_signal')return commonStates.find(s=>s.key===node.fields.SIGNAL)||{label:'차량 상태',kind:'unknown',icon:'CarInfo'};
  if(node?.type==='value_boolean')return {label:node.fields.VALUE==='TRUE'?'항상 해당함':'항상 해당 없음',kind:'boolean',icon:'yes'};
  if(node?.type==='value_property'){
    const info=sourceInfo(input(node,'VALUE'),context),field=sourceFields(node,context).find(f=>f.path===node.fields.PATH);
    return {...info,label:info.label+(node.fields.PATH?' · '+fieldLabel(node.fields.PATH):''),kind:field?.kind||info.kind};
  }
  const op=sourceOperation(node,context),path=node?.fields?.PATH;
  const source=node?.type==='result_get'?context.reads.find(n=>n.id===node.fields.SOURCE):node?.type==='api_read'?node:null;
  let schema=op?.result||{};
  if(op?.id==='Location.supported')schema={kind:'boolean'};
  if(op?.id==='STT.listen')schema={kind:'text'};
  if(!op?.result&&op?.domain==='Navi')schema={kind:'object'};
  if(op&&['Location.lastKnown','Location.changed'].includes(op.id))schema={kind:'object'};
  const fields=sourceFields(node,context),field=fields.find(f=>f.path===path);
  const observed=op?apiState.status.get(op.id)?.value:undefined;
  let kind=path?(field?.kind||'unknown'):schema.kind||(observed!==undefined&&observed!==null?(typeof observed==='string'?'text':typeof observed):'unknown');
  if(kind==='unknown'&&fields.length)kind='object';
  const area=source?.inputs?.ARG0?.block?.fields?.VALUE;
  const areaLabel=typeof area==='string'&&/ROW_|WINDSHIELD|ROOF|HOOD|REAR/.test(area)?optionLabel(area):'';
  let label=op?.label||(node?.type==='variable_get'?node.fields.NAME:node?.type==='event_value'?'이번에 감지한 값':'연결된 결과');
  if(node?.type==='variable_get'&&!op){const variable=[...context.variables].reverse().find(n=>n.fields.NAME===node.fields.NAME);const v=input(variable,'VALUE');kind=v?.type==='value_number'?'number':v?.type==='value_boolean'?'boolean':v?.type==='value_text'?'text':'unknown';}
  const booleanOptions=kind==='boolean'?/Occupancy/.test(op?.method)?[[true,'탑승'],[false,'비어 있음']]:/BeltBuckled/.test(op?.method)?[[true,'착용'],[false,'미착용']]:/Open/.test(op?.method)?[[true,'열림'],[false,'닫힘']]:undefined:undefined;
  return {label:label+(areaLabel?' · '+areaLabel:'')+(path?' · '+fieldLabel(path):''),icon:op?.domain||'result',kind,options:booleanOptions||schema.options?.map(v=>[v,optionLabel(v)]),unit:op?.domain==='EvBattery'&&/StateOfCharge/.test(op.method)?'%':/Temperature/.test(op?.method||'')?'°C':'',origin:node?.type==='result_get'?'앞에서 읽은 값':node?.type==='event_value'?'이번에 감지한 값':node?.type==='api_read'?'조건에서 바로 확인':'저장된 값',missing:node?.type==='result_get'&&!source};
}
export function defaultComparison(source,context){
  const info=sourceInfo(source,context);
  return comparison(source,info.kind==='number'?'GT':'EQ',literal(info.kind==='boolean'?true:info.kind==='enum'?info.options[0][0]:info.kind==='text'?'':0));
}
export function simpleConditions(node){
  const mode=node?.type==='logic_operation'?node.fields.OP:'AND',rows=[];
  function visit(n){
    if(n?.type==='logic_operation'){if(n.fields.OP!==mode)return false;return visit(input(n,'A'))&&visit(input(n,'B'));}
    if(n?.type==='logic_compare'){rows.push(n);return true;}
    if(n?.type==='logic_not'){const inner=input(n,'VALUE');if(['vehicle_signal','event_value','result_get','api_read','variable_get','value_boolean'].includes(inner?.type)){rows.push(comparison(inner,'EQ',literal(false)));return true;}return false;}
    if(['vehicle_signal','event_value','result_get','api_read','variable_get','value_boolean'].includes(n?.type)){rows.push(comparison(n,'EQ',literal(true)));return true;}
    return false;
  }
  return visit(node)?{mode,rows}:null;
}
export function joinConditions(rows,mode='AND') {return rows.slice(1).reduce((a,b)=>({type:'logic_operation',fields:{OP:mode},inputs:{A:{block:a},B:{block:b}}}),rows[0]);}
export function conditionSummary(row,context){
  const a=input(row,'A'),b=input(row,'B'),info=sourceInfo(a,context),value=b?.fields?.VALUE;
  let label=b?.type==='value_boolean'?(info.options?.find(([v])=>v===(value==='TRUE'))?.[1]||(value==='TRUE'?'켜짐':'꺼짐')):b?.type==='value_text'?optionLabel(value):b?.type==='value_number'?`${value}${info.unit||''}`:sourceInfo(b,context).label;
  return `${info.label} ${label} ${row.fields.OP==='EQ'?'일 때':row.fields.OP==='NEQ'?'아닐 때':compareLabels[row.fields.OP]+'일 때'}`;
}
export function duplicateWithReferences(node,uid){
  const result=clone(node);delete result.next;const ids=new Map();
  function visit(n,fn){if(!n)return;fn(n);for(const v of Object.values(n.inputs||{})){visit(v.block,fn);visit(v.shadow,fn);}visit(n.next?.block,fn);}
  visit(result,n=>{const next=uid();if(n.id)ids.set(n.id,next);n.id=next;});
  visit(result,n=>{if(n.type==='result_get'&&ids.has(n.fields.SOURCE))n.fields.SOURCE=ids.get(n.fields.SOURCE);});
  return result;
}
