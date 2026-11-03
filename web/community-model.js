import { parseRoutine, exportRoutine, validateWorkspace } from './runtime.js';
import { operationMap } from './api.js';

export const communityCategories = ['충전', '캠핑', '장거리', '쾌적함', '출발', '도착', '기타'];
const signalApi = { temperature: 'HVAC.getHvacTemperatureCurrent', battery: 'EvBattery.getEvBatteryStateOfCharge', door: 'Door.getCurrentDoorPosition', speed: 'AAOS.speed' };
const eventApi = { temperature: 'HVAC.registerHvacTemperatureCurrent', battery: 'EvBattery.registerEvBatteryStateOfCharge', door: 'Door.registerDoorPosition', speed: 'AAOS.speedChanged' };
export function inspectRoutine(workspace) {
  const blocks = validateWorkspace(workspace), features = new Map();
  let events = false;
  function visit(block) {
    if (block.disabled || block.enabled === false) { if (block.next?.block) visit(block.next.block); return; }
    const f = block.fields || {};
    const id = f.API || (block.type === 'vehicle_signal' ? signalApi[f.SIGNAL] : block.type === 'routine_event' ? eventApi[f.EVENT] : { vehicle_climate: 'HVAC.setHvacTemperature', vehicle_fan: 'HVAC.setHvacFanSpeed', action_speak: 'TTS.speak' }[block.type]);
    const op = operationMap.get(id);
    if (op) features.set(id, { id, label: op.label, domain: op.domainLabel, kind: op.kind, permission: op.permission || null });
    if (['routine_event', 'routine_api_event'].includes(block.type)) events = true;
    for (const entry of Object.values(block.inputs || {})) { if (entry.block) visit(entry.block); if (entry.shadow) visit(entry.shadow); }
    if (block.next?.block) visit(block.next.block);
  }
  workspace.blocks.blocks.forEach(visit);
  return { blocks, features: [...features.values()], events };
}
function field(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label}: 1~${max}자로 입력해 주세요.`);
  return value.trim();
}
export function validatePost(input) {
  if (!input || typeof input !== 'object') throw new Error('업로드 내용을 확인해 주세요.');
  const routine = parseRoutine(typeof input.routine === 'string' ? input.routine : JSON.stringify(input.routine));
  if (!communityCategories.includes(input.category)) throw new Error('분류를 선택해 주세요.');
  const description = field(input.description, '설명', 1000);
  const author = field(input.author, '닉네임', 30);
  return { name: routine.name, description, author, category: input.category, routine: JSON.parse(exportRoutine(routine)), summary: inspectRoutine(routine.workspace) };
}
