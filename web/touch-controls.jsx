import React, {useState,useRef,useId} from 'react';
import {Button} from './components/ui/button';
import {Icon} from './icons';
import {optionLabel,apiState,operationMap} from './api.js';

export function IconCards({value,options,onChange,label,compact=false,className=''}){
  const selected=options.findIndex(o=>o.value===value);
  function navigate(event,index){
    const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];
    if(!direction&&!['Home','End'].includes(event.key))return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+direction+options.length)%options.length;
    const buttons=event.currentTarget.parentElement.querySelectorAll('[role="radio"]');buttons[next].focus();onChange(options[next].value);
  }
  return <div className={`icon-choices ${compact?'compact':''} ${className}`} role="radiogroup" aria-label={label}>{options.map((o,i)=><button key={o.value} type="button" role="radio" aria-label={o.label} aria-checked={value===o.value} tabIndex={i===(selected<0?0:selected)?0:-1} onKeyDown={e=>navigate(e,i)} onClick={()=>onChange(o.value)}><span className="choice-symbol"><Icon name={o.icon}/></span><span className="choice-copy"><strong>{o.label}</strong>{o.description&&<small>{o.description}</small>}</span><span className="choice-check"><Icon name="check"/></span></button>)}</div>
}
export function IconSelect({value,options,onChange,label}){
  const [open,setOpen]=useState(false),id=useId(),trigger=useRef(null),current=options.find(o=>o.value===value)||options[0];
  return <div className="icon-select"><button ref={trigger} type="button" className="icon-select-trigger" aria-label={label} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}><span className="choice-symbol"><Icon name={current.icon}/></span><strong>{current.label}</strong><span className="icon-select-action">변경<Icon name={open?'up':'down'}/></span></button>{open&&<div id={id} className="icon-select-panel"><IconCards compact value={value} options={options} label={label+' 선택'} onChange={v=>{onChange(v);setOpen(false);trigger.current?.focus()}}/></div>}</div>
}

export function TouchChoice({value,options,onChange,label,area=false}){
  const [expanded,setExpanded]=useState(false),compact=area&&options.length>6;
  const shown=compact&&!expanded?options.filter(([v],i)=>i<3||v===value):options;
  return <div className={`touch-choices ${area?'touch-areas':''}`} role="group" aria-label={label}>{shown.map(([v,l])=><button type="button" key={String(v)} aria-pressed={value===v} onClick={()=>onChange(v)}>{area&&<Icon name={/ROW/.test(v)?'Seat':/WINDSHIELD|ROOF/.test(v)?'Window':'CarInfo'}/>}<span>{l}</span>{value===v&&<Icon name="check"/>}</button>)}{compact&&<button type="button" className="show-more-areas" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'위치 접기':'다른 위치 보기'}<Icon name={expanded?'up':'down'}/></button>}</div>
}
export function TouchNumber({value,onChange,label,min,max,step=1,unit='',presets=[]}){
  const [editing,setEditing]=useState(false),[digits,setDigits]=useState(''),[error,setError]=useState('');
  const clamp=n=>Math.min(max??Infinity,Math.max(min??-Infinity,n));
  const commit=n=>{if(!Number.isFinite(n)||n< (min??-Infinity)||n>(max??Infinity)){setError('허용 범위의 숫자를 선택해 주세요.');return}onChange(n);setEditing(false);setError('')};
  const change=dir=>onChange(clamp(Number((Number(value)+dir*step).toFixed(6))));
  return <div className="touch-number"><div className="stepper"><button type="button" aria-label={`${label} 줄이기`} disabled={min!==undefined&&Number(value)<=min} onClick={()=>change(-1)}><Icon name="minus"/></button><button type="button" className="number-display" aria-label={`${label} 숫자판 열기`} onClick={()=>{setDigits(String(value));setError('');setEditing(v=>!v)}}><strong>{value}</strong><span>{unit}</span><Icon name="grid"/></button><button type="button" aria-label={`${label} 늘리기`} disabled={max!==undefined&&Number(value)>=max} onClick={()=>change(1)}><Icon name="plus"/></button></div>
    {presets.length>0&&<div className="number-presets">{presets.map(n=><button type="button" key={n} aria-pressed={Number(value)===n} onClick={()=>onChange(n)}>{n}{unit}</button>)}</div>}
    {min!==undefined&&max!==undefined&&<input type="range" aria-label={`${label} 슬라이더`} min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>}
    {editing&&<div className="number-pad" role="group" aria-label={`${label} 숫자판`}><output aria-live="polite">{digits||'0'}{unit}</output><div className="number-keys">{['1','2','3','4','5','6','7','8','9','±','0','.'].map(k=><button type="button" key={k} onClick={()=>{setError('');setDigits(s=>k==='±'?(s.startsWith('-')?s.slice(1):'-'+s):k==='.'?(s.includes('.')?s:s+'.'):s==='0'?k:(s+k).slice(0,18))}}>{k}</button>)}</div><div className="number-pad-actions"><Button type="button" variant="outline" onClick={()=>setDigits('')}>지우기</Button><Button type="button" variant="outline" aria-label="숫자 한 자리 지우기" onClick={()=>setDigits(s=>s.slice(0,-1))}>⌫</Button><Button type="button" onClick={()=>commit(Number(digits||0))}>숫자 적용</Button></div>{error&&<p role="alert">{error}</p>}</div>}
  </div>
}
export function TouchText({value,onChange,label,presets=['출발 준비 완료','안전벨트를 착용해 주세요','충전이 필요해요']}){return <div className="touch-text"><div className="phrase-options">{presets.map(s=><button type="button" key={s} aria-pressed={value===s} onClick={()=>onChange(s)}>{s}</button>)}</div><input aria-label={label} maxLength={4000} value={value??''} onChange={e=>onChange(e.target.value)} placeholder="직접 작성하려면 터치"/></div>}

