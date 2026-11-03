import React, { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button } from './components/ui/button';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';

let state = { view: 'editor', running: false, count: 1, connected: !!window.AndroidBridge };
const listeners = new Set();
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function updateChrome(patch) { state = { ...state, ...patch }; listeners.forEach(fn => fn()); }
const useChrome = () => useSyncExternalStore(subscribe, () => state);
let drawIcon;
function Icon({ name }) { return <span className="inline-flex size-[18px] shrink-0 items-center justify-center" aria-hidden="true" dangerouslySetInnerHTML={{ __html: drawIcon(name) }} />; }
function Header() {
  const current = useChrome();
  return <>
    <a className="brand" href="#" aria-label="Pleos Routines 홈"><span className="brand-symbol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 5h8a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h9"/><circle cx="6" cy="5" r="2" fill="currentColor"/><circle cx="18" cy="19" r="2" fill="currentColor"/></svg></span><span>Routines<span className="brand-sub">for Pleos</span></span></a>
    <Tabs value={current.view} onValueChange={view => document.dispatchEvent(new CustomEvent('pleos:navigate', { detail: view }))}>
      <TabsList aria-label="앱 화면">
        <TabsTrigger id="editorTab" aria-controls="editorView" value="editor">편집기</TabsTrigger>
        <TabsTrigger id="libraryTab" aria-controls="libraryView" value="library" disabled={current.running}>내 루틴 <span id="routineCount" className="count">{current.count}</span></TabsTrigger>
        <TabsTrigger id="communityTab" aria-controls="communityView" value="community" disabled={current.running}>커뮤니티</TabsTrigger>
      </TabsList>
    </Tabs>
    <div className="header-end"><Button id="helpButton" variant="ghost" size="icon" aria-label="사용 방법"><Icon name="help" /></Button></div>
  </>;
}
function Toolbar() {
  const { running, connected } = useChrome();
  return <>
    <div className="project-title"><div><label className="sr-only" htmlFor="routineName">루틴 이름</label><input id="routineName" maxLength={80} defaultValue="쾌적한 출발" disabled={running} /><div id="saveStatus" className="save-status" role="status">모든 변경 사항 저장됨</div></div></div>
    <div className="project-actions">
      <Button id="shareButton" variant="ghost" size="sm" disabled={running} aria-label="루틴 가져오기 · 내보내기"><Icon name="share" /><span className="file-label">파일</span></Button>
      <span className="divider" />
      <Button id="stopButton" className={running ? '' : 'hidden'} size="sm" disabled={!running}><Icon name="stop" />중지</Button>
      <Button id="runButton" className={running ? 'hidden' : ''} size="sm" disabled={running || !connected}><Icon name="play" />{connected ? '실행' : '차량에서 실행'}</Button>
    </div>
  </>;
}
export function mountChrome(icon) {
  drawIcon = icon;
  const header = createRoot(document.getElementById('chromeHeader'));
  const toolbar = createRoot(document.getElementById('chromeToolbar'));
  flushSync(() => { header.render(<Header />); toolbar.render(<Toolbar />); });
}
