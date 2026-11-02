// A data interpreter. Workspace files are never evaluated as JavaScript.
import { operation, validateArguments, propertyOf } from './api.js';
export const FORMAT = 'pleos-routines';
export const VERSION = 1;
export const BLOCK_TYPES = new Set([
  'routine_start', 'routine_event', 'flow_if', 'flow_repeat', 'flow_while', 'flow_wait', 'flow_stop',
  'value_number', 'value_text', 'value_boolean', 'value_join', 'value_math',
  'logic_compare', 'logic_operation', 'logic_not', 'variable_set', 'variable_get',
  'vehicle_signal', 'vehicle_climate', 'vehicle_fan', 'action_notify', 'action_speak',
  'api_call', 'api_read', 'routine_api_event', 'value_property', 'value_json', 'event_value',
]);
const STATEMENTS = new Set(['routine_start', 'routine_event', 'routine_api_event', 'api_call', 'flow_if', 'flow_repeat', 'flow_while', 'flow_wait', 'flow_stop', 'variable_set', 'vehicle_climate', 'vehicle_fan', 'action_notify', 'action_speak']);
const input = (block, name) => block.inputs?.[name]?.block ?? block.inputs?.[name]?.shadow;
const next = block => block.next?.block;
const roots = workspace => workspace.blocks?.blocks ?? [];
export class RoutineError extends Error {
  constructor(message, blockId) { super(message); this.name = 'RoutineError'; this.blockId = blockId; }
}
export function validateWorkspace(workspace) {
  if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace) || !workspace.blocks || !Array.isArray(workspace.blocks.blocks)) throw new RoutineError('올바른 블록 작업 공간이 아닙니다.');
  if (Object.keys(workspace).some(key => key !== 'blocks') || Object.keys(workspace.blocks).some(key => !['languageVersion', 'blocks'].includes(key))) throw new RoutineError('지원하지 않는 작업 공간 확장 데이터입니다.');
  let count = 0;
  const ids = new Set();
  const visit = (block, depth = 0) => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) throw new RoutineError('블록 데이터가 올바르지 않습니다.');
    if (++count > 500 || depth > 80) throw new RoutineError('블록은 500개, 연결 깊이는 80단계까지 사용할 수 있습니다.');
    if (!BLOCK_TYPES.has(block.type)) throw new RoutineError(`지원하지 않는 블록: ${String(block.type).slice(0, 80)}`, block.id);
    if (['api_call','api_read','routine_api_event'].includes(block.type)) {
      try { operation(block.fields?.API,block.type==='routine_api_event'?['subscribe']:block.type==='api_read'?['read','capability']:['read','write','capability']); } catch(e){throw new RoutineError(e.message,block.id);}
    }
    if (block.id) { if (typeof block.id !== 'string' || ids.has(block.id)) throw new RoutineError('블록 ID가 중복되었거나 올바르지 않습니다.'); ids.add(block.id); }
    if (block.fields && (typeof block.fields !== 'object' || Array.isArray(block.fields))) throw new RoutineError('잘못된 블록 입력입니다.', block.id);
    for (const value of Object.values(block.fields ?? {})) {
      if (!['string', 'number', 'boolean'].includes(typeof value) || String(value).length > 4000) throw new RoutineError('블록 입력 값이 너무 길거나 지원하지 않는 형식입니다.', block.id);
    }
    // Only our block schemas can be loaded; reject Blockly extension payloads.
    for (const key of Object.keys(block)) if (!['type', 'id', 'x', 'y', 'fields', 'inputs', 'next', 'disabled', 'enabled', 'collapsed', 'deletable', 'movable', 'editable', 'inline'].includes(key)) throw new RoutineError(`허용하지 않는 블록 속성: ${key}`, block.id);
    for (const entry of Object.values(block.inputs ?? {})) {
      if (!entry || typeof entry !== 'object') throw new RoutineError('잘못된 연결입니다.', block.id);
      if (entry.block) visit(entry.block, depth + 1);
      if (entry.shadow) visit(entry.shadow, depth + 1);
    }
    if (next(block)) visit(next(block), depth + 1);
  };
  for (const block of roots(workspace)) visit(block);
  return count;
}
export function parseRoutine(text) {
  if (typeof text !== 'string' || text.length > 500_000) throw new RoutineError('파일 크기는 500KB 이하여야 합니다.');
  let data;
  try { data = JSON.parse(text); } catch { throw new RoutineError('JSON 형식을 확인해 주세요.'); }
  if (data?.format !== FORMAT || data.version !== VERSION) throw new RoutineError('지원하는 Pleos Routines v1 파일이 아닙니다.');
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 80) throw new RoutineError('루틴 이름은 1~80자여야 합니다.');
  validateWorkspace(data.workspace);
  return { name: data.name.trim(), workspace: data.workspace };
}
export function exportRoutine(routine) {
  return JSON.stringify({ format: FORMAT, version: VERSION, name: routine.name, workspace: routine.workspace }, null, 2);
}
export class RoutineRunner {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.options = { maxSteps: 1000, maxDuration: 30000, maxIterations: 100, onBlock() {}, onLog() {}, onVariables() {}, ...options };
    this.running = false;
  }
  cancel() { this.controller?.abort(); this.adapter.cancel?.(); }
  check(block) {
    if (this.controller.signal.aborted) throw new RoutineError('실행을 중지했어요.', block?.id);
    if (Date.now() >= this.deadline) throw new RoutineError('최대 실행 시간(30초)을 초과했어요.', block?.id);
    if (++this.steps > this.options.maxSteps) throw new RoutineError('실행 단계 한도를 초과했어요.', block?.id);
  }
  async pause(ms, block) {
    this.check(block);
    if (ms > this.deadline - Date.now()) throw new RoutineError('대기 시간이 남은 실행 시간을 초과해요.', block?.id);
    await new Promise((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new RoutineError('실행을 중지했어요.', block?.id)); };
      const timer = setTimeout(() => { this.controller.signal.removeEventListener('abort', abort); resolve(); }, ms);
      this.controller.signal.addEventListener('abort', abort, { once: true });
    });
  }
  async external(operation, block) {
    this.check(block);
    const signal = this.controller.signal;
    return new Promise((resolve, reject) => {
      const finish = (fn, value) => { clearTimeout(timer); signal.removeEventListener('abort', abort); fn(value); };
      const abort = () => finish(reject, new RoutineError('실행을 중지했어요.', block?.id));
      const timer = setTimeout(() => finish(reject, new RoutineError('기기 응답 시간이 초과됐어요.', block?.id)), Math.min(12000, this.deadline - Date.now()));
      signal.addEventListener('abort', abort, { once: true });
      Promise.resolve().then(()=>{if(signal.aborted)throw new RoutineError('실행을 중지했어요.',block?.id);return operation();}).then(v => finish(resolve, v), e => finish(reject, new RoutineError(e.message, block?.id)));
    });
  }
  number(value, block) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new RoutineError('숫자 블록을 연결해 주세요.', block?.id);
    return value;
  }
  boolean(value, block) {
    if (typeof value !== 'boolean') throw new RoutineError('참/거짓 조건 블록을 연결해 주세요.', block?.id);
    return value;
  }
  async value(block) {
    if (!block) throw new RoutineError('비어 있는 입력에 블록을 연결해 주세요.', this.currentId);
    this.check(block);
    const f = block.fields ?? {};
    const val = name => this.value(input(block, name));
    switch (block.type) {
      case 'value_number': return this.number(Number(f.VALUE), block);
      case 'value_text': return String(f.VALUE ?? '');
      case 'value_boolean': return f.VALUE === 'TRUE';
      case 'variable_get': {
        const name = String(f.NAME ?? '').trim();
        if (!this.variables.has(name)) throw new RoutineError(`“${name}” 변수에 먼저 값을 넣어 주세요.`, block.id);
        return this.variables.get(name);
      }
      case 'vehicle_signal': return this.external(() => this.adapter.read(f.SIGNAL), block);
      case 'api_read': return propertyOf(await this.apiCall(block),String(f.PATH||''));
      case 'value_json': {try{return JSON.parse(String(f.VALUE));}catch{throw new RoutineError('구조화된 값의 JSON 형식을 확인해 주세요.',block.id);}}
      case 'event_value': if(this.eventValue===undefined)throw new RoutineError('감지 이벤트로 실행할 때 사용할 수 있어요.',block.id);return propertyOf(this.eventValue,String(f.PATH||''));
      case 'value_property': return propertyOf(await val('VALUE'),String(f.PATH||''));
      case 'value_join': return (String(await val('A')) + String(await val('B'))).slice(0, 4000);
      case 'value_math': {
        const a = this.number(await val('A'), block), b = this.number(await val('B'), block);
        const ops = { ADD: () => a + b, MINUS: () => a - b, MULTIPLY: () => a * b, DIVIDE: () => a / b, MOD: () => a % b };
        if (!ops[f.OP]) throw new RoutineError('지원하지 않는 연산입니다.', block.id);
        if (['DIVIDE', 'MOD'].includes(f.OP) && b === 0) throw new RoutineError('0으로 나눌 수 없어요.', block.id);
        return this.number(ops[f.OP](), block);
      }
      case 'logic_compare': {
        const a = await val('A'), b = await val('B');
        if (f.OP === 'EQ') return a === b;
        if (f.OP === 'NEQ') return a !== b;
        this.number(a, block); this.number(b, block);
        const ops = { LT: a < b, LTE: a <= b, GT: a > b, GTE: a >= b };
        if (!(f.OP in ops)) throw new RoutineError('지원하지 않는 비교입니다.', block.id);
        return ops[f.OP];
      }
      case 'logic_operation': {
        const a = this.boolean(await val('A'), block);
        if (f.OP === 'AND') return a && this.boolean(await val('B'), block);
        if (f.OP === 'OR') return a || this.boolean(await val('B'), block);
        throw new RoutineError('지원하지 않는 논리 연산입니다.', block.id);
      }
      case 'logic_not': return !this.boolean(await val('VALUE'), block);
      default: throw new RoutineError('값이 들어갈 자리에 동작 블록이 있어요.', block.id);
    }
  }
  async apiCall(block){
    const op=operation(block.fields.API);const args=[];
    for(let i=0;i<op.params.length;i++)args.push(await this.value(input(block,`ARG${i}`)));
    try{validateArguments(op,args);}catch(e){throw new RoutineError(e.message,block.id);}
    return this.external(()=>this.adapter.invoke(op.id,args),block);
  }
  async sequence(block) {
    while (block && !this.stopped) {
      this.check(block);
      if (block.disabled || block.enabled === false) { block = next(block); continue; }
      this.currentId = block.id;
      this.options.onBlock(block.id);
      if (!STATEMENTS.has(block.type)) throw new RoutineError('실행 줄에 값 블록이 연결됐어요.', block.id);
      // Yield each step so stop, highlight and native UI remain responsive.
      await this.pause(this.options.stepDelay ?? 80, block);
      const v = name => this.value(input(block, name));
      switch (block.type) {
        case 'routine_start': case 'routine_event': case 'routine_api_event': break;
        case 'api_call': {
          const value=propertyOf(await this.apiCall(block),String(block.fields?.PATH||''));
          const name=String(block.fields?.NAME||'').trim();
          if(name){if(name.length>50)throw new RoutineError('변수 이름은 50자 이하여야 해요.',block.id);this.variables.set(name,value);this.options.onVariables(Object.fromEntries(this.variables));}
          break;
        }
        case 'flow_if': await this.sequence(input(block, this.boolean(await v('CONDITION'), block) ? 'THEN' : 'ELSE')); break;
        case 'flow_repeat': {
          const count = this.number(await v('TIMES'), block);
          if (!Number.isInteger(count) || count < 0 || count > this.options.maxIterations) throw new RoutineError('반복 횟수는 0~100 사이의 정수로 입력해 주세요.', block.id);
          for (let i = 0; i < count && !this.stopped; i++) { this.check(block); await this.sequence(input(block, 'DO')); }
          break;
        }
        case 'flow_while': {
          let count = 0;
          while (!this.stopped && this.boolean(await v('CONDITION'), block)) {
            if (++count > this.options.maxIterations) throw new RoutineError('조건 반복이 100회를 초과했어요.', block.id);
            await this.pause(0, block); await this.sequence(input(block, 'DO'));
          }
          break;
        }
        case 'flow_wait': {
          const seconds = this.number(await v('SECONDS'), block);
          if (seconds < 0 || seconds > 30) throw new RoutineError('대기는 0~30초로 설정해 주세요.', block.id);
          await this.pause(seconds * 1000, block); break;
        }
        case 'flow_stop': this.stopped = true; break;
        case 'variable_set': {
          const name = String(block.fields?.NAME ?? '').trim();
          if (!name || name.length > 50) throw new RoutineError('변수 이름은 1~50자로 입력해 주세요.', block.id);
          this.variables.set(name, await v('VALUE'));
          this.options.onVariables(Object.fromEntries(this.variables)); break;
        }
        case 'vehicle_climate': case 'vehicle_fan': {
          const value = this.number(await v('VALUE'), block);
          const climate = block.type === 'vehicle_climate';
          if (climate ? value < 16 || value > 30 : !Number.isInteger(value) || value < 0 || value > 8) throw new RoutineError(climate ? '공조 온도는 16~30°C로 설정해 주세요.' : '바람 세기는 0~8 사이 정수예요.', block.id);
          await this.external(() => this.adapter.set(climate ? 'climate' : 'fan', value), block); break;
        }
        case 'action_notify': case 'action_speak': {
          const text = String(await v('TEXT')).slice(0, 4000);
          await this.external(() => block.type === 'action_speak' ? this.adapter.say(text) : this.adapter.notify(text), block); break;
        }
      }
      block = next(block);
    }
  }
  async run(workspace, event = 'manual') {
    if (this.running) throw new RoutineError('이미 실행 중인 루틴을 먼저 중지해 주세요.');
    validateWorkspace(workspace);
    const starts = roots(workspace).filter(b => !b.disabled && b.enabled !== false && (event === 'manual' ? b.type === 'routine_start' : typeof event==='object' ? b.type==='routine_api_event' && b.id===event.rootId : b.type === 'routine_event' && b.fields?.EVENT === event));
    if (!starts.length) throw new RoutineError(event === 'manual' ? '“실행 버튼을 눌렀을 때” 블록을 추가해 주세요.' : '이 이벤트에 연결된 시작 블록이 없어요.');
    this.running = true; this.stopped = false; this.steps = 0; this.variables = new Map();
    this.eventValue=typeof event==='object'?event.value:undefined;
    this.controller = new AbortController(); this.deadline = Date.now() + this.options.maxDuration;
    this.options.onVariables({});
    try {
      for (const start of starts) { await this.sequence(start); if (this.stopped) break; }
      return { variables: Object.fromEntries(this.variables), steps: this.steps, stopped: this.stopped };
    } finally { this.running = false; this.options.onBlock(null); }
  }
}
