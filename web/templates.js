const node = (type, fields = {}, inputs = {}, after) => ({ type, fields, ...(Object.keys(inputs).length ? { inputs: Object.fromEntries(Object.entries(inputs).map(([k, b]) => [k, { block: b }])) } : {}), ...(after ? { next: { block: after } } : {}) });
const number = n => node('value_number', { VALUE: n });
const text = t => node('value_text', { VALUE: t });
const signal = s => node('vehicle_signal', { SIGNAL: s });
const notify = (t, after) => node('action_notify', {}, { TEXT: text(t) }, after);
const state = root => ({ blocks: { languageVersion: 0, blocks: [{ ...root, x: 64, y: 48 }] } });
const start = after => node('routine_start', {}, {}, after);
export const templates = [
  {
    id: 'comfort', name: '쾌적한 출발', icon: 'climate', tag: '온도 · 조건 · 공조', description: '차 안이 더울 때, 나에게 맞는 온도로.',
    workspace: state(start(node('flow_if', {}, {
      CONDITION: node('logic_compare', { OP: 'GT' }, { A: signal('temperature'), B: number(26) }),
      THEN: node('vehicle_climate', {}, { VALUE: number(22) }, node('vehicle_fan', {}, { VALUE: number(3) }, notify('시원한 출발을 준비했어요!'))),
      ELSE: notify('지금 온도가 좋아요!'),
    }))),
  },
  {
    id: 'door', name: '출발 전 도어 확인', icon: 'door', tag: '도어 · 조건 · 알림', description: '출발하기 전에 열린 문을 확인해요.',
    workspace: state(start(node('flow_if', {}, {
      CONDITION: signal('door'),
      THEN: notify('운전석 문이 열려 있어요. 출발 전에 확인해 주세요.'),
      ELSE: notify('운전석 문이 닫혀 있어요. 안전한 여행 되세요.'),
    }))),
  },
  {
    id: 'battery', name: '충전 리마인더', icon: 'battery', tag: '배터리 · 변수 · 반복', description: '직접 정한 배터리 기준으로 충전을 알려요.',
    workspace: state(start(node('variable_set', { NAME: '충전기준' }, { VALUE: number(30) }, node('flow_if', {}, {
      CONDITION: node('logic_compare', { OP: 'LT' }, { A: signal('battery'), B: node('variable_get', { NAME: '충전기준' }) }),
      THEN: node('flow_repeat', {}, { TIMES: number(2), DO: notify('배터리가 부족해요. 충전 일정을 확인해 주세요.', node('flow_wait', {}, { SECONDS: number(1) })) }),
      ELSE: notify('배터리에 여유가 있어요.'),
    })))),
  },
  {
    id: 'event', name: '문이 열리면 알려주기', icon: 'spark', tag: '이벤트 · 조건 · 알림', description: '도어 상태가 바뀌면 소지품을 챙기도록 알려요.',
    workspace: state(node('routine_event', { EVENT: 'door' }, {}, node('flow_if', {}, { CONDITION: signal('door'), THEN: notify('문이 열렸어요. 내리기 전 소지품을 챙겨 주세요.'), ELSE: notify('문이 닫혔어요.') }))),
  },
];
export const blankWorkspace = () => state(start());
import {apiNode,literal} from './api.js';

