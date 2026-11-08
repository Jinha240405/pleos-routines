import { parseRoutine } from './runtime.js';

function identity() {
  let token = localStorage.getItem('routines-community-key');
  if (!/^[a-f0-9]{64}$/.test(token || '')) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('routines-community-key', token);
  }
  return token;
}
export function createCommunityClient(nativeCall) {
  return async (path, { method = 'GET', body } = {}) => {
    const validate = data => {
      if (!data || typeof data !== 'object') throw new Error('모두의 루틴 서버 응답 형식을 확인해 주세요.');
      if (method === 'GET' && /^posts(?:\?|$)/.test(path) && (!Array.isArray(data.items) || !Number.isInteger(data.total) || !Number.isInteger(data.pages))) throw new Error('루틴 목록을 읽지 못했어요. 다시 연결해 주세요.');
      if (/^posts\//.test(path) && method !== 'DELETE' && !data.routine) throw new Error('루틴 내용을 읽지 못했어요. 다시 연결해 주세요.');
      if (data.routine) parseRoutine(JSON.stringify(data.routine));
      return data;
    };
    if (window.AndroidBridge) return validate(await nativeCall('community.request', { path, method, ...(body ? { body } : {}) }));
    let token;
    try { token = identity(); } catch { if (method !== 'GET') throw new Error('업로드·다운로드를 위해 이 사이트의 저장소를 허용해 주세요.'); }
    let response;
    try {
      response = await fetch('/api/community/' + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
    } catch { throw new Error('모두의 루틴 서버에 연결하지 못했어요. 서버가 켜져 있는지 확인하고 다시 시도해 주세요.'); }
    let data;
    try { data = await response.json(); } catch { throw new Error('모두의 루틴 서버 응답을 읽지 못했어요. 서버 주소를 확인해 주세요.'); }
    if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했어요.');
    return validate(data);
  };
}
