import catalog from './api-catalog.json' with { type: 'json' };
export const operations = catalog.operations;
export const domains = catalog.domains;
export const operationMap = new Map(operations.map(op => [op.id, op]));
export const kindNames = { read: '입력', write: '동작', subscribe: '감지', capability: '지원 확인', unsubscribe: '감지 해제' };
export const optionNames = { ROW_1_LEFT:'1열 왼쪽 · 운전석',ROW_1_CENTER:'1열 가운데',ROW_1_RIGHT:'1열 오른쪽',ROW_2_LEFT:'2열 왼쪽',ROW_2_CENTER:'2열 가운데',ROW_2_RIGHT:'2열 오른쪽',ROW_3_LEFT:'3열 왼쪽',ROW_3_CENTER:'3열 가운데',ROW_3_RIGHT:'3열 오른쪽',ON:'켜기',OFF:'끄기',AUTO:'자동',STOP:'정지',FORWARD:'앞으로',BACKWARD:'뒤로',CELSIUS:'섭씨 °C',FAHRENHEIT:'화씨 °F',BOTH:'진입 및 이탈',ENTER:'진입',EXIT:'이탈',RECOMMENDED:'추천 경로',SHORT_DISTANCE:'짧은 거리',SHORT_TIME:'빠른 시간',FREE:'무료 도로',HIGHWAY:'고속도로',COMFORTABLE:'편안한 경로',SCHOOL_ZONE:'스쿨존 고려',FIRST:'첫 번째',SECOND:'두 번째',ALL:'전체',Foreground:'내비게이션',MoveToCurrentLocationOnMap:'현재 위치',FavoriteMain:'즐겨찾기',RecentDestinations:'최근 목적지',RouteOptionList:'경로 옵션',EditRoute:'경로 편집',NearbyChargingStations:'주변 충전소',Settings:'내비 설정',AddHomeFavorite:'집 등록',AddWorkFavorite:'회사 등록',SearchPlace:'장소 검색',POIDetailPopup:'장소 상세','ko-KR':'한국어','en-US':'영어',RUN_ROUTINE:'루틴 실행 요청',STOP_ROUTINE:'루틴 중지 요청',LIST_ROUTINES:'루틴 목록 요청',success:'성공',failure:'실패' };
Object.assign(optionNames,{HOOD:'보닛',REAR:'트렁크',FRONT_WINDSHIELD:'앞 유리',REAR_WINDSHIELD:'뒤 유리',ROOF_TOP_1:'앞 선루프',ROOF_TOP_2:'뒤 선루프',UNKNOWN:'알 수 없음',OTHER:'기타 상태',FACE:'상체',FLOOR:'발',FACE_AND_FLOOR:'상체와 발',DEFROST:'앞 유리',FACE_AND_DEFROST:'상체와 앞 유리',DEFROST_AND_FLOOR:'앞 유리와 발',FACE_AND_FLOOR_AND_DEFROST:'상체·발·앞 유리',DAYTIME_RUNNING:'주간 주행등',AUTOMATIC:'자동',DRIVER_LEFT:'왼쪽 미러',DRIVER_RIGHT:'오른쪽 미러',DRIVER_CENTER:'룸미러',LEFT_FRONT:'앞 왼쪽',RIGHT_FRONT:'앞 오른쪽',LEFT_REAR:'뒤 왼쪽',RIGHT_REAR:'뒤 오른쪽',SKIP:'유지',MIST:'한 번 닦기',SERVICE:'정비 위치',PARK:'주차',REVERSE:'후진',NEUTRAL:'중립',DRIVE:'주행',ECO:'경제',SPORT:'스포츠',NORMAL:'일반',SNOW:'눈길',SMART:'스마트',COMFORT:'편안하게',CUSTOM:'사용자 설정',READ:'읽기',WRITE:'설정',READ_WRITE:'읽기와 설정',NONE:'없음',onDestinationArrived:'목적지 도착',onWayPointArrived:'경유지 도착',onRouteStarted:'안내 시작',onRouteEnded:'안내 종료',onRoutingCompleted:'경로 탐색 완료',onReRouteEnded:'재탐색 완료',onRouteOptionChanged:'경로 옵션 변경',onRouteCancelled:'안내 취소',onWaypointChanged:'경유지 변경',onBookMarkChanged:'즐겨찾기 변경',onDestinationChanged:'목적지 변경',onCurrentLocationInfo:'현재 위치 수신',onRouteStateInfo:'경로 상태 수신',onDestinationInfo:'목적지 정보 수신',onWayPointInfo:'경유지 정보 수신',onRecentDestinationInfo:'최근 목적지 수신',onBookmarkInfo:'즐겨찾기 수신',onCurrentRoadSpeedLimit:'제한 속도 변경',onCameraAlert:'단속 카메라 안내',onDrivingInfo:'주행 정보 수신',onNavigationStatus:'내비 상태 변경',onTBTInfo:'회전 안내 수신',onChargerOperatorInfo:'충전 사업자 수신',onCautionPointInfo:'주의 구간 안내',onTripInfo:'여정 정보 수신',onStart:'음성 시작',onDone:'음성 완료',onStop:'음성 중지',onReady:'음성 준비 완료'});
Object.assign(optionNames,{ROW_1_LEFT:'운전석',ROW_1_CENTER:'1열 중앙',ROW_1_RIGHT:'동승석'});
for(let i=1;i<=5;i++){optionNames[`INTERMITTENT_LEVEL_${i}`]=`간헐 작동 ${i}단계`;optionNames[`CONTINUOUS_LEVEL_${i}`]=`연속 작동 ${i}단계`;}
export const optionLabel = value => optionNames[value] || value;
export function operation(id, kinds) {
  const op = operationMap.get(id);
  if (!op || op.disabled) throw new Error('사용할 수 없는 차량 기능입니다.');
  if (kinds && !kinds.includes(op.kind)) throw new Error('이 위치에 사용할 수 없는 기능입니다.');
  return op;
}
export function literal(value) {
  return typeof value === 'number' ? {type:'value_number',fields:{VALUE:value}} : typeof value === 'boolean' ? {type:'value_boolean',fields:{VALUE:value?'TRUE':'FALSE'}} : typeof value === 'string' ? {type:'value_text',fields:{VALUE:value}} : {type:'value_json',fields:{VALUE:JSON.stringify(value)}};
}
export function apiNode(id, event = false) {
  const op = operation(id);
  return { type:event?'routine_api_event':'api_call', fields:{API:id,NAME:'',PATH:''}, inputs:Object.fromEntries(op.params.map((p,i)=>[`ARG${i}`,{block:literal(p.default)}])) };
}
export function validateArguments(op, args) {
  if(args.length!==op.params.length)throw new Error('기능 입력 개수를 확인해 주세요.');
  op.params.forEach((p,i)=>{
    const v=args[i];
    if(p.kind==='number' && (typeof v!=='number'||!Number.isFinite(v)||(p.integer&&!Number.isInteger(v))||(p.min!==undefined&&v<p.min)||(p.max!==undefined&&v>p.max)))throw new Error(`${p.label}: 허용 범위의 ${p.integer?'정수':'숫자'}를 입력해 주세요.`);
    if(p.kind==='boolean'&&typeof v!=='boolean')throw new Error(`${p.label}: 참/거짓을 선택해 주세요.`);
    if(p.kind==='enum'&&!p.options.includes(v))throw new Error(`${p.label}: 목록에서 선택해 주세요.`);
    if(p.kind==='area'&&(typeof v!=='string'||!v.split('|').every(part=>p.options.includes(part))||new Set(v.split('|')).size!==v.split('|').length))throw new Error(`${p.label}: 목록에서 선택해 주세요.`);
    if(p.kind==='enumList'&&(!Array.isArray(v)||!v.length||v.length>64||v.some(item=>!p.options.includes(item))))throw new Error('구역별 설정 값을 확인해 주세요.');
    if(p.kind==='text'&&(typeof v!=='string'||v.length>4000))throw new Error(`${p.label}: 텍스트가 필요합니다.`);
    if(p.kind==='waypoints'&&(!Array.isArray(v)||v.length>2||v.some(p=>typeof p.latitude!=='number'||!Number.isFinite(p.latitude)||Math.abs(p.latitude)>90||typeof p.longitude!=='number'||!Number.isFinite(p.longitude)||Math.abs(p.longitude)>180||typeof p.name!=='string')))throw new Error('경유지 이름과 위도·경도를 확인해 주세요.');
  });
  return args;
}
export function propertyOf(value, path='') {
  if(!path.trim())return value;
  const keys=path.replace(/\[(\d+)\]/g,'.$1').split('.');
  if(keys.length>16||keys.some(k=>!k||['__proto__','prototype','constructor'].includes(k)))throw new Error('올바른 결과 항목 경로를 입력해 주세요.');
  for(const key of keys){if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))throw new Error(`응답에 “${key}” 항목이 없습니다.`);value=value[key];}
  return value;
}
export function literalArguments(node) {
  const op=operation(node.fields?.API,['subscribe']);
  return validateArguments(op,op.params.map((_,i)=>{
    const n=node.inputs?.[`ARG${i}`]?.block;
    if(!n)throw new Error('감지 설정을 입력해 주세요.');
    if(n.type==='value_number')return n.fields.VALUE;
    if(n.type==='value_text')return n.fields.VALUE;
    if(n.type==='value_boolean')return n.fields.VALUE==='TRUE';
    if(n.type==='value_json')return JSON.parse(n.fields.VALUE);
    throw new Error('감지를 시작할 때는 고정된 설정 값이 필요합니다.');
  }));
}
let transport={call:()=>Promise.reject(new Error('연결이 준비되지 않았어요.')),vehicle:()=>false,log:()=>{}};
export function configureApi(next){transport={...transport,...next};}
const samples=new Map();
const watch=new Map();
export const apiState={latest:null,status:new Map(),revision:0,listeners:new Set()};
const changed=()=>{apiState.revision++;apiState.listeners.forEach(f=>f());};
export function subscribeStatus(fn){apiState.listeners.add(fn);return()=>apiState.listeners.delete(fn);}
const sampleKey=(id,args)=>`${id}:${JSON.stringify(args)}`;
export function setSample(id,args,value){operation(id);samples.set(sampleKey(id,args),value);changed();}
export async function callApi(id,args){
  const op=operation(id,['read','write','capability']);validateArguments(op,args);
  const mode=transport.vehicle()?'vehicle':'demo';
  apiState.status.set(id,{state:'pending',mode});changed();
  try{
    let value;
    if(mode==='vehicle')value=await transport.call('api.invoke',{operation:id,args});
    else if(samples.has(sampleKey(id,args)))value=structuredClone(samples.get(sampleKey(id,args)));
    else if(op.kind==='write')value={status:'simulated',operation:id,args};
    else throw new Error('테스트 응답이 없습니다. 연결 및 테스트에서 이 기능의 응답 값을 설정하거나 Pleos 연결로 실행해 주세요.');
    apiState.latest={id,args,value,mode};apiState.status.set(id,{state:'success',mode,value});changed();
    transport.log(`${op.label} · ${mode==='demo'?'시뮬레이션':value?.status==='requested'?'요청 전달':'SDK 응답'}: ${JSON.stringify(value).slice(0,350)}`,'success');return value;
  }catch(error){apiState.status.set(id,{state:'error',mode,message:error.message});changed();throw error;}
}
export async function watchApi(id,args,token,callback){
  const op=operation(id,['subscribe']);validateArguments(op,args);watch.set(token,{id,args,callback});
  try{if(transport.vehicle())await transport.call('api.subscribe',{operation:id,args,token});}
  catch(error){watch.delete(token);throw error;}
}
export function receiveApiEvent(token,value,error){const entry=watch.get(token);if(!entry)return;apiState.status.set(entry.id,error?{state:'error',message:error}:{state:'success',value,mode:transport.vehicle()?'vehicle':'demo'});changed();entry.callback(value,error);}
export function simulateApiEvent(id,value){if(transport.vehicle())throw new Error('테스트 차량 모드에서만 보낼 수 있어요.');let count=0;for(const [token,entry] of watch)if(entry.id===id){receiveApiEvent(token,value,null);count++;}return count;}
export async function clearApiWatches(){watch.clear();if(transport.vehicle())await transport.call('api.clearSubscriptions').catch(error=>transport.log(error.message,'error'));}
export const isVehicleMode=()=>transport.vehicle();
export async function permissionAction(request=false){return transport.call(request?'permissions':'permissionState');}
