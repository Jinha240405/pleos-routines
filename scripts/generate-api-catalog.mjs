import fs from 'node:fs';
import { connectOperations } from './connect-catalog.mjs';
const api = JSON.parse(fs.readFileSync('sdk/vehicle-api-2.3.2.json', 'utf8'));
const typeSource = fs.readFileSync('sdk/vehicle-types-public.txt', 'utf8');
const types = {};
for (const block of typeSource.split('Compiled from')) {
  const name = block.match(/public (?:final |abstract )?(?:class|interface) ([\w.]+)/)?.[1];
  if (!name) continue;
  const enums = [...block.matchAll(/public static final ([\w.]+) (\w+);/g)].filter(m => m[1] === name).map(m => m[2]);
  const areaType = block.match(/public [\w.]+Area\(([\w.]+)\.\.\.\)/)?.[1];
  types[name] = { ...(enums.length ? { enums } : {}), ...(areaType ? { areaType } : {}) };
}
export const domainNames = { HVAC:'공조', Seat:'좌석', Door:'도어', Window:'창문', Light:'조명', EvBattery:'배터리·충전', Fuel:'연료', SteeringWheel:'핸들', SideMirror:'사이드미러', Wiper:'와이퍼', TurnSignal:'방향지시등', Gear:'기어', Brake:'브레이크', DrivingMode:'주행 모드', Odometer:'주행 기록', Tire:'타이어', Safety:'안전·경고', Toll:'하이패스', Display:'표시 단위', CarInfo:'차량 정보' };
const words = {
  HvacTemperatureCurrent:'실내 온도',HvacTemperature:'설정 온도',HvacAc:'에어컨',HvacAuto:'자동 공조',HvacAutoRecirculation:'자동 내기순환',HvacRecirculation:'내기순환',HvacDefroster:'성에 제거',HvacDual:'좌우 온도 연동',HvacFanDirection:'바람 방향',HvacFanSpeed:'바람 세기',HvacMaxAc:'최대 냉방',HvacMaxDefrost:'최대 성에 제거',HvacPower:'공조 전원',HvacAirCleaner:'공기청정',
  BrakePedalStatus:'브레이크 페달',VINInfo:'차대번호 VIN',CRNInfo:'구형 차량 번호',CapabilityInfo:'지원 기능 구성',TemperatureDisplayUnit:'온도 표시 단위',GloveBoxLock:'글러브박스 잠금',DoorLock:'문 잠금',DoorPosition:'문 위치',CruiseControlTargetSpeed:'크루즈 목표 속도',CruiseControl:'크루즈 상태',DrivingMode:'주행 모드',
  InstantaneousEvEfficiency:'순간 전비',SinceChargeEvEfficiency:'충전 후 전비',CumulativeEvEfficiency:'누적 전비',CurrentEvEfficiency:'현재 전비',EvBatteryStateOfCharge:'배터리 충전율',EvBatteryLevel:'배터리 에너지 잔량',EvChargeCurrentDrawLimit:'충전 전류 제한',EvChargePercentLimit:'목표 충전율',EvChargePortOpen:'충전구 열림',EvChargeSwitch:'충전 스위치',EvBatteryCapacity:'배터리 용량',
  InstantaneousFuelEconomy:'순간 연비',SinceChargeFuelEconomy:'주유 후 연비',CumulativeFuelEconomy:'누적 연비',CurrentFuelEconomy:'현재 연비',FuelPercent:'연료 잔량',GearSelection:'선택 기어',
  ReadingLight:'독서등',CabinLight:'실내등',HighBeamLight:'상향등',LowBeamLight:'하향등',TailLampLight:'후미등',FrontFogLight:'앞 안개등',RearFogLight:'뒤 안개등',AmbientLightBrightness:'앰비언트 밝기',AmbientLightBrightnessColor:'앰비언트 색상',AmbientLight:'앰비언트 조명',AmbientColorAutoByDriveModeEnabled:'주행 모드별 색상 연동',
  DistanceDriven:'총 주행거리',TripCurrentDrivingTime:'현재 주행 시간',TripCumulativeDrivingTime:'누적 주행 시간',TripSinceRefillDrivingTime:'주유 후 주행 시간',TripCurrentDrivingDistance:'현재 주행거리',TripInstantaneousDrivingDistance:'구형 순간 주행거리',TripCumulativeDrivingDistance:'누적 주행거리',TripSinceRefillDrivingDistance:'주유 후 주행거리',RangeRemainingDistance:'남은 주행거리',RangeRemaining:'남은 주행거리',TripDrivingTime:'트립 시간',TripDrivingDistance:'트립 거리',
  EngineOilLevel:'엔진오일 상태',BrakeFluidLevel:'브레이크액 상태',TransmissionOilLevel:'변속기오일 상태',LowWasherFluidWarning:'워셔액 부족 경고',LowWasherFluidWaring:'워셔액 부족 경고',SeatAirbagBeenDeployed:'에어백 전개',SeatAirbagDeployed:'에어백 전개',AirbagDeployed:'에어백 전개',PowerDownWarningIndicator:'출력 저하 경고',SeatAirbagEnabled:'에어백 활성',SeatBeltNotBuckledWarning:'벨트 미착용 경고',SeatNotBuckledWarning:'벨트 미착용 경고',TelltalesInfo:'계기판 표시등',Telltales:'계기판 표시등',Airbag:'에어백',SeatBuckled:'벨트 체결',
  SeatOccupancy:'좌석 탑승',SeatHeadrestForeAft:'머리받침 앞뒤',SeatHeadrestHeightAft:'머리받침 높이',SeatHeadrestHeight:'머리받침 높이',SeatHeight:'좌석 높이',SeatLumbarForeAft:'요추 지지',SeatLumbarSideSupport:'요추 측면 지지',SeatTilt:'좌석 기울기',SeatDepth:'좌석 깊이',SeatForeAft:'좌석 앞뒤',SeatHeadrestAngle:'머리받침 각도',SeatBackrestAngle:'등받이 각도',SeatBeltBuckled:'안전벨트 체결',SeatBeltHeight:'안전벨트 높이',HvacSeatTemperature:'시트 온도 단계',HvacSeatVentilation:'시트 통풍',SeatTemperature:'시트 온도 단계',SeatVentilation:'시트 통풍',SeatMemory:'좌석 메모리',
  HvacSideMirrorHeat:'미러 열선',HvacSteeringWheelHeat:'핸들 열선',SteeringWheelAngle:'핸들 각도',LowTirePressure:'타이어 저압 기준',TirePressure:'타이어 공기압',WheelArea:'바퀴 영역',EtcsVoiceGuidanceVolume:'하이패스 안내 음량',TurnSignal:'방향지시등',WindowLock:'창문 잠금',WindowPosition:'창문 위치',WindowBlindPosition:'블라인드 위치',WindowBlind:'블라인드 이동',SmartGlass:'스마트글라스',SmartGlassConfig:'스마트글라스 구성',SmartGlassLevel:'스마트글라스 단계',SmartGlassZone:'스마트글라스 구역',Wiper:'와이퍼',
};
function splitTypes(s) { const out=[];let depth=0,start=0;for(let i=0;i<s.length;i++){if(s[i]==='<')depth++;if(s[i]==='>')depth--;if(s[i]===','&&!depth){out.push(s.slice(start,i).trim());start=i+1;}}if(s.slice(start).trim())out.push(s.slice(start).trim());return out; }
function stem(name){return name.replace(/^(getCurrent(?!Ev|Fuel)|get|has|is|set|move|select|register|unregister|check)/,'').replace(/Capabilities$|Listener$/g,'');}
function label(name){const s=stem(name);return words[s]??words[s.replace(/State$|Switch$/,'')]??words[s.replace(/Position$/,'')]??words[s.replace(/^Move/,'')]??s.replace(/([a-z])([A-Z])/g,'$1 $2');}
function param(type,index) {
  const erased=type.replace(/<.*>/,'');const def=types[erased]??{};let options=def.enums??(def.areaType?types[def.areaType]?.enums:null);
  const kind=def.areaType?'area':options?'enum':/^(boolean|java.lang.Boolean)$/.test(type)?'boolean':/^(int|long|float|double|java.lang.(Integer|Long|Float|Double))$/.test(type)?'number':type.startsWith('java.util.List')?'enumList':'text';
  if(kind==='enumList'){const e=type.match(/<\? extends ([\w.]+)>/)?.[1];options=types[e]?.enums;if(!options)throw new Error(`Unsupported list: ${type}`);}
  const defaults={MoveControl:'STOP',TemperatureUnit:'CELSIUS',LightSwitch:'OFF',WiperSwitch:'OFF'};
  const short=erased.split('.').at(-1);
  return {key:`arg${index}`,type:erased,generic:type,kind,label:kind==='area'?'대상 영역':short==='TemperatureUnit'?'온도 단위':kind==='boolean'?'사용 여부':kind==='enum'?'설정':kind==='enumList'?'구역별 설정':'값',...(options?{options}:{}),default:kind==='number'?0:kind==='boolean'?false:kind==='enumList'?['SKIP']:options?(defaults[short]??options[0]):'',integer:/^(int|long|java.lang.(Integer|Long))$/.test(type)};
}
function resultType(raw){
  const callback=raw.find(t=>t.startsWith('kotlin.jvm.functions.Function1<'));
  if(!callback)return {kind:'object'};
  const type=splitTypes(callback.slice(callback.indexOf('<')+1,-1))[0].replace(/^\? super /,'');
  const enums=types[type]?.enums;
  return enums?{kind:'enum',options:enums}:{kind:type==='java.lang.Boolean'?'boolean':/^java.lang.(Integer|Long|Float|Double)$/.test(type)?'number':type==='java.lang.String'?'text':'object'};
}
const operations=[];
for(const [domain,methods] of Object.entries(api))for(const [method,defs] of Object.entries(methods)){
  const def=defs.find(x=>!x.deprecated)??defs[0];
  const raw=splitTypes(def.signature.slice(def.signature.indexOf('(')+1,def.signature.lastIndexOf(')')));
  const args=raw.filter(t=>!t.startsWith('kotlin.jvm.functions.')&&!t.includes('.listener.')).map(param);
  const kind=/^(get|is|has)/.test(method)?'read':/^(set|move|select)/.test(method)?'write':method.startsWith('unregister')?'unsubscribe':method.startsWith('register')?'subscribe':'capability';
  operations.push({id:`${domain}.${method}`,domain,domainLabel:domainNames[domain],method,label:label(method),kind,params:args,result:resultType(raw),parameterTypes:raw.map(t=>t.replace(/<.*>/,'')),permission:def.permission,deprecated:def.level,deprecatedMessage:def.message,disabled:def.level==='ERROR',source:'vehicle'});
}
const caps=operations.filter(o=>o.kind==='capability');
function norm(n){return stem(n).replace(/^Hvac/,'').replace(/State$|Position$/,'').replace(/HeightAft/,'Height');}
const aliases={getCurrentGloveBoxLockState:'checkGloveBoxLockCapabilities',hasSeatAirbagBeenDeployed:'checkAirbagDeployedCapabilities',hasSeatAirbagEnabled:'checkAirbagCapabilities',hasSeatBeltNotBuckledWarning:'checkSeatNotBuckledWarningCapabilities',getTelltalesInfo:'checkTelltalesCapabilities',registerSeatAirbagDeployed:'checkAirbagDeployedCapabilities',registerLowWasherFluidWaringState:'checkLowWasherFluidWarningStateCapabilities'};
for(const op of operations){
  if(['read','write','subscribe'].includes(op.kind)){
    const cap=caps.find(c=>c.domain===op.domain&&c.method===(aliases[op.method]??`check${op.method.startsWith('move')?'Move':''}${stem(op.method)}Capabilities`))??caps.find(c=>c.domain===op.domain&&norm(c.method)===norm(op.method));
    if(cap)op.capability=cap.id;
  }
  if(op.kind==='subscribe')op.unsubscribe=`${op.domain}.${op.method.replace(/^register/,'unregister')}`;
  if(op.method==='setHvacTemperature')op.params.find(p=>p.kind==='number').default=22;
  if(op.method==='setHvacFanSpeed')op.params.find(p=>p.kind==='number').default=3;
  for(const p of op.params){if(p.kind==='number')p.label=op.method==='selectSeatMemory'?'메모리 번호':op.label;if(p.type.endsWith('.MoveControl'))p.label='이동 방향';if(p.kind==='boolean')p.label=op.label;}
}
const replacements={ 'Gear.getCurrentGearSelectionState':'GEAR_SELECTION','Gear.registerGearSelection':'GEAR_SELECTION','Gear.unregisterGearSelection':'GEAR_SELECTION','EvBattery.getEvBatteryLevel':'EV_BATTERY_LEVEL','EvBattery.registerEvBatteryLevel':'EV_BATTERY_LEVEL','EvBattery.unregisterEvBatteryLevel':'EV_BATTERY_LEVEL','EvBattery.isEvChargePortOpen':'EV_CHARGE_PORT_OPEN','EvBattery.registerEvChargePortOpen':'EV_CHARGE_PORT_OPEN','EvBattery.unregisterEvChargePortOpen':'EV_CHARGE_PORT_OPEN','EvBattery.getEvBatteryCapacity':'INFO_EV_BATTERY_CAPACITY','Odometer.getRangeRemainingDistance':'RANGE_REMAINING','Odometer.registerRangeRemainingListener':'RANGE_REMAINING','Odometer.unregisterRangeRemainingListener':'RANGE_REMAINING'};
for(const op of operations)if(replacements[op.id])op.aaosProperty=replacements[op.id];
operations.push({id:'AAOS.speed',domain:'DrivingMode',domainLabel:'주행 모드',method:'PERF_VEHICLE_SPEED',label:'주행 속도 (km/h)',kind:'read',params:[],source:'aaos',aaosProperty:'PERF_VEHICLE_SPEED'}, {id:'AAOS.speedChanged',domain:'DrivingMode',domainLabel:'주행 모드',method:'PERF_VEHICLE_SPEED',label:'주행 속도',kind:'subscribe',params:[],source:'aaos',aaosProperty:'PERF_VEHICLE_SPEED'});
operations.push(...connectOperations);
const catalog={version:1,sdk:'2.3.2',domains:{...domainNames,Location:'위치',Navi:'내비게이션',STT:'음성 인식',TTS:'음성 출력',Gleo:'Gleo'},operations};
fs.writeFileSync('web/api-catalog.json',JSON.stringify(catalog));
fs.writeFileSync('app/src/main/assets/api-catalog.json',JSON.stringify(catalog));
console.log(`Catalog: ${operations.length} entries; ${operations.filter(o=>o.source==='vehicle'&&o.kind==='write'&&!o.disabled).length} vehicle actions.`);
