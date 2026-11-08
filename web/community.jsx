import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Users, Upload, Download, ArrowUpRight, Search, X, BatteryCharging, Tent, Route, SlidersHorizontal, Trash2, RefreshCw, Check, ChevronRight } from 'lucide-react';
import { communityCategories, inspectRoutine, validatePost } from './community-model.js';
import { exportRoutine, parseRoutine } from './runtime.js';
import { presentRoutine } from './routine-presentation.js';
import './community.css';

const categoryIcon = category => ({ 충전: BatteryCharging, 캠핑: Tent, 장거리: Route }[category] || SlidersHorizontal);
function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="community-dialog" onCancel={event => { event.preventDefault(); onClose(); }} aria-label={title}>
    <div className="dialog-header"><h2>{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><X /></button></div>{children}
  </dialog>;
}
function FeatureSummary({ summary }) {
  return <div className="community-summary"><strong>이 루틴이 사용하는 기능</strong><div className="feature-chips">{summary.features.length ? summary.features.map(f => <span key={f.id}>{f.domain} · {f.label}{f.kind === 'write' ? ' 변경' : f.kind === 'subscribe' ? ' 감지' : ''}</span>) : <span>차량 기능 사용 없음</span>}</div><p>{summary.events ? '루틴을 ON으로 켜면 차량 앱을 사용하는 동안 상태 변화를 감지해 실행해요.' : '루틴을 ON으로 켠 뒤 실행 버튼을 누르면 동작해요.'} 차량별 지원 여부는 실제 연결 시 확인해야 해요.</p></div>;
}
function RecipeCard({ item, starter, onOpen }) {
  const Icon = categoryIcon(item.category);
  return <button className="community-card" onClick={onOpen}>
    <span className="community-card-top"><span className={'recipe-icon ' + (item.category === '캠핑' ? 'camp' : item.category === '충전' ? 'charge' : '')}><Icon /></span><span className="recipe-category">{item.category}</span><ArrowUpRight className="recipe-arrow" /></span>
    <h3>{item.name}</h3><p>{item.description}</p>
    <span className="community-card-bottom"><span>{starter ? 'Routines 제공' : item.author}</span><span>{starter ? '기본 템플릿' : <><Download size={15} /> {item.downloads}</>}</span></span>
  </button>;
}
export function mountCommunity(element, { request, getRoutines, install, toast, canInstall, showLibrary }) {
  function Community() {
    const [items, setItems] = useState([]), [category, setCategory] = useState(''), [query, setQuery] = useState(''), [search, setSearch] = useState('');
    const [sort, setSort] = useState('newest'), [mine, setMine] = useState(false), [page, setPage] = useState(1), [pages, setPages] = useState(0), [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0), [detail, setDetail] = useState(null), [draft, setDraft] = useState(null), [busy, setBusy] = useState(false), [dialogError, setDialogError] = useState('');
    const [author, setAuthor] = useState(''), [description, setDescription] = useState(''), [postCategory, setPostCategory] = useState('기타'), [reviewed, setReviewed] = useState(false);
    const [choices, setChoices] = useState(null);
    const generation = useRef(0);
    useEffect(() => { const timer = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [query]);
    useEffect(() => {
      let live = true; setLoading(true); setError('');
      const params = new URLSearchParams({ q: search, category, sort, page: String(page), ...(mine ? { mine: '1' } : {}) });
      request('posts?' + params).then(data => { if (live) { setItems(data.items); setTotal(data.total); setPages(data.pages); if (page > Math.max(1, data.pages)) setPage(Math.max(1, data.pages)); } }).catch(e => { if (live) { setError(e.message); setItems([]); } }).finally(() => { if (live) setLoading(false); });
      return () => { live = false; };
    }, [category, search, sort, mine, page, revision]);
    useEffect(() => {
      const refresh = () => setRevision(r => r + 1);
      const share = event => startUpload(event.detail);
      document.addEventListener('pleos:community-open', refresh);
      document.addEventListener('pleos:share-routine', share);
      return () => { document.removeEventListener('pleos:community-open', refresh); document.removeEventListener('pleos:share-routine', share); };
    }, []);
    function close() { if (busy) return; generation.current++; setDetail(null); setDraft(null); setChoices(null); setDialogError(''); }
    async function open(item) {
      const requestId = ++generation.current; setDialogError('');
      try { const data = await request('posts/' + item.id); if (requestId === generation.current && document.body.dataset.view === 'community') setDetail(data); } catch (e) { toast(e.message, true); }
    }
    async function download() {
      if (!canInstall()) { setDialogError('내 루틴은 최대 50개까지 저장할 수 있어요. 먼저 정리해 주세요.'); return; }
      setBusy(true); setDialogError('');
      try {
        const data = await request(`posts/${detail.id}/download`, { method: 'POST' });
        const routine = parseRoutine(JSON.stringify(data.routine));
        if (install(routine.name, routine.workspace) === false) throw new Error('저장에 실패했어요. 기기 저장 공간을 확인해 주세요.');
        setDetail(null); setRevision(r => r + 1); toast('내 루틴에 추가했어요. 설정을 확인하고 사용하세요.');
      } catch (e) { setDialogError(e.message); } finally { setBusy(false); }
    }
    function chooseRoutine(r) { setChoices(null); setDraft({ ...r, summary: inspectRoutine(r.workspace) }); setDescription(''); setPostCategory(r.category || '기타'); setReviewed(false); setDialogError(''); }
    function startUpload(id) {
      try { const routines=getRoutines(); const selected=id&&routines.find(r=>r.id===id); setDetail(null); setDraft(null); setDialogError(''); if(selected)chooseRoutine(selected); else setChoices(routines); }
      catch (e) { toast(e.message, true); }
    }
    async function upload(event) {
      event.preventDefault(); setBusy(true); setDialogError('');
      try {
        const payload = { author, description, category: postCategory, routine: JSON.parse(exportRoutine(draft)) };
        validatePost(payload);
        await request('posts', { method: 'POST', body: payload });
        setDraft(null); setMine(false); setCategory(''); setQuery(''); setSearch(''); setPage(1); setSort('newest'); setRevision(r => r + 1); toast('모두의 루틴에 올렸어요.');
      } catch (e) { setDialogError(e.message); } finally { setBusy(false); }
    }
    async function remove() {
      if (!confirm('공유한 루틴을 삭제할까요? 다른 사람이 이미 내려받은 사본은 유지돼요.')) return;
      setBusy(true); setDialogError('');
      try { await request(`posts/${detail.id}`, { method: 'DELETE' }); setDetail(null); setRevision(r => r + 1); toast('게시물을 삭제했어요.'); } catch (e) { setDialogError(e.message); } finally { setBusy(false); }
    }
    return <div className="community-page">
      <div className="community-heading"><div><span className="community-eyebrow"><Users size={17} /> 함께 만드는 자동차 생활</span><h1>모두의 루틴</h1><p>다른 운전자의 아이디어를 발견하고, 나만의 루틴을 나눠요.</p></div><button className="button primary community-upload" onClick={() => startUpload()}><Upload size={20} /> 내 루틴 올리기</button></div>
      <section aria-label="모두의 루틴 게시물"><div className="community-section-heading"><div><h2>운전자들이 나눈 루틴 <span className="community-total">{total}</span></h2><p>필요한 루틴을 가져와 내 차에 맞게 바꿔 쓰세요.</p></div><button className="text-button refresh-feed" aria-label="게시물 새로고침" onClick={() => setRevision(r => r + 1)}><RefreshCw size={18} /> 새로고침</button></div>
        <div className="community-search-row"><label className="community-search"><Search size={20} /><input aria-label="모두의 루틴 검색" placeholder="루틴 이름, 설명, 닉네임 검색" value={query} onChange={e => setQuery(e.target.value)} maxLength={100} /></label><select aria-label="루틴 정렬" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="newest">최신순</option><option value="downloads">다운로드순</option></select><button className="mine-filter" aria-pressed={mine} onClick={() => { setMine(!mine); setPage(1); }}>{mine && <Check size={16} />} 내가 올린 루틴</button></div>
        <div className="community-filters" role="group" aria-label="모두의 루틴 분류">{['', ...communityCategories].map(c => <button key={c} aria-pressed={c === category} onClick={() => { setCategory(c); setPage(1); }}>{c || '전체'}</button>)}</div>
        {loading ? <div className="community-empty" role="status">루틴을 불러오는 중이에요…</div> : error ? <div className="community-empty" role="alert"><Users /><h3>아직 서버와 연결되지 않았어요</h3><p>{error}</p><button className="button subtle" onClick={() => setRevision(r => r + 1)}>다시 연결</button></div> : items.length ? <div className="community-grid">{items.map(item => <RecipeCard key={item.id} item={item} onOpen={() => open(item)} />)}</div> : <div className="community-empty"><Users /><h3>{search || category || mine ? '조건에 맞는 루틴이 아직 없어요' : '첫 번째 루틴을 나눠 주세요'}</h3><p>공식 템플릿은 내 루틴에서, 운전자들의 아이디어는 이곳에서 만날 수 있어요.</p><button className="button subtle" onClick={() => startUpload()}>내 루틴 올리기 <ChevronRight size={18} /></button></div>}
        {pages > 1 && <div className="community-pagination"><button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>이전</button><span>{page} / {pages}</span><button disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>다음</button></div>}
      </section>
      <p className="community-local-note">닉네임은 사용자가 직접 정해요. 올린 글은 같은 서버를 사용하는 사람에게 보이며, 삭제 권한은 올린 기기에 저장돼요.</p>
      {choices && <Modal title="공유할 루틴 선택" onClose={close}>{choices.length ? <><p>모두의 루틴에 올릴 루틴을 선택해 주세요.</p><div className="publish-routine-list">{choices.map(r => <button key={r.id} onClick={() => chooseRoutine(r)}><strong>{r.name}</strong><span>{presentRoutine(r.workspace).summary}</span><ChevronRight /></button>)}</div></> : <div className="community-empty"><h3>아직 저장한 루틴이 없어요</h3><p>내 루틴에서 새로 만들거나 공식 템플릿을 추가해 주세요.</p><button className="button primary" onClick={() => { close(); showLibrary(); }}>내 루틴으로 가기</button></div>}<div className="dialog-actions"><button className="button subtle" onClick={close}>취소</button></div></Modal>}
      {detail && <Modal title={detail.name} onClose={close}><div className="detail-byline">{detail.category} · {detail.starter ? 'Routines 제공' : `${detail.author} · ${new Date(detail.createdAt).toLocaleDateString('ko-KR')}`}</div><p className="detail-description">{detail.description}</p>{detail.tip && <p className="recipe-tip">{detail.tip}</p>}<FeatureSummary summary={inspectRoutine(detail.routine.workspace)} /><p className="install-note">내려받으면 내 루틴에 사본이 저장돼요. 자동으로 실행되거나 상태 감지가 켜지지 않아요. 추가 후 모든 블록을 수정할 수 있어요.</p><details className="routine-source"><summary>포함된 설정과 원본 보기</summary><pre>{JSON.stringify(detail.routine, null, 2)}</pre></details>{dialogError && <p role="alert" className="error-text">{dialogError}</p>}<div className="dialog-actions">{detail.mine && <button className="text-button delete-post" disabled={busy} onClick={remove}><Trash2 size={18} /> 게시물 삭제</button>}<button className="button subtle" disabled={busy} onClick={close}>닫기</button><button className="button primary" disabled={busy} onClick={download}><Download size={19} /> {busy ? '처리 중…' : '내 루틴에 내려받기'}</button></div></Modal>}
      {draft && <Modal title="내 루틴 올리기" onClose={close}><form onSubmit={upload}><div className="upload-routine-name"><span>공유할 루틴</span><strong>{draft.name}</strong><button type="button" className="text-button" disabled={busy} onClick={() => startUpload()}>다른 루틴 선택</button></div><div className="publish-fields"><label>닉네임<input required value={author} maxLength={30} onChange={e => setAuthor(e.target.value)} placeholder="다른 운전자에게 보일 이름" /></label><label>분류<select aria-label="분류" value={postCategory} onChange={e => setPostCategory(e.target.value)}>{communityCategories.map(c => <option key={c}>{c}</option>)}</select></label></div><label className="publish-description">어떤 상황에서 유용한가요?<textarea required value={description} maxLength={1000} onChange={e => setDescription(e.target.value)} placeholder="언제 쓰는지, 어떤 값을 바꿔야 하는지 알려주세요." /></label><FeatureSummary summary={draft.summary} /><details className="routine-source"><summary>공유할 블록과 설정 확인</summary><pre>{exportRoutine(draft)}</pre></details><label className="publish-review"><input type="checkbox" required checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>블록에 들어 있는 주소·좌표·이름·안내 문장을 확인했고, 이 내용을 공유할게요.</span></label>{dialogError && <p role="alert" className="error-text">{dialogError}</p>}<div className="dialog-actions"><button type="button" className="button subtle" disabled={busy} onClick={close}>취소</button><button className="button primary" disabled={busy || !reviewed}><Upload size={18} /> {busy ? '올리는 중…' : '모두의 루틴에 올리기'}</button></div></form></Modal>}
    </div>;
  }
  createRoot(element).render(<Community />);
}
