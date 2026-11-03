import { defineConfig } from '@playwright/test';
import path from 'node:path';
export default defineConfig({
  testDir: './tests/ui', timeout: 30000, workers: 1,
  use: { channel: process.env.PLAYWRIGHT_CHANNEL || undefined, baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 960 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: false, env: { COMMUNITY_DATA_DIR: path.resolve('test-results/community-data') } },
});
