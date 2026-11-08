import './style.css';
import './flow.css';
import './api.css';
import '@fontsource-variable/asta-sans';
import './pleos-theme.css';
import './choice-cards.css';
import './conditions.css';
import './experience.css';
import { configureApi, callApi, watchApi, unwatchApi, receiveApiEvent, operationMap } from './api.js';
import { ForegroundAutomation } from './foreground-automation.js';
import { mountCommunity } from './community.jsx';
import { createCommunityClient } from './community-client.js';
import { mountChrome, updateChrome } from './chrome.jsx';
import { createFlowEditor, countSteps } from './flow-editor.jsx';
import { RoutineRunner, parseRoutine, exportRoutine, validateWorkspace } from './runtime.js';
import { templates, blankWorkspace } from './templates.js';
import { presentRoutine } from './routine-presentation.js';
import { inspectRoutine } from './community-model.js';

await document.fonts.load('500 18px "Asta Sans Variable"');

const $ = id => document.getElementById(id);
const paths = {
  blocks: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  play: '<path d="m9 5 10 7-10 7z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 0 1 4.5.5c0 1.7-2.3 1.8-2.3 3.5M12 17h.01"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  undo: '<path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12"/>',
  redo: '<path d="m16 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  door: '<path d="M4 20V9l6-6h10v17zM7 10l5-4h5v6H7zM15 16h2"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',
  climate: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4m12 14-1-4 4-1M3 14l4 1-1 4m12-14-1 4 4 1"/>',
  battery: '<rect x="2" y="6" width="17" height="12" rx="2"/><path d="M22 10v4M6 10v4m4-4v4m4-4v4"/>',
  plug: '<path d="M8 2v5m8-5v5M5 7h14v4a7 7 0 0 1-14 0zM12 18v4"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  back: '<path d="m12 5-7 7 7 7M5 12h15"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.spark}</svg>`; }
mountChrome(icon);
document.querySelectorAll('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));
let toastTimer;
function toast(message, error = false) { $('toast').textContent = message; $('toast').classList.toggle('error', error); $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 6500 : 4200); }
const native = window.AndroidBridge;
const pending = new Map(); let requestId = 0;
window.PleosNative = {
  resolve(id, result) { const request = pending.get(id); if (!request) return; clearTimeout(request.timer); pending.delete(id); result.ok ? request.resolve(result.value) : request.reject(new Error(result.error)); },
  pause() { pauseAutomation(); },
  resume() { resumeAutomation(); },
  event(token,value,error){receiveApiEvent(token,value,error);},
};
function nativeCall(action, payload = {}) {
  if (!native) return Promise.reject(new Error('Pleos 연결은 Android 앱에서 사용할 수 있어요.'));
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('기기 응답 시간이 초과됐어요.')); }, 12000);
    pending.set(id, { resolve, reject, timer });
    try { native.request(JSON.stringify({ id, action, ...payload })); } catch (e) { clearTimeout(timer); pending.delete(id); reject(e); }
  });
}
const uid = () => globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clone = value => JSON.parse(JSON.stringify(value));
const fresh = (name, workspace) => ({ id: uid(), name, enabled: false, workspace: clone(workspace), updatedAt: new Date().toISOString() });
let loadWarning;
let store;
try {
  const raw = native ? native.loadState() : localStorage.getItem('pleos-routines-v1');
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.routines) || parsed.routines.length > 50) throw new Error('저장 형식 오류');
    for (const r of parsed.routines) { if (typeof r.name !== 'string' || typeof r.id !== 'string') throw new Error('루틴 형식 오류'); validateWorkspace(r.workspace); r.enabled = r.enabled === true; }
    store = parsed;
  }
} catch { loadWarning = '저장된 루틴을 읽지 못했어요. 기존 저장본은 새 루틴을 만들기 전까지 유지돼요.'; }
if (!store) store = { version: 1, activeId: null, routines: [] };
let active = store.routines.find(r => r.id === store.activeId) ?? store.routines[0] ?? null;
let loading = false, saveTimer, logEntries = [], lastVariables = {}, templateCategory = '전체';
let currentView = 'library', selectedTemplate = null;
const executionHistory = new Map();
const activationErrors = new Map();
const unsavedSettings = new Set();
let automations = null, currentExecution = null, afterStopTrigger = null, foreground = !document.hidden;
const editor = createFlowEditor($('flowEditor'), () => {
  if (loading) return;
  if (active?.enabled) {
    active.enabled = false; automations?.sync(store.routines);
    if (persist()) toast('루틴을 수정해 OFF로 바꿨어요. 내용을 확인한 뒤 다시 켜 주세요.');
    else {unsavedSettings.add(active.id);toast('지금은 OFF지만 변경 내용을 저장하지 못했어요. 저장 공간을 확인해 주세요.',true);}
  }
  updateEditorTools();
  $('saveStatus').textContent = '저장 중…'; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350);
}, message => toast(message, true));
function snapshot() { return editor.snapshot(); }
function updateEditorTools() {
  const running=!!currentExecution||runner.running;
  $('undoButton').disabled = !editor.canUndo || running;
  $('redoButton').disabled = !editor.canRedo || running;
  const info = presentRoutine(snapshot());
  $('routineSummary').textContent = info.summary;
  $('watchControl').hidden = !active;
  $('watchEvents').checked = !!active?.enabled;
  $('watchEvents').disabled = !active || (running && !active.enabled);
  $('watchEvents').setAttribute('aria-label', '루틴 사용 설정');
  $('enableHint').textContent = info.hasEvents ? 'ON이면 차량 앱을 사용하는 동안 감지해요' : 'ON으로 켠 뒤 실행 버튼을 누르세요';
  document.body.classList.toggle('watching', !!active?.enabled);
  const badge = $('monitorStatus');
  badge.textContent = active ? routineStatus(active) : 'OFF';
  badge.classList.toggle('is-live', !!active?.enabled && !!native && foreground);
  $('watchState').textContent = badge.textContent;
  $('runButton').disabled = running || !native || !active?.enabled || !info.hasManual || !foreground;
  updateChrome({canRun:!$('runButton').disabled});
  $('runButton').title = !active?.enabled ? '루틴을 ON으로 켜 주세요' : !info.hasManual ? '설정한 상태가 바뀌면 실행돼요' : '';
  $('publishRoutine').disabled = running || !active;
}
function persist() {
  clearTimeout(saveTimer);
  if (!active && !store.routines.length) return true;
  if (active) { active.workspace = snapshot(); active.updatedAt = new Date().toISOString(); }
  store.activeId = active?.id ?? null;
  return saveStore();
}
function saveStore() {
  const text = JSON.stringify(store);
  try {
    if (native) { if (!native.saveState(text)) throw new Error('기기 저장 공간을 확인해 주세요.'); }
    else localStorage.setItem('pleos-routines-v1', text);
    $('saveStatus').textContent = '저장됨 · 이 기기';
    unsavedSettings.clear();
    automations?.sync(store.routines);
    return true;
  } catch { $('saveStatus').textContent = '저장 실패 · JSON으로 내보내 주세요'; toast('저장 공간이 부족하거나 저장이 차단됐어요. JSON으로 내보내 주세요.', true); return false; }
}
function loadRoutine(routine) {
  if (runner.running) runner.cancel();
  if (active) executionHistory.set(active.id, {logs:logEntries, variables:lastVariables, status:$('executionState').textContent});
  loading = true;
  active = routine; store.activeId = routine?.id ?? null;
  editor.load(routine?.workspace ?? blankWorkspace());
  $('routineName').value = routine?.name ?? '';
  $('routineCount').textContent = store.routines.length;
  updateChrome({ count: store.routines.length, hasActive:!!active });
  const previous = routine && executionHistory.get(routine.id);
  logEntries = previous?.logs || []; renderLogs(); renderVariables(previous?.variables || {});
  $('executionState').textContent = previous?.status || '실행 준비 완료';
  $('resultButton').hidden = !logEntries.length;
  updateEditorTools(); loading = false;
}
function addRoutine(name, state, templateId) {
  if (runner.running) return false;
  if (store.routines.length >= 50) { toast('루틴은 최대 50개까지 저장할 수 있어요.', true); return false; }
  if (!persist()) return false;
  const previous = active;
  const r = fresh(name, state); if(templateId)r.templateId=templateId;store.routines.push(r); loadRoutine(r);
  if (!persist()) { store.routines.pop(); loadRoutine(previous); return false; }
  showEditor(); toast('새 루틴을 만들었어요. 자유롭게 바꿔보세요.'); return true;
}
function routineHistory(id) {
  if (!executionHistory.has(id)) executionHistory.set(id, {logs:[],variables:{},status:'실행 준비 완료'});
  return executionHistory.get(id);
}
function logFor(id, message, kind = 'info') {
  if (!id) return;
  const history = routineHistory(id);
  history.logs = [{message,kind,at:new Date().toLocaleTimeString('ko-KR',{hour12:false})},...history.logs].slice(0,100);
  if (active?.id === id) { logEntries = history.logs; renderLogs(); $('resultButton').hidden = false; }
}
function log(message, kind = 'info') {
  logFor(currentExecution?.routineId ?? active?.id, message, kind);
}
function renderLogs() {
  $('logCount').textContent = logEntries.length;
  $('logList').replaceChildren();
  for (const entry of logEntries) {
    const row = document.createElement('div'); row.className = `log-item ${entry.kind}`;
    row.append(document.createElement('i'));
    const content = document.createElement('div'); content.textContent = entry.message;
    const time = document.createElement('small'); time.textContent = entry.at;
    content.append(time); row.append(content); $('logList').append(row);
  }
  if (!logEntries.length) { const empty = document.createElement('p'); empty.className='empty-log'; empty.textContent='실행하면 기록이 여기에 표시됩니다.'; $('logList').append(empty); }
}
function renderVariables(vars) {
  lastVariables = vars; $('variablesList').replaceChildren();
  for (const [name, value] of Object.entries(vars)) {
    const row = document.createElement('div'); row.className = 'variable-row';
    const key = document.createElement('span'); key.textContent = name;
    const val = document.createElement('code'); val.textContent = typeof value==='object'?JSON.stringify(value):String(value);
    row.append(key, val); $('variablesList').append(row);
  }
  if (!Object.keys(vars).length) { const p = document.createElement('p'); p.className = 'empty-variables'; p.textContent = '실행 중 만들어진 변수가 여기에 표시돼요.'; $('variablesList').append(p); }
}
const adapter = {
  invoke:callApi,
  async read(signal) {
    if (!['temperature', 'battery', 'door', 'speed'].includes(signal)) throw new Error('지원하지 않는 차량 상태예요.');
    if(signal==='temperature')return callApi('HVAC.getHvacTemperatureCurrent',defaultArgs('HVAC.getHvacTemperatureCurrent'));
    if(signal==='battery')return callApi('EvBattery.getEvBatteryStateOfCharge',[]);
    if(signal==='speed')return callApi('AAOS.speed',[]);
    const result = await nativeCall('door');
    if (typeof result.open !== 'boolean') throw new Error('도어 상태 응답이 올바르지 않아요.');
    log(`운전석 도어 ${result.open ? '열림' : '닫힘'} · Vehicle SDK 응답 ${result.raw}`, 'success');
    return result.open;
  },
  async set(action, value) {
    const id=action==='climate'?'HVAC.setHvacTemperature':'HVAC.setHvacFanSpeed';
    const op=operationMap.get(id),args=defaultArgs(id);args[op.params.findIndex(p=>p.kind==='number')]=value;
    await callApi(id,args);
  },
  async notify(text) { log(text, 'success'); toast(text); },
  async say(text) { log(`음성 출력 요청: ${text}`); await nativeCall('speak', { text }); log('음성 출력 완료', 'success'); },
  cancel() { window.speechSynthesis?.cancel(); if (native) nativeCall('cancel').catch(() => {}); },
};
function defaultArgs(id){return operationMap.get(id).params.map(p=>structuredClone(p.default));}
configureApi({call:nativeCall,vehicle:()=>!!native,log});
const runner = new RoutineRunner(adapter, {
  onBlock: id => { if (currentExecution?.routineId === active?.id) editor.highlight(id); },
  onVariables: vars => {
    const id = currentExecution?.routineId;
    if (id) routineHistory(id).variables = vars;
    if (id === active?.id) renderVariables(vars);
  },
  stepDelay: 160,
});
function runningUI(value) {
  updateChrome({ running: value });
  $('stopButton').disabled = !value;
  $('globalExecution').hidden = !value;
  $('globalExecutionName').textContent = value ? `${currentExecution.name} 실행 중` : '';
  editor.lock(value);
  for (const id of ['shareButton', 'publishRoutine', 'backToLibrary', 'routineName', 'undoButton', 'redoButton', 'libraryTab', 'communityTab']) $(id).disabled = value;
  updateEditorTools();
  refreshRoutineStates();
}
async function run(event = 'manual') {
  if (!active) return;
  if (runner.running) return;
  if (!native) { toast('차량에서 실행해 주세요. 브라우저에서는 편집과 공유를 할 수 있어요.', true); return; }
  if (!active.enabled) { toast('루틴을 ON으로 켠 뒤 실행해 주세요.'); return; }
  if (!persist()) return;
  return executeRoutine(clone(active),event);
}
function executionStatus(id, status) {
  routineHistory(id).status = status;
  if (active?.id === id) $('executionState').textContent = status;
}
async function executeRoutine(routine, event) {
  if (!native || !foreground || document.hidden || runner.running || !store.routines.find(r=>r.id===routine.id)?.enabled) return;
  currentExecution = {routineId:routine.id,name:routine.name};
  if (active?.id === routine.id) editor.warn(null);
  runningUI(true); executionStatus(routine.id,'루틴 실행 중');
  log(`${routine.name} 시작 · Pleos 연결${event !== 'manual' ? ' · 이벤트' : ''}`);
  try {
    const result = await runner.run(routine.workspace, event);
    log(result.stopped ? '중지 블록에서 실행을 마쳤어요.' : '루틴 실행을 마쳤어요.', 'success');
    executionStatus(routine.id,'실행 완료');
  } catch (error) {
    const stopped = error.message.includes('중지했어요');
    log(error.message, stopped ? 'info' : 'error');
    executionStatus(routine.id,stopped ? '실행 중지됨' : '동작 설정을 확인해 주세요');
    if (error.blockId && active?.id === routine.id) editor.warn(error.blockId, error.message);
    if (!stopped) toast(error.message, true);
  } finally {
    adapter.cancel(); currentExecution=null; runningUI(false); editor.highlight(null);
    const next=afterStopTrigger;afterStopTrigger=null;
    if(next)queueMicrotask(()=>{if(next.isCurrent())void executeRoutine(next.routine,next.event);});
  }
}
function routineStatus(routine) {
  if (unsavedSettings.has(routine.id)) return 'OFF · 설정 저장 실패';
  if (activationErrors.has(routine.id)) return 'OFF · 감지 연결 실패';
  if (!routine.enabled) return 'OFF · 사용 안 함';
  if (currentExecution?.routineId===routine.id) return 'ON · 실행 중';
  if (!native) return 'ON · 차량 앱에서 사용';
  const events=presentRoutine(routine.workspace).hasEvents;
  if (!foreground || document.hidden) return events ? 'ON · 앱 복귀 후 감지' : 'ON · 앱 복귀 후 실행 가능';
  return ({connecting:'ON · 감지 연결 중…',watching:'ON · 상태 감지 중',error:'OFF · 감지 연결 실패'})[automations?.state(routine.id)] || (events?'ON · 감지 준비 중':'ON · 직접 실행 대기');
}
function refreshRoutineStates() {
  const busy=!!currentExecution||runner.running;
  $('savedCount').textContent=`${store.routines.length}개의 루틴 · ON ${store.routines.filter(r=>r.enabled).length}개`;
  for (const card of $('savedRoutines').querySelectorAll('[data-routine-id]')) {
    const routine=store.routines.find(r=>r.id===card.dataset.routineId); if(!routine)continue;
    card.classList.toggle('is-enabled',routine.enabled);
    const toggle=card.querySelector('.routine-toggle');
    toggle.setAttribute('aria-checked',String(routine.enabled)); toggle.querySelector('.toggle-label').textContent=routine.enabled?'ON':'OFF';
    toggle.disabled=busy&&!routine.enabled;
    const status=card.querySelector('.routine-saved-state');status.textContent=routineStatus(routine);
    const result=executionHistory.get(routine.id)?.status;
    card.querySelector('.routine-result').textContent=result&&result!=='실행 준비 완료'?result:'';
    const execute=card.querySelector('.card-run');if(execute)execute.disabled=!native||!routine.enabled||busy||!foreground;
  }
}
function setRoutineEnabled(id, enabled) {
  const routine=store.routines.find(r=>r.id===id);if(!routine)return false;
  if (enabled && runner.running) return false;
  if (active && !persist() && enabled) { updateEditorTools();return false; }
  const roots=routine.workspace.blocks.blocks.filter(b=>!b.disabled&&b.enabled!==false);
  if (enabled && (!roots.some(b=>['routine_start','routine_event','routine_api_event'].includes(b.type)) || !presentRoutine(routine.workspace).steps)) {
    toast('시작 조건과 동작을 추가한 뒤 켜 주세요.',true);updateEditorTools();return false;
  }
  activationErrors.delete(id);
  routine.enabled=enabled;
  if (!enabled) { automations?.stop(id); if(currentExecution?.routineId===id)runner.cancel(); }
  if (!saveStore()) {
    // A failed OFF still stops this session. An unpersisted ON must never start.
    routine.enabled=false;unsavedSettings.add(id);automations?.sync(store.routines);updateEditorTools();refreshRoutineStates();
    toast('지금은 OFF지만 사용 설정을 저장하지 못했어요. 저장 공간을 확인한 뒤 다시 저장해 주세요.',true);return false;
  }
  updateEditorTools();refreshRoutineStates();
  toast(enabled ? (native ? (presentRoutine(routine.workspace).hasEvents?'루틴을 켰어요. 차량 앱을 사용하는 동안 상태를 감지해요.':'루틴을 켰어요. 실행 버튼으로 시작하세요.') : 'ON 설정을 저장했어요. 실행과 감지는 차량 앱에서 사용할 수 있어요.') : '루틴을 껐어요. 실행과 감지를 멈춥니다.');
  return true;
}
function pauseAutomation() {
  foreground=false;afterStopTrigger=null;automations?.pause();runner.cancel();updateEditorTools();refreshRoutineStates();
}
function resumeAutomation() {
  foreground=!document.hidden;
  if (native && foreground) automations?.resume();
  updateEditorTools();refreshRoutineStates();
}
function setView(view, historyMode='push') {
  currentView=view; document.body.dataset.view=view;
  updateChrome({view, count:store.routines.length, hasActive:!!active});
  for (const name of ['editor','library','community']) $(name+'View').hidden = name !== view;
  document.title = view==='editor' ? `${active.name} — Pleos Routines` : `${view==='community'?'모두의 루틴':'내 루틴'} — Pleos Routines`;
  const hash = view==='editor' ? '#routine/'+encodeURIComponent(active.id) : view==='community' ? '#shared' : '#routines';
  if (historyMode && location.hash !== hash) history[historyMode==='replace'?'replaceState':'pushState'](null,'',hash);
  window.scrollTo(0,0);
}
function showEditor(historyMode='push') { if (!active) return showLibrary(historyMode); setView('editor',historyMode); updateEditorTools(); }
function showLibrary(historyMode='push') {
  if (runner.running || !persist()) return false;
  setView('library',historyMode); renderLibrary(); return true;
}
function makeCard(title, description, iconName, tag, onClick) {
  const card = document.createElement('button'); card.className = 'routine-card';
  const mark = document.createElement('span'); mark.className = 'card-icon'; mark.innerHTML = icon(iconName);
  const h = document.createElement('h3'); h.textContent = title;
  const p = document.createElement('p'); p.textContent = description;
  const detail = document.createElement('span'); detail.className = 'card-tag'; detail.textContent = tag;
  const arrow = document.createElement('span'); arrow.className = 'card-arrow'; arrow.innerHTML = icon('arrow');
  card.append(mark, h); if (description) card.append(p); card.append(detail, arrow); card.onclick = onClick; return card;
}
function renderLibrary() {
  $('savedRoutines').replaceChildren(); $('templateRoutines').replaceChildren();
  for (const r of store.routines) {
    const info = presentRoutine(r.workspace);
    const wrapper = document.createElement('article'); wrapper.className='saved-routine';wrapper.dataset.routineId=r.id;
    const open = () => { if(runner.running||!persist()) return false; loadRoutine(r); showEditor(); return true; };
    wrapper.append(makeCard(r.name, info.summary, 'activity', `${info.steps}개 단계 · ${info.trigger}`, open));
    const actions = document.createElement('div'); actions.className = 'routine-card-actions';
    const state=document.createElement('div');state.className='routine-card-state';
    const status = document.createElement('span'); status.className='routine-saved-state';status.setAttribute('role','status');
    const result=document.createElement('small');result.className='routine-result';state.append(status,result);actions.append(state);
    const toggle=document.createElement('button');toggle.className='routine-toggle';toggle.type='button';toggle.setAttribute('role','switch');toggle.setAttribute('aria-label',r.name+' 사용 설정');
    const track=document.createElement('span');track.className='toggle-track';track.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.className='toggle-label';toggle.append(track,label);toggle.onclick=()=>setRoutineEnabled(r.id,!r.enabled);actions.append(toggle);
    if (info.hasManual) {
      const execute=document.createElement('button'); execute.className='card-run'; execute.innerHTML=icon('play'); execute.append('실행'); execute.setAttribute('aria-label',r.name+' 실행');
      execute.title=native?'ON으로 켜고 이 루틴 실행':'차량 앱에서 실행할 수 있어요'; execute.onclick=()=>{if(open())run();}; actions.append(execute);
    }
    const more=document.createElement('details'); more.className='routine-more';
    const moreButton=document.createElement('summary'); moreButton.innerHTML=icon('more'); moreButton.setAttribute('aria-label',r.name+' 더 보기');
    const menu=document.createElement('div'); menu.className='routine-more-actions';
    const duplicate = document.createElement('button'); duplicate.textContent = '복제'; duplicate.onclick = () => addRoutine(`${r.name.slice(0, 72)} 사본`, r.workspace,r.templateId);
    const publish=document.createElement('button'); publish.textContent='공유하기'; publish.onclick=()=>publishRoutine(r.id);
    const remove = document.createElement('button'); remove.textContent = '삭제';
    remove.onclick = () => {
      if (runner.running) return;
      if (!confirm(`“${r.name}” 루틴을 삭제할까요? 내보낸 파일은 유지돼요.`)) return;
      if (!persist()) return;
      const previousRoutines=[...store.routines], previousActive=active;
      store.routines = store.routines.filter(item => item.id !== r.id);
      if (active?.id === r.id) loadRoutine(store.routines[0] || null);
      if (!saveStore()) { store.routines=previousRoutines; loadRoutine(previousActive); }
      renderLibrary(); updateChrome({ count: store.routines.length,hasActive:!!active });
    };
    menu.append(publish,duplicate,remove); more.append(moreButton,menu); actions.append(more); wrapper.append(actions); $('savedRoutines').append(wrapper);
  }
  if (!store.routines.length) {
    const empty=document.createElement('div'); empty.className='library-empty';
    const title=document.createElement('h3'); title.textContent='나만의 첫 루틴을 만들어 보세요';
    const text=document.createElement('p'); text.textContent='공식 템플릿을 골라 내 차에 맞게 바꾸거나, 빈 루틴부터 시작할 수 있어요.';
    const browse=document.createElement('button'); browse.className='button subtle'; browse.textContent='공식 템플릿 보기'; browse.onclick=()=>$('officialTemplates').scrollIntoView({behavior:'smooth',block:'start'});
    empty.append(title,text,browse); $('savedRoutines').append(empty);
  }
  $('templateFilters').replaceChildren();
  for(const category of ['전체','캠핑','장거리','충전','출발','쾌적함','도착']){const button=document.createElement('button');button.type='button';button.textContent=category;button.setAttribute('aria-pressed',String(templateCategory===category));button.onclick=()=>{templateCategory=category;renderLibrary();[...$('templateFilters').children].find(b=>b.textContent===category)?.focus()};$('templateFilters').append(button);}
  for (const t of templates.filter(t=>templateCategory==='전체'||t.category===templateCategory)) $('templateRoutines').append(makeCard(t.name, t.description, t.icon, t.tag, () => previewTemplate(t)));
  refreshRoutineStates();
}
function previewTemplate(template) {
  selectedTemplate=template;
  const info=presentRoutine(template.workspace), features=inspectRoutine(template.workspace).features;
  $('templateDialogTitle').textContent=template.name;
  $('templateDescription').textContent=template.description;
  $('templateOverview').replaceChildren();
  for (const [label,text] of [['시작',info.start],['조건',info.condition],['동작',info.actions.join(' · ') || '동작을 추가해 주세요']]) { const row=document.createElement('div'), dt=document.createElement('dt'), dd=document.createElement('dd');dt.textContent=label;dd.textContent=text;row.append(dt,dd);$('templateOverview').append(row); }
  $('templateTip').hidden=!template.tip; $('templateTip').textContent=template.tip || '';
  $('templateFeatures').replaceChildren();
  for(const feature of features){const chip=document.createElement('span');chip.textContent=feature.domain+' · '+feature.label;$('templateFeatures').append(chip);}
  $('useTemplate').disabled=store.routines.length>=50;
  $('templateDialog').showModal();
}
$('useTemplate').onclick=()=>{if(selectedTemplate&&addRoutine(selectedTemplate.name,selectedTemplate.workspace,selectedTemplate.id))$('templateDialog').close();};
$('routineName').oninput = event => { if(!active)return; active.name = event.target.value.trim() || '이름 없는 루틴'; document.title=active.name+' — Pleos Routines'; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); };
$('routineName').onblur = () => { $('routineName').value = active?.name || ''; };
$('runButton').onclick = () => run(); $('stopButton').onclick = () => runner.cancel();
$('globalStop').onclick = () => runner.cancel();
$('watchEvents').onchange = () => { if(active)setRoutineEnabled(active.id,$('watchEvents').checked); };
$('libraryNew').onclick = () => addRoutine('새로운 루틴', blankWorkspace());
$('backToLibrary').onclick=()=>showLibrary();
$('publishRoutine').onclick=()=>active&&publishRoutine(active.id);
function publishRoutine(id) { if(showCommunity())document.dispatchEvent(new CustomEvent('pleos:share-routine',{detail:id})); }
document.addEventListener('pleos:navigate', event => event.detail === 'community' ? showCommunity() : event.detail === 'library' ? showLibrary() : showEditor());
document.querySelector('.brand').onclick = event => { event.preventDefault(); showLibrary(); };
$('undoButton').onclick = () => editor.undo(false); $('redoButton').onclick = () => editor.undo(true);
$('resultButton').onclick = () => $('executionDialog').showModal();
$('clearLogs').onclick = () => { logEntries = [];if(active)routineHistory(active.id).logs=[];renderLogs(); };
function logTab(variables) { $('logsTab').classList.toggle('active', !variables); $('variablesTab').classList.toggle('active', variables); $('logList').hidden = variables; $('variablesList').hidden = !variables; }
$('logsTab').onclick = () => logTab(false); $('variablesTab').onclick = () => logTab(true);
$('helpButton').onclick = () => $('helpDialog').showModal();
document.querySelectorAll('.close-dialog').forEach(button => { button.onclick = () => button.closest('dialog').close(); });
function openTransfer(importOnly=false) {
  if (!persist()) return;
  $('routineJson').value=!importOnly&&active?exportRoutine(active):'';
  $('importError').textContent=''; $('routineFile').value=''; $('selectedRoutineFile').textContent=''; $('routineJsonAdvanced').open=false;
  $('downloadJson').disabled=!active; $('copyJson').disabled=!active&& !$('routineJson').value;
  $('shareDialog').showModal();
}
$('shareButton').onclick=()=>openTransfer(); $('libraryImport').onclick=()=>openTransfer(true);
function readImportText(text,name) {
  try { if(new Blob([text]).size>500000)throw new Error('루틴 파일은 500KB 이하로 선택해 주세요.');const routine=parseRoutine(text);$('routineJson').value=text;$('selectedRoutineFile').textContent=`${routine.name} · ${name}`;$('importError').textContent='';$('copyJson').disabled=false; }
  catch(error){$('routineJson').value='';$('selectedRoutineFile').textContent='';$('importError').textContent=error.message;}
}
$('routineFile').onchange=async()=>{
  const file=$('routineFile').files[0]; if(!file)return;
  if(file.size>500000){$('importError').textContent='루틴 파일은 500KB 이하로 선택해 주세요.';$('routineJson').value='';return;}
  try { readImportText(await file.text(),file.name); } catch(error) { $('importError').textContent=error.message; }
};
$('webImportFile').hidden=!!native; $('nativeImportFile').hidden=!native;
$('nativeImportFile').onclick=()=>nativeCall('import').catch(error=>{$('importError').textContent=error.message;});
window.addEventListener('pleos:import-file',event=>{if(!$('shareDialog').open)openTransfer(true);readImportText(event.detail.text,event.detail.name);});
$('copyJson').onclick = async () => {
  try { if (native) native.copyText($('routineJson').value); else await navigator.clipboard.writeText($('routineJson').value); toast('루틴 JSON을 복사했어요.'); } catch { $('routineJson').select(); toast('복사할 내용을 선택했어요. Ctrl+C로 복사해 주세요.'); }
};
$('downloadJson').onclick = () => {
  if(!active||!persist())return;
  if (native) { nativeCall('export', { text: exportRoutine(active), name: active.name }).catch(e => toast(e.message, true)); return; }
  const url = URL.createObjectURL(new Blob([exportRoutine(active)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${active.name.replace(/[<>:"/\\|?*]/g, '_')}.pleos.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('importJson').onclick = () => {
  try {
    const imported = parseRoutine($('routineJson').value);
    if(addRoutine(imported.name, imported.workspace)) $('shareDialog').close();
  } catch (e) { $('importError').textContent = e.message; }
};
document.addEventListener('keydown', event => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || document.querySelector('dialog[open]')) return;
  if (event.key === 'Escape') {
    const menu=document.querySelector('.routine-more[open]');
    if(menu){menu.open=false;menu.querySelector('summary').focus();return;}
  }
  if (currentView === 'editor' && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); editor.undo(event.shiftKey); }
  if (event.key === 'Escape') runner.cancel();
});
document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.routine-more[open]'))if(!menu.contains(event.target))menu.open=false;});
document.addEventListener('visibilitychange', () => { if(document.hidden){pauseAutomation();persist();}else resumeAutomation(); });
window.addEventListener('beforeunload', () => { pauseAutomation();if(!loading)persist(); });
automations = new ForegroundAutomation({
  subscribe:watchApi,unsubscribe:unwatchApi,
  onTrigger:trigger=>{
    if (runner.running) {
      if(trigger.interrupt){afterStopTrigger=trigger;runner.cancel();}
      else logFor(trigger.routine.id,'다른 실행이 진행 중이라 이번 상태 변경은 건너뛰었어요.');
      return;
    }
    return executeRoutine(trigger.routine,trigger.event);
  },
  onStop:id=>{if(currentExecution?.routineId===id)runner.cancel();},
  onState:(id,state)=>{
    if(state==='baseline'){logFor(id,'상태 감지 기준값 수신');return;}
    if(state==='watching')logFor(id,'상태 감지를 등록했어요. 첫 상태를 기준으로 이후 변화를 감지합니다.');
    updateEditorTools();refreshRoutineStates();
  },
  onError:(id,error)=>{
    const routine=store.routines.find(r=>r.id===id);if(routine)routine.enabled=false;
    activationErrors.set(id,error.message);logFor(id,error.message,'error');if(!saveStore())unsavedSettings.add(id);
    updateEditorTools();refreshRoutineStates();toast('감지를 연결하지 못해 루틴을 껐어요. '+error.message,true);
  },
});
loadRoutine(active);
$('connectionNote').classList.add('connection-note');
$('connectionNote').textContent = native ? '차량 앱 · 사용 기능의 권한을 확인해 주세요.' : '웹에서는 편집과 공유 · 실행은 차량 앱에서';
document.body.classList.toggle('vehicle-app',!!native);
if (native) { const button = document.createElement('button'); button.textContent = '차량 권한 확인'; button.className = 'text-button'; button.onclick = () => nativeCall('permissions').then(() => toast('권한을 확인했어요.')).catch(e => toast(e.message, true)); $('connectionNote').append(button); }
if (loadWarning) toast(loadWarning, true);
if (import.meta.env.DEV) window.__app = { editor, runner, snapshot, templates, addRoutine, setRoutineEnabled, automations, get store() { return store; }, get variables() { return lastVariables; } };

function showCommunity(historyMode='push') {
  if (runner.running || !persist()) return false;
  setView('community',historyMode);
  document.dispatchEvent(new Event('pleos:community-open'));
  return true;
}
mountCommunity($('communityRoot'), {
  request: createCommunityClient(nativeCall), toast,
  canInstall: () => store.routines.length < 50,
  getRoutines: () => { if(!persist())throw new Error('루틴을 먼저 저장해 주세요.');return store.routines.map(r=>({...clone(r),category:templates.find(t=>t.id===r.templateId)?.category || '기타'})); },
  showLibrary,
  install: addRoutine,
});
function restoreRoute(initial=false) {
  if(runner.running){setView(currentView,'push');return;}
  const match=location.hash.match(/^#routine\/(.+)$/); let routine;
  try{routine=match&&store.routines.find(r=>r.id===decodeURIComponent(match[1]));}catch{}
  if(routine){if(!persist())return;loadRoutine(routine);showEditor(initial?'replace':false);}
  else if(location.hash==='#shared')showCommunity(initial?'replace':false);
  else showLibrary(initial?'replace':false);
}
window.addEventListener('popstate',()=>restoreRoute());
restoreRoute(true);
automations.sync(store.routines);resumeAutomation();
