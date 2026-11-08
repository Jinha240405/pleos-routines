import { operationMap } from './api.js';

const input = (node, key) => node?.inputs?.[key]?.block ?? node?.inputs?.[key]?.shadow;
const signals = {temperature:'실내 온도', battery:'배터리 잔량', door:'운전석 문', speed:'주행 속도'};
const operators = {GT:'초과', GTE:'이상', LT:'미만', LTE:'이하', EQ:'같음', NEQ:'다름'};
const controls = new Set(['flow_if','flow_repeat','flow_while']);
const short = value => String(value).length > 56 ? String(value).slice(0, 55) + '…' : String(value);

// Describes the saved graph without evaluating it or contacting the vehicle.
export function presentRoutine(workspace) {
  const nodes = [], sources = new Map();
  function visit(node) {
    if (!node) return;
    if (!node.disabled && node.enabled !== false) {
      nodes.push(node); if (node.id) sources.set(node.id, node);
      for (const key of ['THEN','ELSE','DO']) visit(input(node, key));
    }
    visit(node.next?.block);
  }
  const roots = (workspace?.blocks?.blocks || []).filter(n => !n.disabled && n.enabled !== false);
  roots.forEach(visit);
  function value(node, depth = 0) {
    if (!node || depth > 6) return '설정한 값';
    const f = node.fields || {};
    if (node.type === 'vehicle_signal') return signals[f.SIGNAL] || '차량 상태';
    if (node.type === 'value_number') return String(f.VALUE);
    if (node.type === 'value_text') return short(f.VALUE || '안내 문장');
    if (node.type === 'value_boolean') return f.VALUE === 'TRUE' ? '해당함' : '해당 없음';
    if (node.type === 'variable_get') return f.NAME || '저장한 값';
    if (node.type === 'result_get') return (operationMap.get(sources.get(f.SOURCE)?.fields?.API)?.label || '앞에서 읽은 값');
    if (node.type === 'api_read') return operationMap.get(f.API)?.label || '차량 상태';
    if (node.type === 'logic_operation') return `${value(input(node,'A'),depth+1)} ${f.OP === 'OR' ? '또는' : '그리고'} ${value(input(node,'B'),depth+1)}`;
    if (node.type === 'logic_not') return `${value(input(node,'VALUE'),depth+1)}의 반대`;
    if (node.type === 'logic_compare') {
      const a = input(node,'A'), b = input(node,'B');
      const unit = a?.type === 'vehicle_signal' && b?.type === 'value_number' ? ({temperature:'°C',battery:'%',speed:'km/h'}[a.fields.SIGNAL] || '') : '';
      return `${value(a,depth+1)} ${value(b,depth+1)}${unit} ${operators[f.OP] || '조건 충족'}`;
    }
    return '설정한 값';
  }
  function describe(node) {
    const f = node.fields || {};
    if (node.type === 'vehicle_climate') return `공조 ${value(input(node,'VALUE'))}°C 설정`;
    if (node.type === 'vehicle_fan') return `풍량 ${value(input(node,'VALUE'))}단계 설정`;
    if (node.type === 'action_notify') return '알림 표시';
    if (node.type === 'action_speak') return '안내 읽어주기';
    if (node.type === 'api_call') return operationMap.get(f.API)?.label || '차량 기능';
    if (node.type === 'flow_wait') return `${value(input(node,'SECONDS'))}초 대기`;
    if (node.type === 'flow_repeat') return `${value(input(node,'TIMES'))}회 반복`;
    if (node.type === 'flow_while') return '조건에 맞는 동안 반복';
    if (node.type === 'flow_stop') return '실행 마치기';
    if (node.type === 'variable_set') return `${f.NAME || '값'} 저장`;
    return '동작';
  }
  const hasEvents = roots.some(n => ['routine_event','routine_api_event'].includes(n.type));
  const hasManual = roots.some(n => n.type === 'routine_start');
  const starts = roots.map(n => n.type === 'routine_start' ? '버튼을 누르면' : n.type === 'routine_event' ? `${signals[n.fields?.EVENT] || '차량 상태'}가 바뀌면` : n.type === 'routine_api_event' ? `${operationMap.get(n.fields?.API)?.label || '선택한 상태'}가 바뀌면` : '설정한 순서대로');
  const steps = nodes.filter(n => !n.type.startsWith('routine_'));
  const actions = steps.filter(n => !controls.has(n.type));
  const condition = steps.find(n => n.type === 'flow_if');
  const actionLabels = [...new Set(actions.map(describe))];
  const conditionText = condition ? value(input(condition,'CONDITION')) : '';
  const when = conditionText ? conditionText.replace(/ (초과|이상|미만|이하|같음|다름)$/, (_,op)=>' '+({초과:'초과할 때',이상:'이상일 때',미만:'미만일 때',이하:'이하일 때',같음:'같을 때',다름:'다를 때'}[op])) : '';
  const parts = [starts[0] || '시작 방식을 선택하세요', when, actionLabels.slice(0,2).join(' · ')].filter(Boolean);
  return {hasEvents, hasManual, steps:steps.length, start:starts.join(' / '), condition:condition ? value(input(condition,'CONDITION')) : '추가 조건 없음', actions:actionLabels, summary:parts.join(' → ') + (actionLabels.length > 2 ? ` 외 ${actionLabels.length-2}개 동작` : ''), trigger:hasEvents ? (hasManual ? '직접 실행 · 상태 감지' : '상태 감지') : '직접 실행'};
}
