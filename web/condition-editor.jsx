import React,{useState,useSyncExternalStore,useRef,useEffect} from 'react';
import {Button} from './components/ui/button';
import {Icon} from './icons';
import {TouchChoice,TouchNumber,TouchText} from './touch-controls';
import {FeatureChooser,ApiFields} from './api-ui';
import {literal,operationMap,subscribeStatus,apiState,callApi} from './api';
import {commonStates,compareLabels,input,sourceInfo,sourceFields,sourceOperation,readExpression,resultReference,defaultComparison,simpleConditions,joinConditions,conditionSummary} from './condition-model';

function SourceButton({node,context,onClick}){
  const info=sourceInfo(node,context);
  return <button type="button" className="condition-source" aria-label={`확인할 상태: ${info.label}`} onClick={onClick}><span className="condition-icon"><Icon name={info.icon}/></span><span><small>{info.origin||'차량 상태'}</small><strong>{info.label}</strong></span><Icon name="next"/></button>;
}
export function SourcePicker({context,current,onPick,onClose}){
  const [mode,setMode]=useState('home'),[candidate,setCandidate]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useSyncExternalStore(subscribeStatus,()=>apiState.revision);
  const panel=useRef(null);useEffect(()=>{if(panel.current)panel.current.closest('dialog').scrollTop=0;},[mode]);
  function choose(n){const info=sourceInfo(n,context);setError('');if(info.kind==='object'||sourceFields(n,context).length||n.type==='api_read'&&operationMap.get(n.fields.API)?.params.length){setCandidate(n);setMode('configure');}else onPick(n);}
  async function loadFields(){setError('');setBusy(true);try{const op=sourceOperation(candidate,context),source=candidate.type==='result_get'?context.reads.find(n=>n.id===candidate.fields.SOURCE):candidate;
    const args=op.params.map((p,i)=>{const n=input(source,'ARG'+i);if(!n)return p.default;if(n.type==='value_number'||n.type==='value_text')return n.fields.VALUE;if(n.type==='value_boolean')return n.fields.VALUE==='TRUE';if(n.type==='value_json')return JSON.parse(n.fields.VALUE);throw Error('이 조회를 한 번 실행한 뒤 세부 항목을 선택해 주세요.');});
    await callApi(op.id,args);
  }catch(e){setError(e.message);}finally{setBusy(false);}}
  const fields=candidate?sourceFields(candidate,context):[],info=candidate?sourceInfo(candidate,context):null;
  const grouped=Object.groupBy(context.reads.filter(n=>['read','capability'].includes(operationMap.get(n.fields.API)?.kind)),n=>sourceInfo(resultReference(n),context).label);
  return <section ref={panel} className="condition-picker" aria-label="조건에 사용할 상태 선택"><div className="condition-picker-header"><Button type="button" variant="ghost" onClick={()=>mode==='home'?onClose():(setMode('home'),setCandidate(null),setError(''))}><Icon name="back"/>{mode==='home'?'조건으로':'상태 목록'}</Button><strong>{mode==='configure'?'상태 설정':'무엇을 확인할까요?'}</strong></div>
    {mode==='home'&&<>
      {Object.keys(grouped).length>0&&<><h3>앞에서 읽은 값</h3><p className="condition-hint">다시 조회하지 않고, 해당 단계의 결과를 사용해요.</p><div className="condition-result-list">{Object.entries(grouped).flatMap(([label,nodes])=>nodes.map((n,i)=><button type="button" key={n.id} onClick={()=>choose(resultReference(n))}><Icon name={operationMap.get(n.fields.API)?.domain}/><span><strong>{label}{nodes.length>1?` · ${i+1}번째`:''}</strong><small>{operationMap.get(n.fields.API)?.domainLabel}에서 읽은 결과</small></span><Icon name="next"/></button>))}</div></>}
      {context.event&&<><h3>이번에 감지한 값</h3><SourceButton node={{type:'event_value',fields:{PATH:''}}} context={context} onClick={()=>choose({type:'event_value',fields:{PATH:''}})}/></>}
      {context.variables.length>0&&<><h3>저장한 기준값</h3><div className="condition-result-list">{[...new Set(context.variables.map(n=>n.fields.NAME))].map(name=><button type="button" key={name} onClick={()=>choose({type:'variable_get',fields:{NAME:name}})}><Icon name="layers"/><strong>{name}</strong><Icon name="next"/></button>)}</div></>}
      <h3>자주 쓰는 상태</h3><div className="condition-state-grid">{commonStates.map(s=><button type="button" key={s.key} onClick={()=>onPick({type:'vehicle_signal',fields:{SIGNAL:s.key}})}><Icon name={s.icon}/><strong>{s.label}</strong><Icon name="next"/></button>)}</div>
      <Button type="button" variant="outline" className="other-condition-source" onClick={()=>setMode('api')}><Icon name="grid"/>다른 차량·연결 상태<Icon name="next"/></Button>
    </>}
    {mode==='api'&&<FeatureChooser kinds={['read','capability']} onPick={id=>choose(readExpression(id))}/>}
    {mode==='configure'&&candidate&&<>
      {candidate.type==='api_read'?<ApiFields node={candidate} onChange={setCandidate} selection={false} fixed/>:<div className="condition-selected"><Icon name={info.icon}/><strong>{info.label}</strong></div>}
      {fields.length>0&&<><h3>어떤 항목을 확인할까요?</h3><div className="condition-field-list">{fields.map(f=><button type="button" key={f.path} aria-pressed={candidate.fields.PATH===f.path} onClick={()=>onPick({...candidate,fields:{...candidate.fields,PATH:f.path}})}><Icon name={f.kind==='number'?'number':f.kind==='boolean'?'yes':'text'}/><span>{f.label}</span><Icon name="next"/></button>)}</div></>}
      {info.kind==='object'&&!fields.length&&<p className="condition-hint">응답을 한 번 읽으면 사용할 수 있는 항목이 보여요.</p>}
      {info.kind==='object'&&sourceOperation(candidate,context)?.kind!=='subscribe'&&<Button type="button" variant="outline" disabled={busy} onClick={loadFields}>{busy?'항목 확인 중…':'항목 불러오기'}</Button>}
      {info.kind!=='object'&&!fields.length&&<Button type="button" className="use-condition-source" onClick={()=>onPick(candidate)}>이 상태 사용</Button>}
      {error&&<p className="error-text" role="alert">{error}</p>}
    </>}
  </section>;
}
export function ConditionEditor({node,onChange,context,Expression}){
  const [advanced,setAdvanced]=useState(false),[selecting,setSelecting]=useState(null);
  useSyncExternalStore(subscribeStatus,()=>apiState.revision);
  const parsed=simpleConditions(node);
  const update=(index,row)=>onChange(joinConditions(parsed.rows.map((n,i)=>i===index?row:n),parsed.mode));
  if(advanced||!parsed)return <div className="condition-advanced"><p className="condition-hint">계산식이나 서로 다른 조건 묶음을 편집할 수 있어요.</p><Expression node={node} onChange={onChange} label="조건"/>{parsed&&<Button type="button" variant="ghost" onClick={()=>setAdvanced(false)}>간단한 조건으로 보기</Button>}</div>;
  if(selecting!==null)return <SourcePicker context={context} current={input(parsed.rows[selecting],'A')} onClose={()=>setSelecting(null)} onPick={source=>{update(selecting,defaultComparison(source,context));setSelecting(null);}}/>;
  return <section className="condition-editor" aria-label="간단한 조건 설정">
    <div className="condition-intro"><Icon name="branch"/><p>이럴 때 다음 동작을 실행해요</p></div>
    {parsed.rows.length>1&&<TouchChoice label="조건 연결" value={parsed.mode} options={[["AND","모두 맞으면"],["OR","하나라도 맞으면"]]} onChange={mode=>onChange(joinConditions(parsed.rows,mode))}/>}
    <div className="condition-rows">{parsed.rows.map((row,index)=>{
      const left=input(row,'A'),right=input(row,'B'),info=sourceInfo(left,context),setRight=v=>update(index,{...row,inputs:{...row.inputs,B:{block:literal(v)}}});
      const literalType={value_number:'number',value_text:'text',value_boolean:'boolean'}[right?.type];
      const kind=['number','boolean','enum','text'].includes(info.kind)?info.kind:literalType||'number';
      const ops=kind==='number'?['GT','GTE','LT','LTE','EQ','NEQ']:['EQ','NEQ'];
      return <div className="condition-row" key={index}>
        {parsed.rows.length>1&&<div className="condition-row-heading"><span>조건 {index+1}</span><Button type="button" variant="ghost" size="icon" aria-label={`조건 ${index+1} 삭제`} onClick={()=>onChange(joinConditions(parsed.rows.filter((_,i)=>i!==index),parsed.mode))}><Icon name="trash"/></Button></div>}
        <label className="condition-label">확인할 상태</label><SourceButton node={left} context={context} onClick={()=>setSelecting(index)}/>
        {info.missing&&<p role="alert" className="error-text">연결한 조회가 앞에 없어요. 상태를 다시 선택해 주세요.</p>}
        <div className="condition-comparison"><span className="condition-label">비교 방식</span><TouchChoice label={`조건 ${index+1} 비교 방식`} value={row.fields.OP} options={ops.map(op=>[op,compareLabels[op]])} onChange={op=>update(index,{...row,fields:{...row.fields,OP:op}})}/></div>
        <div className="condition-target"><span className="condition-label">기준값</span>
          {!literalType?<><p className="condition-hint">저장한 값이나 계산 결과와 비교하고 있어요.</p><Button type="button" variant="outline" onClick={()=>setAdvanced(true)}>비교 값 편집</Button></>:kind==='boolean'?<TouchChoice label="비교할 상태" value={right?.fields?.VALUE==='TRUE'} options={info.options||[[true,'켜짐 / 해당함'],[false,'꺼짐 / 해당 없음']]} onChange={setRight}/>:kind==='enum'?<TouchChoice label="비교할 상태" value={right?.fields?.VALUE} options={info.options} onChange={setRight}/>:kind==='text'?<TouchText label="비교할 값" value={right?.fields?.VALUE||''} presets={[]} onChange={setRight}/>:<TouchNumber label="비교할 값" value={right?.fields?.VALUE??0} unit={info.unit} step={info.unit==='°C'?0.5:1} onChange={setRight}/>}
          {info.kind==='unknown'&&<TouchChoice label="비교 값 형식" value={literalType||'number'} options={[["number","숫자"],["text","문자"],["boolean","상태"]]} onChange={kind=>setRight(kind==='number'?0:kind==='boolean'?true:'')}/>}
        </div>
        <p className="condition-preview"><Icon name="check"/><span>{conditionSummary(row,context)}</span></p>
      </div>;
    })}</div>
    <div className="condition-tools"><Button type="button" variant="outline" onClick={()=>onChange(joinConditions([...parsed.rows,defaultComparison({type:'vehicle_signal',fields:{SIGNAL:'battery'}},context)],parsed.mode))}><Icon name="plus"/>조건 추가</Button><Button type="button" variant="ghost" onClick={()=>setAdvanced(true)}>고급 편집</Button></div>
  </section>;
}