const compare=(source,op,value)=>node('logic_compare',{OP:op},{A:source,B:literal(value)});
const all=(a,b)=>node('logic_operation',{OP:'AND'},{A:a,B:b});
const either=(a,b)=>node('logic_operation',{OP:'OR'},{A:a,B:b});
const result=(id)=>node('result_get',{SOURCE:id,PATH:''});
function api(id,values=[],after){const n=apiNode(id);values.forEach((v,i)=>{if(v!==undefined)n.inputs['ARG'+i]={block:literal(v)}});if(after)n.next={block:after};return n;}
function read(id,values=[]){return {...api(id,values),type:'api_read'};}
const branch=(condition,yes,no)=>node('flow_if',{}, {CONDITION:condition,THEN:yes,...(no?{ELSE:no}:{})});
const sample=(id,args,value)=>({id,args,value});
templates.forEach((t,i)=>{t.category=['쾌적함','출발','충전','도착'][i];});
templates.push(
  {id:'warm',name:'쌀쌀한 아침',icon:'climate',category:'쾌적함',tag:'18°C 미만 → 따뜻하게',description:'차 안이 추울 때만 온도를 23°C로 맞춰요.',workspace:state(start(branch(compare(signal('temperature'),'LT',18),node('vehicle_climate',{}, {VALUE:number(23)},node('vehicle_fan',{}, {VALUE:number(2)},notify('따뜻한 출발을 준비했어요.'))),notify('지금 온도가 적당해요.'))))},
  {id:'quiet',name:'조용하고 시원하게',icon:'fan',category:'쾌적함',tag:'온도 + 도어 · 모든 조건',description:'문이 닫히고 더울 때, 약한 바람으로 냉방해요.',workspace:state(start(branch(all(compare(signal('temperature'),'GT',26),compare(signal('door'),'EQ',false)),node('vehicle_climate',{}, {VALUE:number(23)},node('vehicle_fan',{}, {VALUE:number(1)},notify('약한 바람으로 시원하게 맞췄어요.'))),notify('문과 실내 온도를 확인했어요.'))))},
  {id:'charger',name:'충전소 찾아보기',icon:'battery',category:'충전',tag:'배터리 30% 미만 → 충전소',description:'배터리가 부족할 때 주변 충전소 화면을 열어요.',workspace:state(start(branch(compare(signal('battery'),'LT',30),notify('배터리가 부족해요. 가까운 충전소를 확인해 주세요.',api('Navi.requestNavigationScreen',['NearbyChargingStations',''])),notify('아직 배터리에 여유가 있어요.'))))},
  {id:'charge-ready',name:'충전 80% 알림',icon:'battery',category:'충전',tag:'배터리 변화 → 80% 이상',description:'앱을 열어 둔 동안 충전 목표에 도달하면 알려요.',workspace:state(node('routine_event',{EVENT:'battery'}, {},branch(compare(signal('battery'),'GTE',80),notify('배터리 80% 이상 충전됐어요. 출발 준비를 확인해 주세요.'))))},
  {id:'rain',name:'빗길 출발 안내',icon:'activity',category:'출발',tag:'와이퍼 작동 → 안내',description:'와이퍼 상태를 조건 안에서 바로 확인해요.',samples:[sample('Wiper.getCurrentWiperState',['FRONT_WINDSHIELD'],'ON')],workspace:state(start(branch(compare(read('Wiper.getCurrentWiperState',['FRONT_WINDSHIELD']),'EQ','ON'),notify('와이퍼가 작동 중이에요. 젖은 노면에서는 차간 거리를 충분히 유지해 주세요.'),notify('와이퍼가 작동하지 않고 있어요.'))))},
  {id:'belt',name:'동승석 안전벨트 확인',icon:'door',category:'출발',tag:'조회 2개 → 조건으로 연결',description:'사람이 앉아 있고 벨트가 풀려 있을 때만 알려요.',samples:[sample('Seat.getCurrentSeatOccupancy',['ROW_1_RIGHT'],true),sample('Seat.getCurrentSeatBeltBuckledState',['ROW_1_RIGHT'],false)],workspace:state(start({...api('Seat.getCurrentSeatOccupancy',['ROW_1_RIGHT']),id:'belt-seat',next:{block:{...api('Seat.getCurrentSeatBeltBuckledState',['ROW_1_RIGHT']),id:'belt-buckle',next:{block:branch(all(compare(result('belt-seat'),'EQ',true),compare(result('belt-buckle'),'EQ',false)),notify('동승석 안전벨트를 확인해 주세요.'),notify('동승석 안전벨트 확인을 마쳤어요.'))}}}}))},
  {id:'rear-seat',name:'내리기 전 뒷좌석 확인',icon:'door',category:'도착',tag:'뒷좌석 중 하나라도 탑승',description:'뒷좌석 센서에 탑승이 감지되면 한 번 더 확인해요.',samples:[sample('Seat.getCurrentSeatOccupancy',['ROW_2_LEFT'],true),sample('Seat.getCurrentSeatOccupancy',['ROW_2_RIGHT'],false)],workspace:state(start(branch(either(compare(read('Seat.getCurrentSeatOccupancy',['ROW_2_LEFT']),'EQ',true),compare(read('Seat.getCurrentSeatOccupancy',['ROW_2_RIGHT']),'EQ',true)),notify('뒷좌석에 탑승이 감지됐어요. 내리기 전에 뒷좌석을 확인해 주세요.'),notify('뒷좌석 센서 확인을 마쳤어요. 소지품도 챙겨 주세요.'))))},
  {id:'parked-door',name:'정차 중 문 열림 안내',icon:'bell',category:'도착',tag:'정차 + 문 열림 · 모든 조건',description:'문이 열리면 정차 상태인지 확인하고 소지품을 알려요.',workspace:state(node('routine_event',{EVENT:'door'}, {},branch(all(compare(signal('door'),'EQ',true),compare(signal('speed'),'EQ',0)),notify('내리기 전에 휴대폰과 소지품을 챙겨 주세요.'))))}
);

