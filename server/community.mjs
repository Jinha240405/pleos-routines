import http from 'node:http';
import { readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validatePost } from '../web/community-model.js';

const project = fileURLToPath(new URL('../', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });
const publicPost = (post, owner) => ({ id: post.id, name: post.name, description: post.description, category: post.category, author: post.author, createdAt: post.createdAt, downloads: post.downloads, summary: post.summary, mine: !!owner && post.owner === owner });
const csp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; base-uri 'none'; frame-src 'none'; form-action 'none'";

export async function createCommunityServer({ dataDir = path.join(project, '.community-data'), staticDir = path.join(project, 'app/src/main/assets/editor'), allowedOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173'] } = {}) {
  await mkdir(dataDir, { recursive: true });
  const database = path.join(dataDir, 'posts.json');
  let posts = [];
  try {
    const saved = JSON.parse(await readFile(database, 'utf8'));
    if (saved.version !== 1 || !Array.isArray(saved.posts)) throw new Error('모두의 루틴 저장 파일 형식 오류');
    posts = saved.posts;
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
  let queue = Promise.resolve();
  const transact = operation => {
    const next = queue.then(async () => {
      const draft = structuredClone(posts), result = operation(draft);
      const temp = database + '.tmp';
      await writeFile(temp, JSON.stringify({ version: 1, posts: draft }), { mode: 0o600 });
      await rename(temp, database); posts = draft;
      return result;
    });
    queue = next.catch(() => {});
    return next;
  };
  const limits = new Map();
  function rateLimit(key, max) {
    const now = Date.now();
    for (const [k, v] of limits) if (now - v.time > 60_000) limits.delete(k);
    const current = limits.get(key) || { time: now, count: 0 };
    if (limits.size > 10_000 || ++current.count > max) throw fail(429, '요청이 많아요. 잠시 후 다시 시도해 주세요.');
    limits.set(key, current);
  }
  function ownerOf(request) {
    const token = (request.headers.authorization || '').replace(/^Bearer /, '');
    return /^[a-f0-9]{64}$/.test(token) ? digest(token) : null;
  }
  async function body(request) {
    if (!request.headers['content-type']?.startsWith('application/json')) throw fail(415, 'JSON 형식으로 보내 주세요.');
    let size = 0, chunks = [];
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 600_000) throw fail(413, '업로드는 600KB 이하여야 합니다.');
      chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail(400, 'JSON 형식을 확인해 주세요.'); }
  }
  const server = http.createServer(async (request, response) => {
    const json = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(value)); };
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/community/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') throw fail(405, '지원하지 않는 요청입니다.');
        const filename = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
        const file = path.resolve(staticDir, '.' + filename);
        if (!file.startsWith(path.resolve(staticDir) + path.sep)) throw fail(403, '접근할 수 없습니다.');
        let content;
        try { if (!(await stat(file)).isFile()) throw fail(404, '파일이 없습니다.'); content = await readFile(file); }
        catch (e) { if (e.code === 'ENOENT') throw fail(404, '먼저 npm run build를 실행해 주세요.'); throw e; }
        const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream';
        response.writeHead(200, { 'Content-Type': mime, 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff' }); response.end(request.method === 'HEAD' ? undefined : content); return;
      }
      const origin = request.headers.origin;
      if (origin && !allowedOrigins.includes(origin) && origin !== `http://${request.headers.host}` && origin !== `https://${request.headers.host}`) throw fail(403, '허용하지 않는 요청 출처입니다.');
      const owner = ownerOf(request);
      const endpoint = url.pathname.slice('/api/community/'.length);
      if (request.method === 'GET' && endpoint === 'health') return json(200, { ok: true, storage: 'persistent', version: 1 });
      if (request.method === 'GET' && endpoint === 'posts') {
        const query = (url.searchParams.get('q') || '').slice(0, 100).toLocaleLowerCase();
        const category = url.searchParams.get('category');
        const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page')) || 1));
        const filtered = posts.filter(p => (!category || p.category === category) && (!url.searchParams.has('mine') || (owner && p.owner === owner)) && `${p.name} ${p.description} ${p.author}`.toLocaleLowerCase().includes(query));
        filtered.sort(url.searchParams.get('sort') === 'downloads' ? (a, b) => b.downloads - a.downloads || b.createdAt.localeCompare(a.createdAt) : (a, b) => b.createdAt.localeCompare(a.createdAt));
        return json(200, { items: filtered.slice((page - 1) * 12, page * 12).map(p => publicPost(p, owner)), total: filtered.length, page, pages: Math.ceil(filtered.length / 12) });
      }
      const match = endpoint.match(/^posts\/([a-f0-9-]{36})(\/download)?$/);
      if (request.method === 'GET' && match && !match[2]) {
        const post = posts.find(p => p.id === match[1]);
        if (!post) throw fail(404, '삭제되었거나 찾을 수 없는 루틴이에요.');
        return json(200, { ...publicPost(post, owner), routine: post.routine });
      }
      if (!['POST', 'DELETE'].includes(request.method)) throw fail(404, '찾을 수 없는 주소입니다.');
      if (!owner) throw fail(401, '이 기기의 모두의 루틴 키가 필요해요. 저장소를 허용해 주세요.');
      rateLimit(`${request.socket.remoteAddress}:write`, 40);
      if (request.method === 'POST' && endpoint === 'posts') {
        rateLimit(`${owner}:publish`, 10);
        let input;
        try { input = validatePost(await body(request)); } catch (e) { throw e.status ? e : fail(400, e.message); }
        const result = await transact(draft => {
          if (draft.length >= 1000 || draft.filter(p => p.owner === owner).length >= 50) throw fail(409, '게시물 한도에 도달했어요. 기존 게시물을 정리해 주세요.');
          const post = { ...input, id: randomUUID(), owner, createdAt: new Date().toISOString(), downloads: 0 };
          draft.push(post); return publicPost(post, owner);
        });
        return json(201, result);
      }
      if (match && ((request.method === 'DELETE' && !match[2]) || (request.method === 'POST' && match[2]))) {
        const result = await transact(draft => {
          const index = draft.findIndex(p => p.id === match[1]), post = draft[index];
          if (!post) throw fail(404, '삭제되었거나 찾을 수 없는 루틴이에요.');
          if (request.method === 'DELETE') {
            if (post.owner !== owner) throw fail(403, '이 기기에서 올린 루틴만 삭제할 수 있어요.');
            draft.splice(index, 1); return { ok: true };
          }
          post.downloads++; return { routine: post.routine, downloads: post.downloads };
        });
        return json(200, result);
      }
      throw fail(404, '찾을 수 없는 주소입니다.');
    } catch (e) { if (!response.headersSent) json(e.status || 500, { error: e.status ? e.message : '저장 서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' }); else response.end(); }
  });
  server.requestTimeout = 15000;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createCommunityServer({ dataDir: process.env.COMMUNITY_DATA_DIR || undefined });
  const port = Number(process.env.COMMUNITY_PORT || 8787), host = process.env.COMMUNITY_HOST || '127.0.0.1';
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`Routines community: http://${host}:${port}`));
}
