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
    id: 'event', name: '문이 열리면 알려주기', icon: 'spark', tag: '이벤트 · 조건 · 알림', description: '테스트 도어 상태를 바꾸면 자동으로 확인해요.',
    workspace: state(node('routine_event', { EVENT: 'door' }, {}, node('flow_if', {}, { CONDITION: signal('door'), THEN: notify('문이 열렸어요. 내리기 전 소지품을 챙겨 주세요.'), ELSE: notify('문이 닫혔어요.') }))),
  },
];
export const blankWorkspace = () => state(start());