// Practical recipes use the same public blocks as the editor. No special runner.
const chain = (...blocks) => blocks.reduceRight((after, block) => ({ ...block, ...(after ? { next: { block: after } } : {}) }), undefined);
const variable = name => node('variable_get', { NAME: name });
const assign = (name, value) => node('variable_set', { NAME: name }, { VALUE: value });
const join = (a, b) => node('value_join', {}, { A: a, B: b });
const speak = value => node('action_speak', {}, { TEXT: typeof value === 'string' ? text(value) : value });
const parked = actions => branch(compare(read('Gear.getCurrentGearSelectionState'), 'EQ', 'GEAR_PARK'), actions, notify('P단으로 주차한 뒤 실행해 주세요.'));
const addNotice = message => assign('확인할 내용', join(variable('확인할 내용'), text(message)));
const checkWindow = (area, label) => branch(compare(read('Window.getCurrentWindowPosition', [area]), 'GT', 0), addNotice(`${label} 창문이 열려 있어요. `));

export const practicalTemplates = [
  {
    id: 'empty-passenger', name: '빈 동승석 정리', icon: 'climate', category: '장거리', tag: '자리 비움 → P단 확인 → 3가지 끄기',
    description: '휴게소에서 동승자가 내리면, 빈 동승석의 열선·통풍·독서등을 함께 꺼요. 운전석 설정은 유지해요.',
    tip: '좌석 위치를 바꾸면 뒷자리용으로도 쓸 수 있어요. 앱을 열고 상태 감지를 시작해 주세요.',
    workspace: state({ ...apiNode('Seat.registerSeatOccupancy', true), inputs: { ARG0: { block: literal('ROW_1_RIGHT') } }, next: { block: branch(all(compare(read('Seat.getCurrentSeatOccupancy', ['ROW_1_RIGHT']), 'EQ', false), compare(read('Gear.getCurrentGearSelectionState'), 'EQ', 'GEAR_PARK')), chain(api('Seat.setHvacSeatTemperature', ['ROW_1_RIGHT', 0]), api('Seat.setHvacSeatVentilation', ['ROW_1_RIGHT', 0]), api('Light.setReadingLightSwitch', ['ROW_1_RIGHT', 'OFF']), notify('빈 동승석의 열선·통풍·독서등 끄기를 요청했어요.'))) } }),
  },
  {
    id: 'charge-and-leave', name: '충전 후 출발 준비', icon: 'battery', category: '충전', tag: '내 목표 확인 → 출발 세팅 또는 충전소',
    description: '배터리가 내가 정한 목표 이상이면 공조와 운전석 통풍을 함께 맞춰요. 부족하면 충전소를 열어요.',
    tip: '목표 충전량 70%, 온도 23°C, 풍량 2, 통풍 1을 내 취향으로 바꾸세요. P단에서 직접 실행해요.',
    workspace: state(start(parked(chain(assign('출발 목표', number(70)), branch(node('logic_compare', { OP: 'GTE' }, { A: signal('battery'), B: variable('출발 목표') }), chain(api('HVAC.setHvacPower', ['ROW_1_LEFT', true]), node('vehicle_climate', {}, { VALUE: number(23) }), node('vehicle_fan', {}, { VALUE: number(2) }), api('Seat.setHvacSeatVentilation', ['ROW_1_LEFT', 1]), speak('목표 충전량을 넘었어요. 출발용 공조 설정을 요청했어요.')), chain(speak('아직 내 출발 목표보다 배터리가 부족해요. 충전소를 확인해 주세요.'), api('Navi.requestNavigationScreen', ['NearbyChargingStations', '']))))))),
  },
  {
    id: 'camp-reading', name: '차박 독서 자리', icon: 'spark', category: '캠핑', tag: 'P단 → 내 자리 조명 + 약한 바람',
    description: '앞자리 독서등은 끄고 뒷자리 한 곳만 켠 뒤, 바람을 약하게 맞춰요. 여러 메뉴를 한 번에 바꿔요.',
    tip: '독서등 위치와 풍량을 바꿔 나만의 자리를 만드세요. 차량 전원·유틸리티 모드는 직접 켜야 해요.',
    workspace: state(start(parked(chain(api('Light.setReadingLightSwitch', ['ROW_1_LEFT', 'OFF']), api('Light.setReadingLightSwitch', ['ROW_1_RIGHT', 'OFF']), api('Light.setReadingLightSwitch', ['ROW_2_RIGHT', 'ON']), api('HVAC.setHvacPower', ['ROW_1_LEFT', true]), node('vehicle_fan', {}, { VALUE: number(1) }), notify('독서용 조명과 약한 바람을 요청했어요.'))))),
  },
  {
    id: 'arrival-next', name: '도착 후 다음 일정', icon: 'battery', category: '장거리', tag: '도착 → 배터리에 따라 다음 할 일',
    description: '목적지에 도착했을 때 배터리가 부족하면 충전소를 열고, 여유가 있으면 내가 쓴 할 일을 읽어줘요.',
    tip: '기준 45%와 안내 문장을 바꿔 쓰세요. 앱 화면을 열고 감지를 시작한 동안만 동작해요.',
    workspace: state({ ...apiNode('Navi.events', true), next: { block: branch(compare(signal('battery'), 'LT', 45), chain(speak('다음 일정을 위해 충전부터 확인해 주세요.'), api('Navi.requestNavigationScreen', ['NearbyChargingStations', ''])), speak('도착했어요. 주차 위치를 기억하고, 예약 확인과 장비 수령을 먼저 해 주세요.')) } }),
  },
  {
    id: 'camp-packup', name: '캠핑 철수 브리핑', icon: 'activity', category: '캠핑', tag: '창문 4곳 + 적재함 + 배터리 → 한 번에 읽기',
    description: '열린 창문과 적재함, 부족한 배터리만 모아서 한 번에 읽어줘요. 마지막엔 내 장비 체크리스트를 붙여요.',
    tip: '기준 배터리 40%와 마지막 문장을 바꾸세요. 창문·적재함을 자동으로 움직이지 않아요.',
    workspace: state(start(parked(chain(assign('확인할 내용', text('철수 전 확인할 내용이에요. ')), checkWindow('ROW_1_LEFT', '운전석'), checkWindow('ROW_1_RIGHT', '동승석'), checkWindow('ROW_2_LEFT', '뒷좌석 왼쪽'), checkWindow('ROW_2_RIGHT', '뒷좌석 오른쪽'), branch(compare(read('Door.getCurrentDoorPosition', ['REAR']), 'GT', 0), addNotice('적재함 문이 열려 있어요. ')), branch(compare(signal('battery'), 'LT', 40), addNotice('배터리가 40% 미만이에요. 다음 충전을 확인해 주세요. ')), addNotice('충전 케이블, 테이블, 쓰레기 봉투를 챙겼는지도 확인해 주세요.'), speak(variable('확인할 내용')))))),
  },
];
templates.push(...practicalTemplates);