const labels={latitude:'위도',longitude:'경도',altitude:'고도',accuracy:'정확도',speed:'속도',bearing:'방향',timestamp:'시각',name:'이름',address:'주소',distance:'거리',duration:'소요 시간',remainingDistance:'남은 거리',remainingTime:'남은 시간',status:'상태',text:'인식한 말',value:'값',values:'받은 값',access:'읽기·설정 지원',min:'최소',max:'최대',minValue:'최솟값',maxValue:'최댓값',area:'위치',areas:'지원 위치',supported:'지원 여부',result:'결과',message:'안내',event:'감지한 변화',action:'요청',data:'상세 값',isSupported:'지원 여부'};
export const resultLabel=key=>labels[key]||optionLabel(key);
export function ResultValues({value,level=0}){
  if(value===null)return <span>받은 값 없음</span>;
  if(typeof value!=='object')return <span className="result-scalar">{typeof value==='boolean'?(value?'켜짐 / 해당함':'꺼짐 / 해당 없음'):optionLabel(String(value))}</span>;
  const entries=Object.entries(value);if(!entries.length)return <span>항목 없음</span>;
  if(level>7)return <span>상세 항목</span>;
  return <dl className="result-values">{entries.map(([key,v])=><div key={key}><dt>{Array.isArray(value)?`${Number(key)+1}번`:resultLabel(key)}</dt><dd><ResultValues value={v} level={level+1}/></dd></div>)}</dl>
}
export function FieldPicker({value,onChange,operationId,label='사용할 항목'}){
  const op=operationMap.get(operationId),latest=apiState.status.get(operationId)?.value;
  const paths=[];function flatten(v,prefix='',depth=0){if(depth>5||!v||typeof v!=='object')return;for(const [k,item] of Object.entries(v).slice(0,60)){const p=prefix?`${prefix}.${k}`:k;paths.push([p,p.split('.').map(resultLabel).join(' · ')]);flatten(item,p,depth+1)}}flatten(latest);
  if(!paths.length&&op?.domain==='Location')paths.push(...['latitude','longitude','altitude','accuracy','speed','bearing'].map(k=>[k,resultLabel(k)]));
  if(!paths.length&&op?.domain==='STT')paths.push(['text','인식한 말']);
  if(value&&!paths.some(([p])=>p===value))paths.push([value,value.split('.').map(resultLabel).join(' · ')]);
  return <div className="field-picker"><span className="control-label">{label}</span><TouchChoice label={label} value={value||''} options={[["","전체 값"],...paths]} onChange={onChange}/>{!paths.length&&op?.result?.kind==='object'&&<small>연결 테스트에서 한 번 읽으면 세부 항목을 고를 수 있어요.</small>}</div>
}
