import { createServer as createViteServer } from 'vite';
import { createCommunityServer } from '../server/community.mjs';

const api = await createCommunityServer({ dataDir: process.env.COMMUNITY_DATA_DIR || undefined });
const vite = await createViteServer({ server: { host: '127.0.0.1' } });
try {
  await new Promise((resolve, reject) => { api.once('error', reject); api.listen(Number(process.env.COMMUNITY_PORT || 8787), '127.0.0.1', resolve); });
  await vite.listen(); vite.printUrls();
  console.log('Community API: http://127.0.0.1:' + (process.env.COMMUNITY_PORT || 8787));
} catch (e) { console.error(e.message); await vite.close(); api.close(); process.exitCode = 1; }
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await vite.close(); api.close(() => process.exit()); });
