import './style.css';
import './flow.css';
import './api.css';
import '@fontsource-variable/asta-sans';
import './pleos-theme.css';
import './choice-cards.css';
import './conditions.css';
import { configureApi, callApi, watchApi, clearApiWatches, receiveApiEvent, literalArguments, operationMap, apiNode, setSample } from './api.js';
import { mountApiInspector } from './api-ui.jsx';
import { mountChrome, updateChrome } from './chrome.jsx';
import { createFlowEditor, countSteps } from './flow-editor.jsx';
import { RoutineRunner, parseRoutine, exportRoutine, validateWorkspace } from './runtime.js';
import { templates, blankWorkspace } from './templates.js';

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
  pause() { runner.cancel(); $('watchEvents').checked = false; },
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
const fresh = (name, workspace) => ({ id: uid(), name, workspace: clone(workspace), updatedAt: new Date().toISOString() });
let loadWarning;
let store;
try {
  const raw = native ? native.loadState() : localStorage.getItem('pleos-routines-v1');
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.routines) || !parsed.routines.length || parsed.routines.length > 50) throw new Error('저장 형식 오류');
    for (const r of parsed.routines) { if (typeof r.name !== 'string' || typeof r.id !== 'string') throw new Error('루틴 형식 오류'); validateWorkspace(r.workspace); }
    store = parsed;
  }
} catch { loadWarning = '저장된 루틴을 읽지 못했어요. 예제로 시작합니다. 기존 저장본은 다음 편집 전까지 유지돼요.'; }
if (!store) { const first = fresh(templates[0].name, templates[0].workspace); store = { version: 1, activeId: first.id, routines: [first] }; }
let active = store.routines.find(r => r.id === store.activeId) ?? store.routines[0];
let loading = false, saveTimer, mode = 'demo', logEntries = [], lastVariables = {}, eventTimer, templateCategory = '전체';
let watchGeneration=0;
let afterStopEvent=null;
const demo = { temperature: 28, battery: 72, door: false, speed: 0, climate: 24, fan: 0 };
const editor = createFlowEditor($('flowEditor'), () => {
  if($('watchEvents').checked)disarmEvents();
  updateEditorTools();
  $('saveStatus').textContent = '저장 중…'; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350);
}, message => toast(message, true));
function snapshot() { return editor.snapshot(); }
function updateEditorTools() {
  $('undoButton').disabled = !editor.canUndo || runner.running;
  $('redoButton').disabled = !editor.canRedo || runner.running;
}
function persist() {
  clearTimeout(saveTimer);
  active.workspace = snapshot(); active.updatedAt = new Date().toISOString(); store.activeId = active.id;
  const text = JSON.stringify(store);
  try {
    if (native) { if (!native.saveState(text)) throw new Error('기기 저장 공간을 확인해 주세요.'); }
    else localStorage.setItem('pleos-routines-v1', text);
    $('saveStatus').textContent = '모든 변경 사항 저장됨';
    return true;
  } catch { $('saveStatus').textContent = '저장 실패 · JSON으로 내보내 주세요'; toast('저장 공간이 부족하거나 저장이 차단됐어요. JSON으로 내보내 주세요.', true); return false; }
}
function loadRoutine(routine) {
  if (runner.running) runner.cancel();
  disarmEvents();
  clearTimeout(eventTimer); $('watchEvents').checked = false; loading = true;
  active = routine; store.activeId = routine.id;
  for(const sample of templates.find(t=>t.id===routine.templateId)?.samples||[])setSample(sample.id,sample.args,sample.value);
  editor.load(routine.workspace);
  $('routineName').value = routine.name;
  $('routineCount').textContent = store.routines.length;
  updateChrome({ count: store.routines.length });
  updateEditorTools(); loading = false;
  $('executionState').textContent = '실행 준비 완료';
}
function addRoutine(name, state, templateId) {
  if (store.routines.length >= 50) return toast('루틴은 최대 50개까지 저장할 수 있어요.', true);
  persist();
  const r = fresh(name, state); if(templateId)r.templateId=templateId;store.routines.push(r); loadRoutine(r); persist(); showEditor(); toast('새 루틴을 만들었어요. 자유롭게 바꿔보세요.');
}
function log(message, kind = 'info') {
  logEntries.unshift({ message, kind, at: new Date().toLocaleTimeString('ko-KR', { hour12: false }) });
  logEntries = logEntries.slice(0, 100); $('logCount').textContent = logEntries.length;
  $('logList').replaceChildren();
  for (const entry of logEntries) {
    const row = document.createElement('div'); row.className = `log-item ${entry.kind}`;
    row.append(document.createElement('i'));
    const content = document.createElement('div'); content.textContent = entry.message;
    const time = document.createElement('small'); time.textContent = entry.at;
    content.append(time); row.append(content); $('logList').append(row);
  }
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
function renderVehicle() {
  $('climateValue').innerHTML = mode === 'demo' ? `${demo.climate}<small>°C</small>` : '—';
  $('fanValue').innerHTML = mode === 'demo' ? `${demo.fan}<small>단계</small>` : '—';
  $('doorValue').textContent = mode === 'demo' ? (demo.door ? '열림' : '닫힘') : '미조회';
  $('temperatureOutput').textContent = `${demo.temperature}°C`;
  $('batteryOutput').textContent = `${demo.battery}%`;
  $('doorToggle').setAttribute('aria-checked', String(demo.door));
}
async function browserSay(text) {
  if (!('speechSynthesis' in window)) throw new Error('이 브라우저에서는 음성 출력을 지원하지 않아요.');
  await new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'ko-KR';
    utterance.onend = resolve;
    utterance.onerror = event => reject(new Error(`음성 출력 실패: ${event.error}`));
    speechSynthesis.speak(utterance);
  });
}
const adapter = {
  invoke:callApi,
  async read(signal) {
    if (!['temperature', 'battery', 'door', 'speed'].includes(signal)) throw new Error('지원하지 않는 차량 상태예요.');
    if (mode === 'demo') { log(`${blockSignalLabel(signal)}: ${demo[signal]} · 테스트 값`); return demo[signal]; }
    if(signal==='temperature')return callApi('HVAC.getHvacTemperatureCurrent',defaultArgs('HVAC.getHvacTemperatureCurrent'));
    if(signal==='battery')return callApi('EvBattery.getEvBatteryStateOfCharge',[]);
    if(signal==='speed')return callApi('AAOS.speed',[]);
    const result = await nativeCall('door');
    if (typeof result.open !== 'boolean') throw new Error('도어 상태 응답이 올바르지 않아요.');
    $('doorValue').textContent = result.open ? '열림' : '닫힘';
    log(`운전석 도어 ${result.open ? '열림' : '닫힘'} · Vehicle SDK 응답 ${result.raw}`, 'success');
    return result.open;
  },
  async set(action, value) {
    if(mode!=='demo'){
      const id=action==='climate'?'HVAC.setHvacTemperature':'HVAC.setHvacFanSpeed';const op=operationMap.get(id),args=defaultArgs(id);args[op.params.findIndex(p=>p.kind==='number')]=value;
      await callApi(id,args);$(action==='climate'?'climateValue':'fanValue').textContent=action==='climate'?`${value}°C`:`${value}단계`;return;
    }
    demo[action] = value; renderVehicle();
    log(action === 'climate' ? `설정 온도 → ${value}°C · 시뮬레이션` : `바람 세기 → ${value}단계 · 시뮬레이션`, 'success');
  },
  async notify(text) { log(text, 'success'); toast(text); },
  async say(text) { log(`음성 출력 요청: ${text}`); if (native) await nativeCall('speak', { text }); else await browserSay(text); log('음성 출력 완료', 'success'); },
  cancel() { window.speechSynthesis?.cancel(); if (native) nativeCall('cancel').catch(() => {}); },
};
function defaultArgs(id){return operationMap.get(id).params.map(p=>structuredClone(p.default));}
configureApi({call:nativeCall,vehicle:()=>mode==='vehicle',log});
mountApiInspector($('apiInspectorRoot'));
const runner = new RoutineRunner(adapter, {
  onBlock: id => editor.highlight(id),
  onVariables: renderVariables,
  stepDelay: 160,
});
function blockSignalLabel(s) { return { temperature: '실내 온도', battery: '배터리', door: '운전석 도어 열림', speed: '차량 속도' }[s]; }
function runningUI(value) {
  updateChrome({ running: value });
  $('runButton').disabled = value; $('stopButton').disabled = !value;
  editor.lock(value);
  for (const id of ['shareButton', 'demoMode', 'vehicleMode', 'routineName', 'undoButton', 'redoButton', 'libraryTab', 'probeButton', 'diagnosticsButton']) $(id).disabled = value;
  updateEditorTools();
}
async function run(event = 'manual') {
  if (runner.running) { if (event !== 'manual') log('실행 중에 들어온 이벤트는 건너뛰었어요.'); return; }
  persist(); const state = snapshot();
  editor.warn(null);
  runningUI(true); $('executionState').textContent = '루틴 실행 중';
  log(`${active.name} 시작 · ${mode === 'demo' ? '테스트 차량' : 'Pleos 연결'}${event !== 'manual' ? ' · 이벤트' : ''}`);
  try {
    const result = await runner.run(state, event);
    log(result.stopped ? '중지 블록에서 실행을 마쳤어요.' : '루틴 실행을 마쳤어요.', 'success');
    $('executionState').textContent = '실행 완료';
  } catch (error) {
    const stopped = error.message.includes('중지했어요');
    log(error.message, stopped ? 'info' : 'error');
    $('executionState').textContent = stopped ? '실행 중지됨' : '동작 설정을 확인해 주세요';
    if (error.blockId) editor.warn(error.blockId, error.message);
    if (!stopped) toast(error.message, true);
  } finally { adapter.cancel(); runningUI(false); editor.highlight(null); $('resultButton').hidden = false;
    const next=afterStopEvent;afterStopEvent=null;
    if(next)queueMicrotask(()=>{if(next.generation===watchGeneration&&$('watchEvents').checked&&!document.hidden)run(next.event)});
  }
}
function scheduleEvent(event) {
  if (mode !== 'demo' || !$('watchEvents').checked || document.hidden) return;
  clearTimeout(eventTimer);
  eventTimer = setTimeout(() => {
    if (!$('watchEvents').checked || mode !== 'demo') return;
    const matches = snapshot().blocks.blocks.some(b => b.type === 'routine_event' && b.fields?.EVENT === event);
    if (matches) run(event);
  }, 250);
}
function disarmEvents(){watchGeneration++;afterStopEvent=null;clearTimeout(eventTimer);if($('watchEvents'))$('watchEvents').checked=false;clearApiWatches();document.body.classList.remove('watching');}
async function armEvents(){
  const generation=++watchGeneration;await clearApiWatches();if(generation!==watchGeneration||!$('watchEvents').checked)return;
  const starts=snapshot().blocks.blocks.filter(b=>!b.disabled&&b.enabled!==false);
  try{
    for(const root of starts){
      if(generation!==watchGeneration||!$('watchEvents').checked)return;
      let id,args;
      if(root.type==='routine_api_event'){id=root.fields.API;args=literalArguments(root);}
      else if(root.type==='routine_event'&&mode==='vehicle'){id={door:'Door.registerDoorPosition',temperature:'HVAC.registerHvacTemperatureCurrent',battery:'EvBattery.registerEvBatteryStateOfCharge',speed:'AAOS.speedChanged'}[root.fields.EVENT];if(!id)continue;args=defaultArgs(id);}
      else continue;
      const token=`watch-${generation}-${root.id}`;let last,initialized=false,lastRun=0;
      const stateful=operationMap.get(id).source!=='connect'||id==='Location.changed';
      await watchApi(id,args,token,(value,error)=>{
        if(generation!==watchGeneration||!$('watchEvents').checked||document.hidden)return;
        if(error){log(error,'error');toast(error,true);disarmEvents();return;}
        const fingerprint=JSON.stringify(value);
        if(stateful&&!initialized){initialized=true;last=fingerprint;log(`${operationMap.get(id).label} 기준값 수신`);return;}
        if(stateful&&last===fingerprint)return;last=fingerprint;
        if(id==='Gleo.command'&&args[0]==='STOP_ROUTINE'&&runner.running){afterStopEvent={generation,event:{rootId:root.id,value}};runner.cancel();return;}
        if(Date.now()-lastRun<1200||runner.running)return;lastRun=Date.now();
        run(root.type==='routine_api_event'?{rootId:root.id,value}:root.fields.EVENT);
      });
    }
    if(generation===watchGeneration){log(mode==='demo'?'테스트 이벤트를 기다려요. 연결 및 테스트에서 이벤트 값을 보낼 수 있어요.':'상태 감지를 등록했어요. 첫 상태를 기준으로 이후 변화를 감지합니다.');document.body.classList.add('watching');}
  }catch(error){if(generation===watchGeneration){disarmEvents();log(error.message,'error');toast(error.message,true);}}
}
function setMode(next) {
  if (runner.running) return;
  if (next === 'vehicle' && !native) { $('modeNote').textContent = 'Pleos 연결은 Android APK에서 사용할 수 있어요. 브라우저에서는 테스트 차량을 사용해 주세요.'; return; }
  disarmEvents();mode = next; clearTimeout(eventTimer); $('watchEvents').checked = false; $('watchEvents').disabled = false;
  updateChrome({ mode });
  $('demoMode').classList.toggle('selected', next === 'demo'); $('vehicleMode').classList.toggle('selected', next === 'vehicle');
  $('stateControls').hidden = next !== 'demo'; $('nativeInfo').hidden = next === 'demo';
  $('previewTitle').textContent = next === 'demo' ? '테스트 설정과 기록' : '차량 연결과 기록';
  $('modeNote').textContent = next === 'demo' ? '가상 데이터로 실행합니다. 실제 차량은 바뀌지 않아요.' : '실제 SDK 응답을 표시합니다.';
  renderVehicle();
}
function showEditor() { updateChrome({ view: 'editor' }); $('libraryView').hidden = true; $('editorView').hidden = false; }
function showLibrary() {
  if (runner.running) return; persist();disarmEvents();clearTimeout(eventTimer); $('watchEvents').checked = false;
  updateChrome({ view: 'library' }); $('editorView').hidden = true; $('libraryView').hidden = false; renderLibrary();
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
  $('savedCount').textContent = `${store.routines.length}개의 루틴 · 이 기기에 저장됨`;
  $('savedRoutines').replaceChildren(); $('templateRoutines').replaceChildren();
  for (const r of store.routines) {
    const wrapper = document.createElement('div');
    const trigger = r.workspace.blocks.blocks.some(block => ['routine_event','routine_api_event'].includes(block.type)) ? '상태 변화 감지' : '직접 실행';
    wrapper.append(makeCard(r.name, '', 'activity', `${countSteps(r.workspace)}개 단계 · ${trigger}`, () => { loadRoutine(r); showEditor(); }));
    const actions = document.createElement('div'); actions.className = 'card-controls';
    const duplicate = document.createElement('button'); duplicate.textContent = '복제'; duplicate.onclick = () => addRoutine(`${r.name.slice(0, 72)} 사본`, r.workspace,r.templateId);
    const remove = document.createElement('button'); remove.textContent = '삭제';
    remove.onclick = () => {
      if (!confirm(`“${r.name}” 루틴을 삭제할까요? 내보낸 파일은 유지돼요.`)) return;
      store.routines = store.routines.filter(item => item.id !== r.id);
      if (!store.routines.length) store.routines.push(fresh('새로운 루틴', blankWorkspace()));
      if (active.id === r.id) loadRoutine(store.routines[0]);
      persist(); renderLibrary(); updateChrome({ count: store.routines.length });
    };
    actions.append(duplicate, remove); wrapper.append(actions); $('savedRoutines').append(wrapper);
  }
  $('templateFilters').replaceChildren();
  for(const category of ['전체','출발','쾌적함','충전','도착']){const button=document.createElement('button');button.type='button';button.textContent=category;button.setAttribute('aria-pressed',String(templateCategory===category));button.onclick=()=>{templateCategory=category;renderLibrary();[...$('templateFilters').children].find(b=>b.textContent===category)?.focus()};$('templateFilters').append(button);}
  for (const t of templates.filter(t=>templateCategory==='전체'||t.category===templateCategory)) $('templateRoutines').append(makeCard(t.name, t.description, t.icon, t.tag, () => addRoutine(t.name, t.workspace,t.id)));
}
$('routineName').oninput = event => { active.name = event.target.value.trim() || '이름 없는 루틴'; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); };
$('routineName').onblur = () => { $('routineName').value = active.name; };
$('runButton').onclick = () => run(); $('stopButton').onclick = () => runner.cancel();
$('demoMode').onclick = () => setMode('demo'); $('vehicleMode').onclick = () => setMode('vehicle');
for (const id of ['temperature', 'battery', 'speed']) $(id).oninput = event => { demo[id] = Number(event.target.value); renderVehicle(); scheduleEvent(id); };
$('doorToggle').onclick = () => { demo.door = !demo.door; renderVehicle(); scheduleEvent('door'); };
$('watchEvents').onchange = () => { if ($('watchEvents').checked) armEvents(); else disarmEvents(); };
$('probeButton').onclick = async () => {
  $('probeButton').disabled = true;
  try { await adapter.read('door'); } catch (e) { log(e.message, 'error'); toast(e.message, true); } finally { $('probeButton').disabled = false; }
};
$('diagnosticsButton').onclick = () => nativeCall('diagnostics').catch(e => toast(e.message, true));
$('libraryNew').onclick = () => addRoutine('새로운 루틴', blankWorkspace());
document.addEventListener('pleos:navigate', event => event.detail === 'library' ? showLibrary() : showEditor());
document.querySelector('.brand').onclick = event => { event.preventDefault(); showLibrary(); };
$('undoButton').onclick = () => editor.undo(false); $('redoButton').onclick = () => editor.undo(true);
$('testButton').onclick = $('resultButton').onclick = () => $('testDialog').showModal();
$('clearLogs').onclick = () => { logEntries = []; $('logList').replaceChildren(); $('logCount').textContent = '0'; };
function logTab(variables) { $('logsTab').classList.toggle('active', !variables); $('variablesTab').classList.toggle('active', variables); $('logList').hidden = variables; $('variablesList').hidden = !variables; }
$('logsTab').onclick = () => logTab(false); $('variablesTab').onclick = () => logTab(true);
$('helpButton').onclick = () => $('helpDialog').showModal();
document.querySelectorAll('.close-dialog').forEach(button => { button.onclick = () => button.closest('dialog').close(); });
$('shareButton').onclick = () => { persist(); $('routineJson').value = exportRoutine(active); $('importError').textContent = ''; $('shareDialog').showModal(); };
$('copyJson').onclick = async () => {
  try { if (native) native.copyText($('routineJson').value); else await navigator.clipboard.writeText($('routineJson').value); toast('루틴 JSON을 복사했어요.'); } catch { $('routineJson').select(); toast('복사할 내용을 선택했어요. Ctrl+C로 복사해 주세요.'); }
};
$('downloadJson').onclick = () => {
  if (native) { nativeCall('export', { text: exportRoutine(active), name: active.name }).catch(e => toast(e.message, true)); return; }
  const url = URL.createObjectURL(new Blob([exportRoutine(active)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${active.name.replace(/[<>:"/\\|?*]/g, '_')}.pleos.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('importJson').onclick = () => {
  try {
    const imported = parseRoutine($('routineJson').value);
    addRoutine(imported.name, imported.workspace); $('shareDialog').close();
  } catch (e) { $('importError').textContent = e.message; }
};
document.addEventListener('keydown', event => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || document.querySelector('dialog[open]')) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); editor.undo(event.shiftKey); }
  if (event.key === 'Escape') runner.cancel();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { runner.cancel(); disarmEvents(); clearTimeout(eventTimer); persist(); } });
window.addEventListener('beforeunload', () => { if (!loading) persist(); disarmEvents();runner.cancel(); });
loadRoutine(active); renderVehicle(); renderVariables({});
if (loadWarning) toast(loadWarning, true);
if (import.meta.env.DEV) window.__app = { editor, runner, snapshot, templates, addRoutine, setSample, get store() { return store; }, get demo() { return demo; }, get variables() { return lastVariables; } };
